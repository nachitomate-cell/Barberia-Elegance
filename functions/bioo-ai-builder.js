'use strict';

// functions/bioo-ai-builder.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO — AI Bio Builder
//
//  Callable público (auth requerida — para rate-limit) que toma un prompt
//  corto ("decime en una frase qué hacés") + nicho opcional y devuelve un
//  bio completo: profile + theme preset + 4-8 bloques sensatos.
//
//  Usa Claude Sonnet con TOOL USE estructurado — fuerza al modelo a
//  emitir JSON que pase nuestro schema. Sin parser de string. Sin "trust
//  the LLM". Falla cerrado.
//
//  Rate-limit: 5 generaciones por uid por día (limit en _aiBuilderUsage).
//
//  DEPLOY:
//    firebase deploy --only functions:biooAiGenerate
//
//  SECRET:
//    firebase functions:secrets:set ANTHROPIC_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');
const Anthropic              = require('@anthropic-ai/sdk');

const db = admin.firestore();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MODEL = 'claude-sonnet-4-6'; // Sonnet 4.6 — buena calidad, latencia baja
const MAX_TOKENS = 1500;
const DAILY_LIMIT = 5;             // por uid por día
const MAX_PROMPT = 280;            // chars (estilo tweet — fuerza brevedad)

/* ─────────── Diccionarios validados (mismos que el editor) ─────────── */

const THEMES = new Set([
  'lime', 'forest', 'snow', 'ocean', 'sunset', 'grape', 'rose', 'night',
]);
const FONTS = new Set([
  'system', 'poppins', 'montserrat', 'inter', 'nunito', 'oswald', 'bebas',
  'playfair', 'lora', 'caveat', 'pacifico',
]);
const SHAPES = new Set(['rounded', 'pill', 'sharp']);
const FILLS  = new Set(['solid', 'outline']);
const SOCIAL_NETS = new Set([
  'instagram', 'tiktok', 'facebook', 'youtube',
  'whatsapp', 'email', 'telefono', 'enlace',
]);
const BLOCK_TYPES_AI = new Set([
  // Subconjunto que la IA puede crear (excluye paywall/embed que necesitan
  // datos que el usuario debe meter a mano: secrets, video IDs, etc.).
  'enlace', 'whatsapp', 'instagram', 'tiktok', 'facebook', 'youtube',
  'email', 'telefono', 'texto', 'separador', 'social', 'newsletter', 'tip',
]);
const LAYOUT_SIZES = new Set(['full', 'half', 'large']);

/* ─────────── Tool schema que le pasamos a Claude ─────────── */

const TOOL = {
  name: 'generate_bio',
  description:
    'Genera una página completa de Link in Bio (bioo.cl) para el creador. ' +
    'Profile + theme + bloques (4 a 8). Debe ser cohesivo: theme + tono del label ' +
    'deben matchear el nicho. Usar emojis en los labels cuando ayude.',
  input_schema: {
    type: 'object',
    properties: {
      profile: {
        type: 'object',
        properties: {
          titulo:    { type: 'string', description: 'Nombre o handle del creador (≤ 40 chars).' },
          subtitulo: { type: 'string', description: 'Una frase corta de bio (≤ 90 chars). Sin hashtags.' },
        },
        required: ['titulo', 'subtitulo'],
      },
      theme: {
        type: 'object',
        properties: {
          preset: { type: 'string', enum: Array.from(THEMES) },
          font:   { type: 'string', enum: Array.from(FONTS) },
          shape:  { type: 'string', enum: Array.from(SHAPES) },
          fill:   { type: 'string', enum: Array.from(FILLS) },
        },
        required: ['preset', 'font', 'shape', 'fill'],
      },
      blocks: {
        type: 'array',
        minItems: 4, maxItems: 8,
        description:
          'Lista de bloques. Empezar con un bloque "social" que agrupe las redes ' +
          '(o un instagram si es el creador principal). Luego CTAs específicas. ' +
          'Si el nicho cierra ventas, incluir un bloque "whatsapp" con un mensaje ' +
          'pre-armado. Si tiene servicios, un bloque "enlace" a su reserva.',
        items: {
          type: 'object',
          properties: {
            tipo:      { type: 'string', enum: Array.from(BLOCK_TYPES_AI) },
            label:     { type: 'string', description: 'Texto visible del botón.' },
            url:       { type: 'string', description: 'URL completa (si tipo=enlace).' },
            usuario:   { type: 'string', description: 'Handle SIN @ (instagram/tiktok/facebook).' },
            prefijo:   { type: 'string', description: 'Código país sin + (default 56 para Chile).' },
            telefono:  { type: 'string', description: 'Número sin código país (whatsapp/telefono).' },
            mensaje:   { type: 'string', description: 'Mensaje pre-armado WhatsApp (opcional).' },
            email:     { type: 'string', description: 'Email destino (tipo email).' },
            texto:     { type: 'string', description: 'Texto del bloque (tipo texto).' },
            subtitulo: { type: 'string', description: 'Subtítulo (newsletter).' },
            btnText:   { type: 'string', description: 'Texto botón (newsletter, default "Suscribirme").' },
            amounts:   { type: 'array', items: { type: 'number' }, description: 'Sugerencias tip jar (ej. [1000, 3000, 5000]).' },
            currency:  { type: 'string', description: 'Moneda tip (CLP por default).' },
            socials: {
              type: 'array',
              description: 'Solo cuando tipo=social. Red + valor (handle o url).',
              items: {
                type: 'object',
                properties: {
                  red:   { type: 'string', enum: Array.from(SOCIAL_NETS) },
                  valor: { type: 'string' },
                },
                required: ['red', 'valor'],
              },
            },
            layoutSize: { type: 'string', enum: Array.from(LAYOUT_SIZES), description: 'Tamaño bento (default full).' },
            featured:   { type: 'boolean', description: 'Destacar el bloque con halo.' },
          },
          required: ['tipo', 'label'],
        },
      },
    },
    required: ['profile', 'theme', 'blocks'],
  },
};

