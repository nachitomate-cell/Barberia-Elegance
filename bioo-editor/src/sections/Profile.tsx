import { useEditor } from '../store';
import { Field, inputCls } from '../ui';
import type { Profile as ProfileType } from '../types';

export default function Profile(): JSX.Element {
  const { state, dispatch } = useEditor();
  const p = state.profile;
  const patch = (patch: Partial<ProfileType>): void => dispatch({ type: 'patchProfile', patch });

  return (
    <div className="space-y-4">
      <Field label="Nombre que se muestra">
        <input className={inputCls} value={p.titulo} placeholder="Tu nombre o marca" onChange={(e) => patch({ titulo: e.target.value })} />
      </Field>

      <Field label="Bio / descripción">
        <textarea className={inputCls} rows={3} value={p.subtitulo} placeholder="Cuéntale al mundo quién eres en una línea." onChange={(e) => patch({ subtitulo: e.target.value })} />
      </Field>

      <Field label="Foto de perfil (URL)">
        <input className={inputCls} value={p.avatar} placeholder="https://… (enlace de tu foto)" onChange={(e) => patch({ avatar: e.target.value })} />
      </Field>

      <Field label="Tu usuario (URL)">
        <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-50 px-3 focus-within:border-bioo focus-within:bg-white">
          <span className="select-none text-sm text-neutral-400">bioo.cl/</span>
          <input
            className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
            value={state.username}
            onChange={(e) => dispatch({ type: 'setUsername', value: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
          />
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input type="checkbox" className="h-4 w-4 accent-bioo" checked={p.verified} onChange={(e) => patch({ verified: e.target.checked })} />
        Mostrar insignia verificada ✓
      </label>
    </div>
  );
}
