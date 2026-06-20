import { useEditor } from '../store';
import { Group, Segmented } from '../ui';
import { THEMES, FONTS } from '../lib/theme';
import type { ThemePreset, ButtonShape, ButtonFill, FontKey } from '../types';

export default function Appearance(): JSX.Element {
  const { state, dispatch } = useEditor();
  const t = state.theme;

  return (
    <div className="space-y-6">
      <Group title="Tema">
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(THEMES) as ThemePreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => dispatch({ type: 'patchTheme', patch: { preset: key } })}
              className={`rounded-2xl border-2 p-1.5 transition-colors ${t.preset === key ? 'border-bioo' : 'border-transparent hover:border-neutral-200'}`}
            >
              <div className="h-12 rounded-xl" style={{ background: THEMES[key].bg }} />
              <span className="mt-1.5 block text-[11px] font-semibold text-neutral-600">{THEMES[key].name}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Forma del botón">
        <Segmented<ButtonShape>
          options={[['rounded', 'Redondeado'], ['pill', 'Píldora'], ['sharp', 'Recto']]}
          value={t.shape}
          onChange={(shape) => dispatch({ type: 'patchTheme', patch: { shape } })}
        />
      </Group>

      <Group title="Estilo del botón">
        <Segmented<ButtonFill>
          options={[['solid', 'Relleno'], ['outline', 'Contorno']]}
          value={t.fill}
          onChange={(fill) => dispatch({ type: 'patchTheme', patch: { fill } })}
        />
      </Group>

      <Group title="Fuente">
        <Segmented<FontKey>
          options={(Object.keys(FONTS) as FontKey[]).map((k) => [k, FONTS[k].name] as [FontKey, string])}
          value={t.font}
          onChange={(font) => dispatch({ type: 'patchTheme', patch: { font } })}
        />
      </Group>
    </div>
  );
}