/* ─────────── Prompts ─────────── */

const SYSTEM_PROMPT = `Sos diseñador experto de Link-in-Bio (bioo.cl). Generás bios completas para creadores chilenos.

Reglas inflexibles:
- Profile.titulo: usar el @ del creador o un alias corto (max 40 chars).
- Profile.subtitulo: 1 frase humana, sin hashtags, sin "✨", max 90 chars.
- Theme: elegí preset según el nicho:
  * Barbería/peluquería masculina → forest o night
  * Estética/nails/spa → rose o snow
  * Coach/educación/fitness → ocean o lime
  * Arte/música/creator → sunset o grape
  * Comercio retail → snow o lime
- Bloques (4-8, en este orden idealmente):
  1. Un bloque "social" con las redes (instagram + tiktok mínimo). Trae todos los handles que se infieran del prompt.
  2. CTA principal (reservar / contactar / comprar) — generalmente "whatsapp" con mensaje pre-armado relevante al nicho.
  3. Enlaces específicos (catálogo, web, link de pago, etc.).
  4. Si tiene sentido, un bloque "tip" para propinas (amounts: [1000, 3000, 5000], currency: "CLP").
- Labels: cortos, accionables, con UN emoji al inicio cuando aporta. NO uses "Mi" como prefijo ("Mi WhatsApp" → "WhatsApp directo").
- Para Chile: prefijo telefónico 56 por default, moneda CLP.
- NUNCA inventes URLs/handles que no estén en el prompt. Si el creador no dio un IG real, omití ese bloque.

Devolvés siempre tu output llamando la tool generate_bio. Jamás respondés con texto plano.`;

function buildUserPrompt(prompt, niche) {
  const nicheLine = niche ? `Nicho: ${niche}.` : '';
  return `${nicheLine}\nDescripción del creador (su voz):\n"${prompt}"\n\nGenerá la bio.`;
}

/* ─────────── Validación post-modelo ─────────── */

function sanitizeString(s, max) {
  return String(s == null ? '' : s).trim().slice(0, max);
}

