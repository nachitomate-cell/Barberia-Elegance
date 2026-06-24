import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Palette, Image as ImageIcon, Square, CircleUserRound, Type, CaseSensitive } from 'lucide-react';
import { useEditor } from '../store';
import ImagePicker from '../components/ImagePicker';
import { Card, labelCls } from '../ui';
import { THEMES, FONTS, loadFont } from '../lib/theme';
import { BG_GALLERY, BG_CATEGORIES, isGalleryUrl, type BgCategory } from '../lib/bgGallery';
import type {
  ThemePreset, ButtonShape, ButtonFill, FontKey, BgMode, PatternKind, FxKind, AvatarShape,
  BtnAnim, SizeKey, Weight, Caps, Spacing,
} from '../types';

const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;
const FONT_KEYS = Object.keys(FONTS) as FontKey[];

const FX: [FxKind, string][] = [['aurora', 'Aurora'], ['fluid', 'Fluido'], ['grain', 'Grano'], ['gasgiant', 'Vórtice']];
const PATTERNS: [PatternKind, string][] = [['grid', 'Cuadrícula'], ['dots', 'Puntos'], ['topo', 'Topográfico']];

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
            <div>
              <SubLabel>Estilo animado</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {FX.map(([k, label]) => (
                  <FxCard
                    key={k}
                    kind={k}
                    label={label}
                    active={(bg.fx ?? 'aurora') === k}
                    onClick={() => dispatch({ type: 'patchBg', patch: { fx: k } })}
                    vars={{ '--c1': bg.c1, '--c2': bg.c2, '--blur': '22px' } as CSSProperties}
                    blobs={k === 'aurora' || k === 'fluid'}
                  />
                ))}
              </div>
            </div>
            <ColorRow label="Colores del fondo">
              <ColorDot value={bg.c1} onChange={(c1) => dispatch({ type: 'patchBg', patch: { c1 } })} />
              <ColorDot value={bg.c2} onChange={(c2) => dispatch({ type: 'patchBg', patch: { c2 } })} />
            </ColorRow>
          </div>
        )}

        {bg.mode === 'pattern' && (
          <div className="mt-5 space-y-5">
            <div>
              <SubLabel>Tipo de patrón</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {PATTERNS.map(([k, label]) => (
                  <FxCard
                    key={k}
                    kind={k}
                    label={label}
                    active={bg.pattern === k}
                    onClick={() => dispatch({ type: 'patchBg', patch: { pattern: k } })}
                    vars={{ '--base': bg.color } as CSSProperties}
                    blobs={false}
                  />
                ))}
              </div>
            </div>
            <ColorRow label="Color base">
              <ColorDot value={bg.color} onChange={(color) => dispatch({ type: 'patchBg', patch: { color } })} />
            </ColorRow>
          </div>
        )}

        {bg.mode === 'image' && (
          <BgImagePanel
            value={bg.image}
            onChange={(image) => dispatch({ type: 'patchBg', patch: { image } })}
          />
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

/** Tarjeta de selección con previsualización VIVA del fondo (misma clase bgfx que el visor). */
function FxCard({ kind, label, active, onClick, vars, blobs }: {
  kind: string; label: string; active: boolean; onClick: () => void; vars: CSSProperties; blobs: boolean;
}): JSX.Element {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 transition-transform hover:scale-[1.02]">
      <span className={`relative block h-24 w-full overflow-hidden rounded-2xl shadow-sm ${active ? 'ring-2 ring-[#92c83a] ring-offset-4 ring-offset-white' : 'ring-1 ring-black/5'}`}>
        <span className={`bgfx bgfx-${kind}`} style={vars}>
          {blobs && <><i className="blob" /><i className="blob" /><i className="blob" /></>}
        </span>
      </span>
      <span className={`text-[11px] font-semibold ${active ? 'text-[#15240b]' : 'text-neutral-500'}`}>{label}</span>
    </button>
  );
}

/** Panel del modo "Imagen" — alterna Galería (curada) / Subir (custom).
 *  Auto-elige el tab inicial según el origen de bg.image: una URL `/bg/...`
 *  abre Galería; cualquier otra (Firebase Storage / blob) abre Subir. */
type ImgSrc = 'gallery' | 'upload';
function BgImagePanel({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  const initial: ImgSrc = isGalleryUrl(value) || !value ? 'gallery' : 'upload';
  const [src, setSrc] = useState<ImgSrc>(initial);
  return (
    <div className="mt-5 space-y-5">
      <SlideSeg<ImgSrc>
        layoutId="bgImgSrc"
        options={[['gallery', 'Galería'], ['upload', 'Subir']]}
        value={src}
        onChange={setSrc}
      />
      {src === 'gallery' ? (
        <BgGalleryGrid value={value} onChange={onChange} />
      ) : (
        <ImagePicker value={value} onChange={onChange} maxW={1080} label="Subir imagen" />
      )}
    </div>
  );
}

/** Grilla de fondos curados con filtro por categoría. Thumbnails 9:16
 *  para reflejar la proporción del fondo real (mobile-first). */
function BgGalleryGrid({ value, onChange }: { value: string; onChange: (url: string) => void }): JSX.Element {
  type CatFilter = BgCategory | 'all';
  const [cat, setCat] = useState<CatFilter>('all');
  const items = cat === 'all' ? BG_GALLERY : BG_GALLERY.filter((i) => i.category === cat);
  const chips: { id: CatFilter; label: string }[] = [{ id: 'all', label: 'Todas' }, ...BG_CATEGORIES];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {chips.map(({ id, label }) => {
          const active = cat === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCat(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#92c83a] text-[#15240b]'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => {
          const active = value === it.url;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.url)}
              className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]"
              title={it.label}
            >
              <span
                className={`relative block aspect-[9/16] overflow-hidden rounded-2xl shadow-sm transition-shadow ${
                  active ? 'ring-2 ring-[#92c83a] ring-offset-4 ring-offset-white' : 'ring-1 ring-black/5'
                }`}
              >
                <img
                  src={it.thumb}
                  alt={it.label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {active && <span className="absolute inset-0 bg-[#92c83a]/15" aria-hidden="true" />}
              </span>
              <span className={`block text-center text-[10px] font-semibold leading-tight ${active ? 'text-[#15240b]' : 'text-neutral-500'}`}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-neutral-400">Fotos de Unsplash · uso libre, sin atribución requerida.</p>
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
