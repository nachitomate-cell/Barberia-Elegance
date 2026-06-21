import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Palette, Image as ImageIcon, Square, CircleUserRound, Type, CaseSensitive, type LucideIcon } from 'lucide-react';
import { useEditor } from '../store';
import ImagePicker from '../components/ImagePicker';
import { THEMES, FONTS } from '../lib/theme';
import type {
  ThemePreset, ButtonShape, ButtonFill, FontKey, BgMode, PatternKind, AvatarShape,
  BtnAnim, SizeKey, Weight, Caps, Spacing,
} from '../types';

const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

export default function Appearance(): JSX.Element {
  const { state, dispatch } = useEditor();
  const t = state.theme;
  const bg = t.bg;

  return (
    <div className="space-y-4">
      {/* ── Tema ── */}
      <Card icon={Palette} title="Tema">
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(THEMES) as ThemePreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => dispatch({ type: 'patchTheme', patch: { preset: key } })}
              className={`rounded-2xl border-2 p-1.5 transition-colors ${t.preset === key ? 'border-[#92c83a]' : 'border-transparent hover:border-neutral-200'}`}
            >
              <div className="h-12 rounded-xl" style={{ background: THEMES[key].bg }} />
              <span className="mt-1.5 block text-[11px] font-semibold text-neutral-600">{THEMES[key].name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Fondo ── */}
      <Card icon={ImageIcon} title="Fondo">
        <SlideSeg<BgMode>
          layoutId="bgMode"
          options={[['preset', 'Tema'], ['color', 'Color'], ['gradient', 'Degradado'], ['animated', 'Animado'], ['pattern', 'Patrón'], ['image', 'Imagen']]}
          value={bg.mode}
          onChange={(mode) => dispatch({ type: 'patchBg', patch: { mode } })}
        />

        {bg.mode === 'color' && (
          <ColorRow className="mt-4" label="Color de fondo">
            <ColorDot value={bg.color} onChange={(color) => dispatch({ type: 'patchBg', patch: { color } })} />
          </ColorRow>
        )}

        {(bg.mode === 'gradient' || bg.mode === 'animated') && (
          <div className="mt-4 space-y-4">
            <ColorRow label="Degradado (dos colores)">
              <ColorDot value={bg.c1} onChange={(c1) => dispatch({ type: 'patchBg', patch: { c1 } })} />
              <ColorDot value={bg.c2} onChange={(c2) => dispatch({ type: 'patchBg', patch: { c2 } })} />
            </ColorRow>
            <div>
              <SubLabel>Ángulo · {bg.angle}°</SubLabel>
              <input
                type="range" min={0} max={360} value={bg.angle}
                onChange={(e) => dispatch({ type: 'patchBg', patch: { angle: Number(e.target.value) } })}
                className="range-bioo"
              />
            </div>
          </div>
        )}

        {bg.mode === 'pattern' && (
          <div className="mt-4 space-y-4">
            <ColorRow label="Color de fondo">
              <ColorDot value={bg.color} onChange={(color) => dispatch({ type: 'patchBg', patch: { color } })} />
            </ColorRow>
            <div>
              <SubLabel>Tipo de patrón</SubLabel>
              <SlideSeg<PatternKind>
                layoutId="pattern"
                options={[['dots', 'Puntos'], ['grid', 'Cuadrícula'], ['diag', 'Diagonales']]}
                value={bg.pattern}
                onChange={(pattern) => dispatch({ type: 'patchBg', patch: { pattern } })}
              />
            </div>
          </div>
        )}

        {bg.mode === 'image' && (
          <div className="mt-4">
            <ImagePicker value={bg.image} onChange={(image) => dispatch({ type: 'patchBg', patch: { image } })} maxW={1080} label="Subir imagen" />
          </div>
        )}
      </Card>

      {/* ── Botones ── */}
      <Card icon={Square} title="Botones">
        <SubLabel>Forma</SubLabel>
        <ShapePicker value={t.shape} onChange={(shape) => dispatch({ type: 'patchTheme', patch: { shape } })} />

        <SubLabel className="mt-4">Estilo</SubLabel>
        <SlideSeg<ButtonFill>
          layoutId="fill"
          options={[['solid', 'Relleno'], ['outline', 'Contorno']]}
          value={t.fill}
          onChange={(fill) => dispatch({ type: 'patchTheme', patch: { fill } })}
        />

        <SubLabel className="mt-4">Animación</SubLabel>
        <SlideSeg<BtnAnim>
          layoutId="btnAnim"
          options={[['none', 'Ninguna'], ['float', 'Levitar'], ['pulse', 'Pulso'], ['grow', 'Crecer']]}
          value={t.btnAnim}
          onChange={(btnAnim) => dispatch({ type: 'patchTheme', patch: { btnAnim } })}
        />
      </Card>

      {/* ── Avatar ── */}
      <Card icon={CircleUserRound} title="Avatar">
        <SlideSeg<AvatarShape>
          layoutId="avatarShape"
          options={[['circle', 'Círculo'], ['rounded', 'Cuadrado']]}
          value={t.avatarShape}
          onChange={(avatarShape) => dispatch({ type: 'patchTheme', patch: { avatarShape } })}
        />
        <div className="mt-4 flex items-center gap-3">
          <ColorDot value={t.avatarRing || '#ffffff'} onChange={(v) => dispatch({ type: 'patchTheme', patch: { avatarRing: v } })} />
          <span className="text-xs font-semibold text-neutral-400">Color del anillo</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'patchTheme', patch: { avatarRing: '' } })}
            className="ml-auto rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-500 transition-colors hover:bg-neutral-200"
          >
            Sin anillo
          </button>
        </div>
      </Card>

      {/* ── Fuente ── */}
      <Card icon={Type} title="Fuente">
        <SlideSeg<FontKey>
          layoutId="font"
          options={(Object.keys(FONTS) as FontKey[]).map((k) => [k, FONTS[k].name] as [FontKey, string])}
          value={t.font}
          onChange={(font) => dispatch({ type: 'patchTheme', patch: { font } })}
        />
      </Card>

      {/* ── Texto ── */}
      <Card icon={CaseSensitive} title="Texto">
        <div className="space-y-4">
          <LabeledSeg<SizeKey> layoutId="titleSize" label="Tamaño del título" value={t.text.titleSize}
            options={[['s', 'Chico'], ['m', 'Mediano'], ['l', 'Grande']]}
            onChange={(titleSize) => dispatch({ type: 'patchText', patch: { titleSize } })} />
          <LabeledSeg<SizeKey> layoutId="subSize" label="Tamaño de la bio" value={t.text.subSize}
            options={[['s', 'Chico'], ['m', 'Mediano'], ['l', 'Grande']]}
            onChange={(subSize) => dispatch({ type: 'patchText', patch: { subSize } })} />
          <LabeledSeg<Weight> layoutId="weight" label="Peso del título" value={t.text.weight}
            options={[['normal', 'Normal'], ['bold', 'Negrita'], ['black', 'Extra']]}
            onChange={(weight) => dispatch({ type: 'patchText', patch: { weight } })} />
          <LabeledSeg<Caps> layoutId="caps" label="Mayúsculas" value={t.text.caps}
            options={[['normal', 'Aa'], ['upper', 'MAYÚS']]}
            onChange={(caps) => dispatch({ type: 'patchText', patch: { caps } })} />
          <LabeledSeg<Spacing> layoutId="spacing" label="Espaciado de letras" value={t.text.spacing}
            options={[['tight', 'Compacto'], ['normal', 'Normal'], ['wide', 'Amplio']]}
            onChange={(spacing) => dispatch({ type: 'patchText', patch: { spacing } })} />
        </div>
      </Card>
    </div>
  );
}

