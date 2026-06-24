import { useState } from 'react';
import { LineChart, Search, HelpCircle, Megaphone, Target, Eye, Globe } from 'lucide-react';
import { useEditor } from '../store';
import { Card, Field, inputBase } from '../ui';
import type { Marketing as MarketingT, Seo } from '../types';
import InfoModal, { InfoStep, InfoBlock } from '../components/InfoModal';

export default function Marketing(): JSX.Element {
  const { state, dispatch } = useEditor();
  const m = state.marketing;
  const seo = state.seo;
  const setM = (patch: Partial<MarketingT>): void => dispatch({ type: 'patchMarketing', patch });
  const setSeo = (patch: Partial<Seo>): void => dispatch({ type: 'patchSeo', patch });
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#92c83a]/40 bg-[#92c83a]/[0.06] px-4 py-3 text-left transition-colors hover:bg-[#92c83a]/[0.12]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#72a129] ring-1 ring-[#92c83a]/30">
          <HelpCircle size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#15240b]">¿Cómo funciona Marketing?</p>
          <p className="text-xs text-neutral-500">Píxeles, retargeting y SEO — paso a paso.</p>
        </span>
        <span className="shrink-0 text-xs font-bold text-[#72a129]">Ver guía</span>
      </button>

      {/* Píxeles */}
      <Card icon={LineChart} title="Píxeles de seguimiento" hint="Mide visitas y crea audiencias de retargeting en tus campañas.">
        <div className="space-y-5">
          <Field label="Google Analytics 4">
            <input className={`${inputBase} font-mono tracking-tight`} placeholder="G-XXXXXXXXXX" value={m.ga4} onChange={(e) => setM({ ga4: e.target.value.trim() })} />
          </Field>
          <Field label="Meta Pixel ID">
            <input className={`${inputBase} font-mono tracking-tight`} placeholder="1234567890123456" value={m.metaPixel} onChange={(e) => setM({ metaPixel: e.target.value.trim() })} />
          </Field>
          <Field label="TikTok Pixel ID">
            <input className={`${inputBase} font-mono tracking-tight`} placeholder="CXXXXXXXXXXXXXXXXX" value={m.tiktokPixel} onChange={(e) => setM({ tiktokPixel: e.target.value.trim() })} />
          </Field>
        </div>
      </Card>

      {/* SEO */}
      <Card icon={Search} title="SEO y metadatos" hint="Cómo se ve tu página en buscadores y al compartir el enlace.">
        <div className="space-y-5">
          <Field label="Título SEO">
            <input className={inputBase} placeholder={state.profile.titulo || `${state.username} · bioo`} value={seo.title} onChange={(e) => setSeo({ title: e.target.value })} />
          </Field>
          <Field label="Descripción SEO">
            <textarea
              className={`${inputBase} resize-none leading-relaxed`}
              rows={3}
              value={seo.description}
              placeholder={state.profile.subtitulo || 'Una frase que describa tu página para Google y redes.'}
              onChange={(e) => setSeo({ description: e.target.value })}
            />
            <span className="mt-2 block text-right text-[11px] text-neutral-300">{seo.description.length}/160</span>
          </Field>
        </div>
      </Card>

      <p className="px-1 text-center text-[11px] leading-relaxed text-neutral-400">
        Los píxeles se inyectan solo en tu página pública (bioo.cl/{state.username}) cuando guardas.
        Deja un campo vacío para desactivar ese píxel.
      </p>

      <MarketingHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} username={state.username} />
    </div>
  );
}

