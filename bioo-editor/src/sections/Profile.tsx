import { User, AtSign } from 'lucide-react';
import { useEditor } from '../store';
import { Card, Field, inputBase } from '../ui';
import ImagePicker from '../components/ImagePicker';
import type { Profile as ProfileType } from '../types';

export default function Profile(): JSX.Element {
  const { state, dispatch } = useEditor();
  const p = state.profile;
  const patch = (patch: Partial<ProfileType>): void => dispatch({ type: 'patchProfile', patch });

  return (
    <div className="space-y-6">
      {/* ── Identidad ── */}
      <Card icon={User} title="Perfil">
        <div className="space-y-5">
          <Field label="Foto de perfil">
            <ImagePicker value={p.avatar} onChange={(v) => patch({ avatar: v })} square maxW={320} label="Subir foto" />
          </Field>

          <Field label="Portada (opcional)">
            <ImagePicker value={p.cover} onChange={(v) => patch({ cover: v })} maxW={1200} label="Subir portada" />
          </Field>

          <Field label="Nombre que se muestra">
            <input
              className={`${inputBase} text-lg font-bold`}
              value={p.titulo}
              placeholder="Tu nombre o marca"
              onChange={(e) => patch({ titulo: e.target.value })}
            />
          </Field>

          <Field label="Bio / descripción">
            <textarea
              className={`${inputBase} resize-none leading-relaxed`}
              rows={3}
              value={p.subtitulo}
              placeholder="Cuéntale al mundo quién eres en una línea."
              onChange={(e) => patch({ subtitulo: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      {/* ── Enlace público ── */}
      <Card icon={AtSign} title="Tu enlace público">
        <div className="space-y-5">
          <Field label="Tu usuario (URL)">
            <div className="flex items-center rounded-xl border border-transparent bg-neutral-100/70 px-3.5 transition-all focus-within:border-[#92c83a] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#92c83a]/10">
              <span className="select-none text-sm text-neutral-400">bioo.cl/</span>
              <input
                className="flex-1 bg-transparent py-3.5 text-sm text-[#15240b] outline-none"
                value={state.username}
                onChange={(e) => dispatch({ type: 'setUsername', value: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
              />
            </div>
          </Field>

          <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-700">
            <input type="checkbox" className="h-4 w-4 accent-[#92c83a]" checked={p.verified} onChange={(e) => patch({ verified: e.target.checked })} />
            Mostrar insignia verificada ✓
          </label>
        </div>
      </Card>
    </div>
  );
}
