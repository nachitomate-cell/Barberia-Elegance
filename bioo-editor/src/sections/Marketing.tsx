import type { ReactNode } from 'react';
import { LineChart, Search, type LucideIcon } from 'lucide-react';
import { useEditor } from '../store';
import type { Marketing as MarketingT, Seo } from '../types';

export default function Marketing(): JSX.Element {
  const { state, dispatch } = useEditor();
  const m = state.marketing;
  const seo = state.seo;
  const setM = (patch: Partial<MarketingT>): void => dispatch({ type: 'patchMarketing', patch });
  const setSeo = (patch: Partial<Seo>): void => dispatch({ type: 'patchSeo', patch });

  return (
    <div className="space-y-4">
      {/* Píxeles */}
      <Card icon={LineChart} title="Píxeles de seguimiento" hint="Mide visitas y crea audiencias de retargeting en tus campañas.">
        <SeamField label="Google Analytics 4" value={m.ga4} placeholder="G-XXXXXXXXXX" mono onChange={(v) => setM({ ga4: v.trim() })} />
        <SeamField label="Meta Pixel ID" value={m.metaPixel} placeholder="1234567890123456" mono onChange={(v) => setM({ metaPixel: v.trim() })} />
        <SeamField label="TikTok Pixel ID" value={m.tiktokPixel} placeholder="CXXXXXXXXXXXXXXXXX" mono onChange={(v) => setM({ tiktokPixel: v.trim() })} />
      </Card>

      {/* SEO */}
      <Card icon={Search} title="SEO y metadatos" hint="Cómo se ve tu página en buscadores y al compartir el enlace.">
        <SeamField
          label="Título SEO"
          value={seo.title}
          placeholder={state.profile.titulo || `${state.username} · bioo`}
          onChange={(v) => setSeo({ title: v })}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Descripción SEO</span>
          <textarea
            rows={3}
            value={seo.description}
            placeholder={state.profile.subtitulo || 'Una frase que describa tu página para Google y redes.'}
            onChange={(e) => setSeo({ description: e.target.value })}
            className="w-full resize-none rounded-lg bg-transparent px-2 py-1.5 text-sm text-neutral-600 placeholder-neutral-300 transition-colors focus:bg-neutral-50 focus:outline-none"
          />
          <span className="mt-1 block text-right text-[11px] text-neutral-300">{seo.description.length}/160</span>
        </label>
      </Card>

      <p className="px-1 text-center text-[11px] leading-relaxed text-neutral-400">
        Los píxeles se inyectan solo en tu página pública (bioo.cl/{state.username}) cuando guardas.
        Deja un campo vacío para desactivar ese píxel.
      </p>
    </div>
  );
}

function Card({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }): JSX.Element {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2 text-sm font-bold text-neutral-800">
        <Icon size={16} className="text-[#72a129]" /> {title}
      </div>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function SeamField({ label, value, placeholder, onChange, mono = false }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void; mono?: boolean;
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg bg-transparent px-2 py-1.5 text-sm text-neutral-900 placeholder-neutral-300 transition-colors focus:bg-neutral-50 focus:outline-none ${mono ? 'font-mono tracking-tight' : 'font-medium'}`}
      />
    </label>
  );
}