function validateAndClean(raw) {
  // Profile
  const titulo    = sanitizeString(raw?.profile?.titulo, 40) || 'Mi bioo';
  const subtitulo = sanitizeString(raw?.profile?.subtitulo, 100);

  // Theme con fallbacks seguros si la IA devuelve algo inválido
  const t = raw?.theme || {};
  const theme = {
    preset: THEMES.has(t.preset) ? t.preset : 'lime',
    font:   FONTS.has(t.font)   ? t.font   : 'system',
    shape:  SHAPES.has(t.shape) ? t.shape  : 'rounded',
    fill:   FILLS.has(t.fill)   ? t.fill   : 'solid',
  };

  // Blocks: limpiamos uno por uno
  const blocksRaw = Array.isArray(raw?.blocks) ? raw.blocks : [];
  const blocks = blocksRaw
    .map((b, i) => {
      if (!b || !BLOCK_TYPES_AI.has(b.tipo)) return null;
      const block = {
        id: 'ai' + Date.now().toString(36) + i,
        tipo: b.tipo,
        label: sanitizeString(b.label, 60) || b.tipo,
        url: '',
        activo: true,
      };
      if (b.url) block.url = sanitizeString(b.url, 500);
      if (b.usuario) block.usuario = sanitizeString(b.usuario, 60).replace(/^@+/, '');
      if (b.prefijo) block.prefijo = sanitizeString(b.prefijo, 4).replace(/\D/g, '') || '56';
      if (b.telefono) block.telefono = sanitizeString(b.telefono, 20).replace(/\D/g, '');
      if (b.mensaje) block.mensaje = sanitizeString(b.mensaje, 220);
      if (b.email) block.email = sanitizeString(b.email, 120);
      if (b.texto) block.texto = sanitizeString(b.texto, 300);
      if (b.subtitulo) block.subtitulo = sanitizeString(b.subtitulo, 100);
      if (b.btnText) block.btnText = sanitizeString(b.btnText, 30);
      if (LAYOUT_SIZES.has(b.layoutSize)) block.layoutSize = b.layoutSize;
      if (b.featured) block.featured = true;
      // Tip
      if (b.tipo === 'tip') {
        const amounts = Array.isArray(b.amounts)
          ? b.amounts.map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 4)
          : [1000, 3000, 5000];
        block.amounts = amounts.length ? amounts : [1000, 3000, 5000];
        block.currency = sanitizeString(b.currency, 4) || 'CLP';
      }
      // Social
      if (b.tipo === 'social') {
        const socials = Array.isArray(b.socials)
          ? b.socials
              .filter((s) => s && SOCIAL_NETS.has(s.red) && s.valor)
              .map((s) => ({
                red: s.red,
                valor: sanitizeString(s.valor, 200).replace(/^@+/, ''),
              }))
              .slice(0, 8)
          : [];
        if (socials.length === 0) return null; // social vacío no sirve
        block.socials = socials;
      }
      return block;
    })
    .filter(Boolean)
    .slice(0, 8);

  if (blocks.length === 0) {
    throw new HttpsError('internal', 'La IA no devolvió bloques utilizables. Reintenta.');
  }

  return {
    profile: { titulo, subtitulo },
    theme,
    blocks,
  };
}

/* ─────────── Rate-limit ─────────── */

async function checkAndIncrementUsage(uid) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ref = db.collection('_aiBuilderUsage').doc(`${uid}_${today}`);
  const snap = await ref.get();
  const count = (snap.exists ? snap.data().count : 0) || 0;
  if (count >= DAILY_LIMIT) {
    throw new HttpsError(
      'resource-exhausted',
      `Alcanzaste el límite de ${DAILY_LIMIT} generaciones por día. Vuelve mañana.`,
    );
  }
  await ref.set({
    count: FieldValue.increment(1),
    uid,
    day: today,
    lastAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return count + 1;
}

/* ─────────── Callable ─────────── */

exports.biooAiGenerate = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60 },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión para usar IA.');
    const uid = req.auth.uid;

    const prompt = sanitizeString(req.data?.prompt, MAX_PROMPT);
    const niche  = sanitizeString(req.data?.niche, 40);
    if (prompt.length < 10) {
      throw new HttpsError('invalid-argument', 'Describe en al menos 10 caracteres qué hacés.');
    }

    // Rate limit primero (más barato que llamar a Claude y rechazar después)
    const usedToday = await checkAndIncrementUsage(uid);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let toolInput;
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        // tool_choice fuerza a Claude a llamar nuestra tool en vez de responder texto.
        tool_choice: { type: 'tool', name: 'generate_bio' },
        messages: [{ role: 'user', content: buildUserPrompt(prompt, niche) }],
      });
      // El último content block debería ser el tool_use con la respuesta.
      const toolBlock = (msg.content || []).find((c) => c.type === 'tool_use' && c.name === 'generate_bio');
      if (!toolBlock) {
        logger.error('[bioo:ai] respuesta sin tool_use:', JSON.stringify(msg.content).slice(0, 500));
        throw new HttpsError('internal', 'La IA no pudo generar tu bio. Reintenta.');
      }
      toolInput = toolBlock.input;
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('[bioo:ai] Anthropic error:', err.message);
      throw new HttpsError('internal', 'Error con la IA. Reintenta en 30 segundos.');
    }

    const result = validateAndClean(toolInput);
    logger.info(`[bioo:ai] uid=${uid} usedToday=${usedToday} blocks=${result.blocks.length} theme=${result.theme.preset}`);
    return { ok: true, usedToday, limit: DAILY_LIMIT, ...result };
  },
);
