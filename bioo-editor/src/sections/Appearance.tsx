import type { ReactNode } from 'react';
import { useEditor } from '../store';
import { Group, Segmented } from '../ui';
import ImagePicker from '../components/ImagePicker';
import { THEMES, FONTS } from '../lib/theme';
import type {
  ThemePreset, ButtonShape, ButtonFill, FontKey, BgMode, PatternKind, AvatarShape,
  BtnAnim, SizeKey, Weight, Caps, Spacing,
} from '../types';

export default function Appearance(): JSX.Element {
  const { state, dispatch } = useEditor();
  const t = state.theme;
  const bg = t.bg;

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

      <Group title="Fondo">
        <Segmented<BgMode>
          options={[['preset', 'Tema'], ['color', 'Color'], ['gradient', 'Degradado'], ['animated', 'Animado'], ['pattern', 'Patrón'], ['image', 'Imagen']]}
          value={bg.mode}
          onChange={(mode) => dispatch({ type: 'patchBg', patch: { mode } })}
        />

        {bg.mode === 'color' && (
          <ColorRow className="mt-3" label="Color de fondo">
            <ColorInput value={bg.color} onChange={(color) => dispatch({ type: 'patchBg', patch: { color } })} />
          </ColorRow>
        )}

        {(bg.mode === 'gradient' || bg.mode === 'animated') && (
          <div className="mt-3 space-y-3">
            <ColorRow label="Degradado (dos colores)">
              <ColorInput value={bg.c1} onChange={(c1) => dispatch({ type: 'patchBg', patch: { c1 } })} />
              <ColorInput value={bg.c2} onChange={(c2) => dispatch({ type: 'patchBg', patch: { c2 } })} />
            </ColorRow>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-400">Ángulo</p>
              <input
                type="range" min={0} max={360} value={bg.angle}
                onChange={(e) => dispatch({ type: 'patchBg', patch: { angle: Number(e.target.value) } })}
                className="w-full accent-bioo"
              />
            </div>
          </div>
        )}

        {bg.mode === 'pattern' && (
          <div className="mt-3 space-y-3">
            <ColorRow label="Color de fondo">
              <ColorInput value={bg.color} onChange={(color) => dispatch({ type: 'patchBg', patch: { color } })} />
            </ColorRow>
            <Segmented<PatternKind>
              options={[['dots', 'Puntos'], ['grid', 'Cuadrícula'], ['diag', 'Diagonales']]}
              value={bg.pattern}
              onChange={(pattern) => dispatch({ type: 'patchBg', patch: { pattern } })}
            />
          </div>
        )}

        {bg.mode === 'image' && (
          <div className="mt-3">
            <ImagePicker value={bg.image} onChange={(image) => dispatch({ type: 'patchBg', patch: { image } })} maxW={1080} label="Subir imagen" />
          </div>
        )}
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

      <Group title="Animación de botones">
        <Segmented<BtnAnim>
          options={[['none', 'Ninguna'], ['float', 'Levitar'], ['pulse', 'Pulso'], ['grow', 'Crecer']]}
          value={t.btnAnim}
          onChange={(btnAnim) => dispatch({ type: 'patchTheme', patch: { btnAnim } })}
        />
      </Group>

      <Group title="Avatar">
        <Segmented<AvatarShape>
          options={[['circle', 'Círculo'], ['rounded', 'Cuadrado']]}
          value={t.avatarShape}
          onChange={(avatarShape) => dispatch({ type: 'patchTheme', patch: { avatarShape } })}
        />
        <div className="mt-3 flex items-center gap-3">
          <ColorInput value={t.avatarRing || '#ffffff'} onChange={(v) => dispatch({ type: 'patchTheme', patch: { avatarRing: v } })} />
          <button type="button" onClick={() => dispatch({ type: 'patchTheme', patch: { avatarRing: '' } })} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500 hover:border-bioo">
            Sin anillo
          </button>
        </div>
      </Group>

      <Group title="Fuente">
        <Segmented<FontKey>
          options={(Object.keys(FONTS) as FontKey[]).map((k) => [k, FONTS[k].name] as [FontKey, string])}
          value={t.font}
          onChange={(font) => dispatch({ type: 'patchTheme', patch: { font } })}
        />
      </Group>

      <Group title="Texto">
        <div className="space-y-3">
          <LabeledSeg<SizeKey> label="Tamaño del título" value={t.text.titleSize}
            options={[['s', 'Chico'], ['m', 'Mediano'], ['l', 'Grande']]}
            onChange={(titleSize) => dispatch({ type: 'patchText', patch: { titleSize } })} />
          <LabeledSeg<SizeKey> label="Tamaño de la bio" value={t.text.subSize}
            options={[['s', 'Chico'], ['m', 'Mediano'], ['l', 'Grande']]}
            onChange={(subSize) => dispatch({ type: 'patchText', patch: { subSize } })} />
          <LabeledSeg<Weight> label="Peso del título" value={t.text.weight}
            options={[['normal', 'Normal'], ['bold', 'Negrita'], ['black', 'Extra']]}
            onChange={(weight) => dispatch({ type: 'patchText', patch: { weight } })} />
          <LabeledSeg<Caps> label="Mayúsculas" value={t.text.caps}
            options={[['normal', 'Aa'], ['upper', 'MAYÚS']]}
            onChange={(caps) => dispatch({ type: 'patchText', patch: { caps } })} />
          <LabeledSeg<Spacing> label="Espaciado de letras" value={t.text.spacing}
            options={[['tight', 'Compacto'], ['normal', 'Normal'], ['wide', 'Amplio']]}
            onChange={(spacing) => dispatch({ type: 'patchText', patch: { spacing } })} />
        </div>
      </Group>
    </div>
  );
}

function LabeledSeg<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-neutral-400">{label}</p>
      <Segmented<T> options={options} value={value} onChange={onChange} />
    </div>
  );
}

function ColorRow({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-semibold text-neutral-400">{label}</p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <input
      type="color"
      value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#92c83a'}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
    />
  );
}
