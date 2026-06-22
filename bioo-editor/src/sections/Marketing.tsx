import { LineChart, Search } from 'lucide-react';
import { useEditor } from '../store';
import { Card, Field, inputBase } from '../ui';
import type { Marketing as MarketingT, Seo } from '../types';

export default function Marketing(): JSX.Element {
  const { state, dispatch } = useEditor();
  const m = state.marketing;
  const seo = state.seo;
  const setM = (patch: Partial<MarketingT>): void => dispatch({ type: 'patchMarketing', patch });
  const setSeo = (patch: Partial<Seo>): void => dispatch({ type: 'patchSeo', patch });

  return (
    <div className="space-y-6">
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
    </div>
  );
}