/* ─────────────── Helpers de UI ─────────────── */

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-neutral-800">
        <Icon size={16} className="text-[#72a129]" /> {title}
      </div>
      {children}
    </section>
  );
}

function SubLabel({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return <p className={`mb-2 text-xs font-semibold text-neutral-400 ${className}`}>{children}</p>;
}

/** Control segmentado deslizable estilo iOS (indicador animado con layoutId). */
function SlideSeg<T extends string>({ layoutId, options, value, onChange }: {
  layoutId: string; options: [T, string][]; value: T; onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-neutral-50 p-1">
      {options.map(([v, label]) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`relative isolate flex-1 shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              active ? 'text-[#15240b]' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-lg border border-[#92c83a]/30 bg-[#92c83a]/15"
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function LabeledSeg<T extends string>({ layoutId, label, value, options, onChange }: {
  layoutId: string; label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div>
      <SubLabel>{label}</SubLabel>
      <SlideSeg<T> layoutId={layoutId} options={options} value={value} onChange={onChange} />
    </div>
  );
}

const SHAPES: [ButtonShape, string, string][] = [
  ['sharp', 'Recto', 'rounded-none'],
  ['rounded', 'Redondeado', 'rounded-lg'],
  ['pill', 'Píldora', 'rounded-full'],
];

/** Selector gráfico de forma del botón. */
function ShapePicker({ value, onChange }: { value: ButtonShape; onChange: (v: ButtonShape) => void }): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {SHAPES.map(([v, label, rad]) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex flex-col items-center gap-2.5 rounded-2xl border-2 p-3 transition-colors ${
              active ? 'border-[#92c83a] bg-[#92c83a]/5' : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <span className={`h-6 w-full ${rad} ${active ? 'bg-[#92c83a]' : 'bg-neutral-300'}`} />
            <span className="text-[11px] font-semibold text-neutral-600">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ColorRow({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={className}>
      <SubLabel>{label}</SubLabel>
      <div className="flex gap-2.5">{children}</div>
    </div>
  );
}

/** Selector de color circular con microinteracción (abre el picker nativo). */
function ColorDot({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#92c83a';
  return (
    <label
      className="relative h-10 w-10 shrink-0 cursor-pointer rounded-full shadow-sm ring-1 ring-black/10 transition-transform active:scale-95"
      style={{ background: safe }}
    >
      <input
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