function MarketingHelpModal({ isOpen, onClose, username }: { isOpen: boolean; onClose: () => void; username: string }): JSX.Element {
  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      icon={Megaphone}
      title="Cómo funciona Marketing"
      kicker="Mide tus visitas, créceles audiencias y aparece en Google — todo desde tu bioo.cl."
    >
      <div className="space-y-5">
        <InfoBlock title="Qué hace este módulo">
          <p>
            <b>Marketing</b> conecta tu página <b>bioo.cl/{username}</b> con las plataformas que ya usas para anunciar (Meta, TikTok, Google) y con los buscadores. Esto te permite dos cosas:
          </p>
          <ul className="ml-4 list-disc space-y-1.5 text-sm text-neutral-600">
            <li><b>Medir</b> cuánta gente visita tu página y de dónde viene.</li>
            <li><b>Retargetear</b>: crear anuncios para personas que ya entraron a tu bioo (mucho más baratos y efectivos que un anuncio frío).</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Píxeles — el flujo en 4 pasos">
          <InfoStep n={1} title="Crea el píxel en la plataforma">
            En <b>Meta Ads Manager</b>, <b>TikTok Ads</b> o <b>Google Analytics</b>, crea un píxel/propiedad nueva. Cada uno te da un ID (ej. <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px]">G-XXXXXXXXXX</code> para GA4).
          </InfoStep>
          <InfoStep n={2} title="Pégalo en este panel">
            Copia el ID y pégalo en el campo correspondiente. <b>No necesitas tocar código</b>. Deja en blanco los que no uses.
          </InfoStep>
          <InfoStep n={3} title="Guarda tu bioo">
            Al pulsar <b>Guardar</b> arriba, bioo inyecta el píxel <i>solo</i> en tu página pública. Tu visor del editor no dispara eventos (para no ensuciar tus métricas).
          </InfoStep>
          <InfoStep n={4} title="Ya estás midiendo">
            Cualquier visita a bioo.cl/{username} aparecerá en tiempo real en Meta/TikTok/GA4. Ahí puedes crear audiencias ("gente que visitó mi bioo en los últimos 30 días") y lanzar anuncios dirigidos.
          </InfoStep>
        </InfoBlock>

        <InfoBlock title="Las 3 herramientas, una por una">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F9AB00]/10 text-[#F9AB00]"><LineChart size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Google Analytics 4 (GA4)</p>
              <p className="text-xs text-neutral-500">El <i>tablero</i>. Te muestra cuántas visitas, de qué país, qué links toca cada uno, tiempo en la página. Gratis. ID empieza con <code className="rounded bg-neutral-100 px-1 py-0.5 text-[11px]">G-</code>.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]"><Target size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Meta Pixel (Facebook + Instagram)</p>
              <p className="text-xs text-neutral-500">El <i>cazador</i>. Permite que Meta sepa quién entró a tu bioo desde IG/FB y crear <b>audiencias personalizadas</b> para retargeting. Indispensable si pautas en Instagram.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/10 text-black"><Target size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">TikTok Pixel</p>
              <p className="text-xs text-neutral-500">Igual que Meta pero para TikTok Ads. Si llevas tráfico desde TikTok, este píxel te deja medir conversiones y armar audiencias <i>look-alike</i>.</p>
            </div>
          </div>
        </InfoBlock>

        <InfoBlock title="SEO — para que Google te encuentre">
          <p>
            El SEO controla <b>cómo se ve</b> tu link cuando alguien lo busca o lo comparte:
          </p>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><Search size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Título SEO</p>
              <p className="text-xs text-neutral-500">El texto azul que aparece en Google. Recomendado: 50–60 caracteres. Ej: "@{username} — Diseñador gráfico en Santiago".</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><Eye size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Descripción SEO</p>
              <p className="text-xs text-neutral-500">El párrafo gris bajo el título. También es lo que aparece al pegar tu link en WhatsApp/Twitter. Máx. 160 caracteres.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><Globe size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Indexación automática</p>
              <p className="text-xs text-neutral-500">Tu bioo se rastrea por Google sin que hagas nada extra. Puede tardar 1–4 semanas en aparecer en resultados la primera vez.</p>
            </div>
          </div>
        </InfoBlock>

        <InfoBlock title="Receta práctica — primer mes">
          <InfoStep n={1} title="Pega tu Meta Pixel hoy mismo">
            Aunque no pautes aún, el píxel <b>acumula</b> visitantes desde el día 1. Cuando decidas anunciar, tendrás miles de personas para retargetear.
          </InfoStep>
          <InfoStep n={2} title="Suma GA4 si quieres ver datos">
            GA4 te da un dashboard claro sin pagar anuncios. Perfecto para validar de dónde viene tu tráfico.
          </InfoStep>
          <InfoStep n={3} title="Llena título y descripción SEO">
            No los dejes vacíos. Es lo que define el "preview" en WhatsApp/Twitter y duplica los clics cuando compartes el link.
          </InfoStep>
          <InfoStep n={4} title="Lanza tu primer anuncio a 14 días">
            En Meta/TikTok, crea una "audiencia personalizada" = visitantes de tu bioo. Súbele $5.000–$10.000/día. Esa gente ya te conoce → conversiona mucho mejor.
          </InfoStep>
        </InfoBlock>
      </div>
    </InfoModal>
  );
}
