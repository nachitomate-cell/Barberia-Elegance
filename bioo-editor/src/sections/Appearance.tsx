import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Palette, Image as ImageIcon, Square, CircleUserRound, Type, CaseSensitive } from 'lucide-react';
import { useEditor } from '../store';
import ImagePicker from '../components/ImagePicker';
import { Card, labelCls } from '../ui';
import { THEMES, FONTS, loadFont, patternCss } from '../lib/theme';
import type {
  ThemePreset, ButtonShape, ButtonFill, FontKey, BgMode, PatternKind, AvatarShape,
  BtnAnim, SizeKey, Weight, Caps, Spacing,
} from '../types';

const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;
const FONT_KEYS = Object.keys(FONTS) as FontKey[];

const PATTERNS: [PatternKind, string][] = [['dots', 'Puntos'], ['grid', 'Cuadrícula'], ['diag', 'Diagonales']];

const AURORAS: { name: string; c1: string; c2: string; angle: number }[] = [
  { name: 'Aurora', c1: '#7c3aed', c2: '#22d3ee', angle: 135 },
  { name: 'Atardecer', c1: '#fb7185', c2: '#f59e0b', angle: 120 },
  { name: 'Bosque', c1: '#15240b', c2: '#92c83a', angle: 160 },
];

export default function Appearance(): JSX.Element {
  const { state, dispatch } = useEditor();
  const t = state.theme;
  const bg = t.bg;

  // Carga todas las fuentes para que el selector las muestre en su tipografía real.
  useEffect(() => { FONT_KEYS.forEach(loadFont); }, []);

  return (
    <div className="space-y-6">
      {/* ── Tema ── */}
      <Card icon={Palette} title="Tema">
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          {(Object.keys(THEMES) as ThemePreset[]).map((key) => {
            const active = t.preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => dispatch({ type: 'patchTheme', patch: { preset: key } })}
                className="group transition-transform hover:scale-[1.02]"
              >
                <div
                  className={`h-14 rounded-2xl shadow-sm transition-shadow ${active ? 'ring-2 ring-[#92c83a] ring-offset-4 ring-offset-white' : 'ring-1 ring-black/5'}`}
                  style={{ background: THEMES[key].bg }}
                />
                <span className={`mt-3 block text-center text-[11px] font-semibold ${active ? 'text-[#15240b]' : 'text-neutral-500'}`}>{THEMES[key].name}</span>
              </button>
            );
          })}
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
          <ColorRow className="mt-5" label="Color de fondo">
            <ColorDot value={bg.color} onChange={(color) => dispatch({ type: 'patchBg', patch: { color } })} />
          </ColorRow>
        )}

        {bg.mode === 'gradient' && (
          <div className="mt-5 space-y-5">
            <div className="h-20 w-full rounded-2xl shadow-sm ring-1 ring-black/5" style={{ backgroundImage: `linear-gradient(${bg.angle}deg, ${bg.c1}, ${bg.c2})` }} />
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

        {bg.mode === 'animated' && (
          <div className="mt-5 space-y-5">
            {/* Vista previa animada en vivo */}
            <div
              className="h-24 w-full rounded-2xl shadow-sm ring-1 ring-black/5"
              style={{ backgroundImage: `linear-gradient(${bg.angle}deg, ${bg.c1}, ${bg.c2})`, backgroundSize: '220% 220%', animation: 'bgshift 14s ease infinite' }}
            />
            <div>
              <SubLabel>Estilos animados</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {AURORAS.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => dispatch({ type: 'patchBg', patch: { c1: a.c1, c2: a.c2, angle: a.angle } })}
                    className="flex flex-col items-center gap-2 transition-transform hover:scale-[1.02]"
                  >
                    <span
                      className="h-12 w-full rounded-xl shadow-sm ring-1 ring-black/5"
                      style={{ backgroundImage: `linear-gradient(${a.angle}deg, ${a.c1}, ${a.c2})`, backgroundSize: '220% 220%', animation: 'bgshift 10s ease infinite' }}
                    />
                    <span className="text-[11px] font-semibold text-neutral-500">{a.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <ColorRow label="Colores">
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
          <div className="mt-5 space-y-5">
            <ColorRow label="Color de fondo">
              <ColorDot value={bg.color} onChange={(color) => dispatch({ type: 'patchBg', patch: { color } })} />
            </ColorRow>
            <div>
              <SubLabel>Tipo de patrón</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {PATTERNS.map(([k, label]) => {
                  const active = bg.pattern === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => dispatch({ type: 'patchBg', patch: { pattern: k } })}
                      className="flex flex-col items-center gap-2 transition-transform hover:scale-[1.02]"
                    >
                      <span
                        className={`h-16 w-full rounded-2xl shadow-sm ${active ? 'ring-2 ring-[#92c83a] ring-offset-4 ring-offset-white' : 'ring-1 ring-black/5'}`}
                        style={{ background: patternCss(k, '#1b3a10') }}
                      />
                      <span className={`text-[11px] font-semibold ${active ? 'text-[#15240b]' : 'text-neutral-500'}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {bg.mode === 'image' && (
          <div className="mt-5">
            <ImagePicker value={bg.image} onChange={(image) => dispatch({ type: 'patchBg', patch: { image } })} maxW={1080} label="Subir imagen" />
          </div>
        )}
      </Card>

      {/* ── Botones ── */}
      <Card icon={Square} title="Botones">
        <SubLabel>Forma</SubLabel>
        <ShapePicker value={t.shape} onChange={(shape) => dispatch({ type: 'patchTheme', patch: { shape } })} />

        <SubLabel className="mt-6">Estilo</SubLabel>
        <SlideSeg<ButtonFill>
          layoutId="fill"
          options={[['solid', 'Relleno'], ['outline', 'Contorno']]}
          value={t.fill}
          onChange={(fill) => dispatch({ type: 'patchTheme', patch: { fill } })}
        />

        <SubLabel className="mt-6">Animación</SubLabel>
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
        <div className="mt-5 flex items-center gap-3">
          <ColorDot value={t.avatarRing || '#ffffff'} onChange={(v) => dispatch({ type: 'patchTheme', patch: { avatarRing: v } })} />
          <span className="text-sm font-semibold text-neutral-500">Color del anillo</span>
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
        <div className="grid grid-cols-2 gap-3">
          {FONT_KEYS.map((k) => {
            const active = t.font === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => dispatch({ type: 'patchTheme', patch: { font: k } })}
                style={{ fontFamily: FONTS[k].stack }}
                className={`rounded-2xl border p-4 text-center transition-colors ${
                  active ? 'border-[#92c83a] bg-[#92c83a]/10' : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <span className="text-xl font-bold text-[#15240b]">{FONTS[k].name}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Texto ── */}
      <Card icon={CaseSensitive} title="Texto">
        <div className="space-y-5">
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

function SubLabel({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return <p className={`${labelCls} ${className}`}>{children}</p>;
}

/** Control segmentado deslizable estilo iOS (indicador animado con layoutId). */
function SlideSeg<T extends string>({ layoutId, options, value, onChange }: {
  layoutId: string; options: [T, string][]; value: T; onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-neutral-100/80 p-1">
      {options.map(([v, label]) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`relative isolate flex-1 shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
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

/** Selector gráfico de forma del botón (muestra activa en verde lima). */
function ShapePicker({ value, onChange }: { value: ButtonShape; onChange: (v: ButtonShape) => void }): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-3">
      {SHAPES.map(([v, label, rad]) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-colors ${
              active ? 'border-[#92c83a] bg-[#92c83a]/10' : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <span className={`h-7 w-full ${rad} transition-colors ${active ? 'bg-[#92c83a]' : 'bg-[#15240b]'}`} />
            <span className="text-xs font-semibold text-neutral-600">{label}</span>
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
      className="relative h-10 w-10 shrink-0 cursor-pointer rounded-full shadow-sm ring-1 ring-black/10 transition-all focus-within:ring-2 focus-within:ring-[#92c83a] focus-within:ring-offset-2 focus-within:ring-offset-white active:scale-95"
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
