// AiBuilderModal — modal de generación de bio con IA.
//
// Flujo:
//   1. Usuario describe en 1 frase qué hace + nicho.
//   2. Llamada a biooAiGenerate (Claude Sonnet con tool use).
//   3. Preview del resultado (profile + tema + bloques).
//   4. "Aplicar" → reemplaza el state actual con lo generado.
//
// El usuario puede regenerar (cuenta contra el rate-limit diario).

import { useState } from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Sparkles, X, Loader2, RefreshCw, Wand2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useEditor } from '../store';
import type { Block, Theme, Profile } from '../types';

const SPRING: Transition = { type: 'spring', stiffness: 320, damping: 30 };

interface GenerateResult {
  ok: boolean;
  usedToday: number;
  limit: number;
  profile: { titulo: string; subtitulo: string };
  theme: Pick<Theme, 'preset' | 'font' | 'shape' | 'fill'>;
  blocks: Block[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const NICHES: string[] = [
  'Barbería', 'Peluquería', 'Nails / Uñas', 'Estética', 'Spa',
  'Fitness / Coach', 'Restaurante', 'Cafetería', 'Tienda',
  'Artista', 'Música', 'Fotógrafo', 'Diseñador', 'Educación',
];

export default function AiBuilderModal({ open, onClose }: Props): JSX.Element {
  const { state, dispatch } = useEditor();
  const [prompt, setPrompt]   = useState('');
  const [niche, setNiche]     = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<GenerateResult | null>(null);

  function reset(): void {
    setResult(null);
    setError(null);
  }

  function close(): void {
    reset();
    setPrompt('');
    setNiche('');
    onClose();
  }

  async function ensureAuth(): Promise<boolean> {
    if (auth.currentUser) return true;
    // Esperamos un tick por si la sesión anónima recién se está creando.
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        resolve(!!u);
      });
      setTimeout(() => { unsub(); resolve(!!auth.currentUser); }, 1500);
    });
  }

  async function generate(): Promise<void> {
    setError(null);
    if (prompt.trim().length < 10) {
      setError('Describe en al menos 10 caracteres.');
      return;
    }
    const ok = await ensureAuth();
    if (!ok) {
      setError('Necesitas estar autenticado. Recarga la página.');
      return;
    }
    setBusy(true);
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'biooAiGenerate');
      const res = await fn({ prompt: prompt.trim(), niche: niche || null });
      setResult(res.data as GenerateResult);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      setError(err.message || 'No se pudo generar tu bio. Reintenta.');
    } finally {
      setBusy(false);
    }
  }

  function applyToState(): void {
    if (!result) return;
    // Aplicamos manteniendo username/avatar/cover existentes (no los pisamos).
    const newProfile: Profile = {
      ...state.profile,
      titulo: result.profile.titulo,
      subtitulo: result.profile.subtitulo,
    };
    const newTheme: Theme = {
      ...state.theme,
      preset: result.theme.preset,
      font: result.theme.font,
      shape: result.theme.shape,
      fill: result.theme.fill,
    };
    dispatch({ type: 'patchProfile', patch: newProfile });
    dispatch({ type: 'patchTheme', patch: newTheme });
    dispatch({ type: 'setBlocks', blocks: result.blocks });
    close();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-md"
          />
          <motion.div
            key="panel"
            role="dialog" aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={SPRING}
            className="fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-14px_44px_-12px_rgba(0,0,0,0.45)] sm:inset-0 sm:my-auto sm:h-fit sm:max-h-[92dvh] sm:rounded-3xl"
          >
            {/* Pildora + cerrar */}
            <div className="sticky top-0 z-10 flex items-center justify-center bg-white pt-3 pb-2">
              <span className="h-1.5 w-12 rounded-full bg-neutral-300" aria-hidden />
              <button
                type="button" onClick={close} aria-label="Cerrar"
                className="absolute right-4 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 pt-2 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#cef07c] via-[#92c83a] to-[#2c5a17] text-white shadow-lg">
                <Sparkles size={28} strokeWidth={2.4} />
              </span>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-[#15240b]">
                Arma tu bio con IA
              </h2>
              <p className="mt-1 text-sm leading-snug text-neutral-500">
                Describe en una frase qué hacés. Generamos profile, tema y bloques sensatos.
              </p>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 pt-6">
              {!result ? (
                /* ─── FORM ─── */
                <>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    ¿Qué nicho describe lo que hacés?
                  </label>
                  <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
                    {NICHES.map((n) => (
                      <button
                        key={n} type="button"
                        onClick={() => setNiche(niche === n ? '' : n)}
                        className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                          niche === n
                            ? 'bg-[#15240b] text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Describime en 1-2 frases (estilo bio de IG)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 280))}
                    placeholder="Ej: barbería en Viña del Mar, especialista en fade y diseños. IG @cortexvina. Atendemos lun-sab."
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-[15px] leading-relaxed text-neutral-900 placeholder-neutral-400 transition-colors focus:border-[#92c83a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#92c83a]/15"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
                    <span>Tip: incluye tu @IG y ciudad para que la IA traiga los handles correctos.</span>
                    <span>{prompt.length}/280</span>
                  </div>

                  {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void generate()}
                    disabled={busy || prompt.trim().length < 10}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#15240b] to-[#2c5a17] py-4 text-sm font-extrabold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {busy ? <><Loader2 size={18} className="animate-spin" /> Generando tu bio…</>
                          : <><Wand2 size={18} /> Generar con IA</>}
                  </button>
                  <p className="mt-3 text-center text-[11px] text-neutral-400">
                    Tu bio actual NO se pisa hasta que toques "Aplicar".
                  </p>
                </>
              ) : (
                /* ─── PREVIEW ─── */
                <>
                  <div className="mb-4 flex items-start gap-3 rounded-2xl bg-gradient-to-br from-[#92c83a]/10 to-transparent p-4 ring-1 ring-[#92c83a]/20">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#72a129]" />
                    <div className="text-sm">
                      <p className="font-bold text-[#15240b]">¡Tu bio está lista!</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {result.blocks.length} bloques · tema "{result.theme.preset}" · {result.usedToday}/{result.limit} usos hoy
                      </p>
                    </div>
                  </div>

                  {/* Mini-preview del result */}
                  <div className="space-y-3 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Profile</p>
                      <p className="mt-1 text-base font-bold text-neutral-900">{result.profile.titulo}</p>
                      <p className="text-sm text-neutral-500">{result.profile.subtitulo}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tema</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {[result.theme.preset, result.theme.font, result.theme.shape, result.theme.fill].map((t) => (
                          <span key={t} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Bloques ({result.blocks.length})
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {result.blocks.map((b, i) => (
                          <li key={i} className="flex items-baseline gap-2 text-xs">
                            <span className="font-mono text-[10px] text-neutral-400">{i + 1}.</span>
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-[#72a129] ring-1 ring-[#92c83a]/30">
                              {b.tipo}
                            </span>
                            <span className="truncate font-medium text-neutral-700">{b.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { reset(); void generate(); }}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-100 py-3 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      Regenerar
                    </button>
                    <button
                      type="button"
                      onClick={applyToState}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#92c83a] to-[#2c5a17] py-3 text-sm font-extrabold text-white shadow-lg active:scale-[0.98]"
                    >
                      <Sparkles size={15} /> Aplicar
                    </button>
                  </div>
                  <p className="mt-3 text-center text-[11px] text-neutral-400">
                    Se reemplazan profile, tema y bloques. Tu @username y avatar no se tocan.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
