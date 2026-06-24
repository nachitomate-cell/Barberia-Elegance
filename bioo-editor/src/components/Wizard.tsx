import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { useEditor, newBlock } from '../store';
import { computeUrl } from '../lib/theme';
import { confetti } from '../lib/confetti';
import ImagePicker from './ImagePicker';
import type { Block, BlockType } from '../types';

const SPRING: Transition = { type: 'spring', stiffness: 360, damping: 34, mass: 0.9 };
const ONBOARDED_KEY = 'bioo_onboarded';

type LinkTipo = 'whatsapp' | 'instagram' | 'enlace' | 'tiktok';
interface WizLink { tipo: LinkTipo; valor: string }

const LINK_TIPOS: { id: LinkTipo; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'enlace', label: 'Sitio web' },
  { id: 'tiktok', label: 'TikTok' },
];

const placeholderFor = (t: LinkTipo): string =>
  t === 'whatsapp' ? '9 1234 5678' : t === 'enlace' ? 'https://tusitio.cl' : 'tuusuario';

function makeLink(tipo: BlockType, valor: string): Block {
  const b = newBlock(tipo);
  if (tipo === 'whatsapp') b.telefono = valor.trim();
  else if (tipo === 'instagram' || tipo === 'tiktok') b.usuario = valor.trim();
  else b.url = valor.trim();
  return { ...b, url: computeUrl(b) };
}

export default function Wizard({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const { state, dispatch } = useEditor();
  const [step, setStep] = useState(0);
  const [titulo, setTitulo] = useState(state.profile.titulo);
  const [subtitulo, setSubtitulo] = useState(state.profile.subtitulo);
  const [avatar, setAvatar] = useState(state.profile.avatar);
  const [linkTipo, setLinkTipo] = useState<LinkTipo>('whatsapp');
  const [linkVal, setLinkVal] = useState('');
  const [links, setLinks] = useState<WizLink[]>([]);

  const finishOnboarding = (): void => {
    try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch { /* noop */ }
    onClose();
  };

  const apply = (): void => {
    const patch: Partial<typeof state.profile> = {};
    if (titulo.trim()) patch.titulo = titulo.trim();
    if (subtitulo.trim()) patch.subtitulo = subtitulo.trim();
    if (avatar) patch.avatar = avatar;
    if (Object.keys(patch).length) dispatch({ type: 'patchProfile', patch });

    const all = [...links];
    if (linkVal.trim()) all.push({ tipo: linkTipo, valor: linkVal.trim() });
    all.forEach((l) => { if (l.valor.trim()) dispatch({ type: 'addBlock', block: makeLink(l.tipo, l.valor) }); });

    finishOnboarding();
    confetti();
  };

  const addAnother = (): void => {
    if (!linkVal.trim()) return;
    setLinks((xs) => [...xs, { tipo: linkTipo, valor: linkVal.trim() }]);
    setLinkVal('');
  };

  const dotCount = 5;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wbd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-neutral-950/55 backdrop-blur-md"
          />
          <motion.div
            key="wcard"
            // El centrado va por x/y (no por clases -translate-*): Framer Motion
            // escribe el `transform` inline y pisaría las utilidades de Tailwind.
            initial={{ opacity: 0, x: '-50%', y: '-44%', scale: 0.96 }} animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }} exit={{ opacity: 0, x: '-50%', y: '-44%', scale: 0.96 }} transition={SPRING}
            className="fixed left-1/2 top-1/2 z-[61] w-[min(440px,calc(100vw-32px))] overflow-hidden rounded-[28px] bg-white shadow-[0_32px_90px_-20px_rgba(13,22,6,0.5)]"
          >
            {/* Cabecera con marca */}
            <div className="relative flex h-24 items-end justify-center bg-gradient-to-br from-[#abdf57] via-bioo to-[#74b32b]">
              <div className="absolute -bottom-7 grid h-16 w-16 place-items-center rounded-[19px] bg-white shadow-lg">
                <span className="bg-gradient-to-br from-[#5a9a1e] to-bioo-dark bg-clip-text text-xl font-black tracking-tight text-transparent">∞</span>
              </div>
            </div>

            <div className="px-7 pb-7 pt-12 text-center">
              {step > 0 && (
                <div className="mb-5 flex justify-center gap-1.5">
                  {Array.from({ length: dotCount }, (_, i) => (
                    <span key={i} className={`h-2 rounded-full transition-all ${i < step ? 'w-6 bg-bioo' : 'w-2 bg-neutral-200'}`} />
                  ))}
                </div>
              )}

              {step === 0 && (
                <Screen title="Te damos la bienvenida a bioo" sub="¿Necesitas ayuda? Te guiamos para dejar lo más importante en unos pasos rápidos.">
                  <PrimaryBtn onClick={() => setStep(1)}>Sí, guíame ✨</PrimaryBtn>
                  <GhostBtn onClick={finishOnboarding}>No necesito ayuda</GhostBtn>
                </Screen>
              )}

              {step === 1 && (
                <Screen title="¿Cómo se llama tu página?" sub="Tu nombre o el de tu negocio.">
                  <input className={wizInput} maxLength={60} placeholder="Ej: Patio Curauma" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                  <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
                </Screen>
              )}

              {step === 2 && (
                <Screen title="Una frase que te describa" sub="Tu bio o eslogan (opcional).">
                  <input className={wizInput} maxLength={80} placeholder="Ej: Recibe beneficios en cada compra" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
                  <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
                </Screen>
              )}

              {step === 3 && (
                <Screen title="Tu logo o foto" sub="Se muestra arriba de tu página (opcional).">
                  <div className="mb-4 flex justify-center">
                    <ImagePicker value={avatar} onChange={setAvatar} square maxW={320} label="Subir imagen" />
                  </div>
                  <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
                </Screen>
              )}

              {step === 4 && (
                <Screen title="Tus enlaces" sub="Agrega los más importantes para quien te visita.">
                  {links.length > 0 && (
                    <div className="mb-3 space-y-2 text-left">
                      {links.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                          <span className="font-bold text-bioo-dark">{LINK_TIPOS.find((t) => t.id === l.tipo)?.label}</span>
                          <span className="flex-1 truncate text-neutral-500">{l.valor}</span>
                          <button type="button" onClick={() => setLinks((xs) => xs.filter((_, j) => j !== i))} className="text-neutral-400">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mb-3 flex flex-wrap justify-center gap-2">
                    {LINK_TIPOS.map((t) => (
                      <button
                        key={t.id} type="button"
                        onClick={() => { setLinkTipo(t.id); setLinkVal(''); }}
                        className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${linkTipo === t.id ? 'border-bioo bg-bioo text-bioo-ink' : 'border-neutral-200 text-neutral-500'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <input className={wizInput} placeholder={placeholderFor(linkTipo)} value={linkVal} onChange={(e) => setLinkVal(e.target.value)} />
                  <button type="button" onClick={addAnother} className="mt-2 w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-sm font-bold text-bioo-dark hover:border-bioo">
                    + Agregar otro enlace
                  </button>
                  <Nav onBack={() => setStep(3)} onNext={() => setStep(5)} />
                </Screen>
              )}

              {step === 5 && (
                <Screen emoji="🎉" title="¡Tu bioo está listo!" sub="Cargamos lo que completaste. Personaliza lo que quieras.">
                  <PrimaryBtn onClick={apply}>Ir a mi editor</PrimaryBtn>
                  <GhostBtn onClick={() => setStep(4)}>Atrás</GhostBtn>
                </Screen>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const wizInput =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-base font-medium text-neutral-900 placeholder-neutral-400 focus:border-bioo focus:bg-white focus:outline-none';

function Screen({ title, sub, emoji, children }: { title: string; sub: string; emoji?: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      {emoji && <div className="mb-2 text-4xl">{emoji}</div>}
      <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-neutral-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-neutral-500">{sub}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function PrimaryBtn({ onClick, children }: { onClick: () => void; children: ReactNode }): JSX.Element {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl bg-bioo-dark py-3.5 text-sm font-extrabold text-white shadow-md transition-transform active:scale-[0.98]">
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: ReactNode }): JSX.Element {
  return (
    <button type="button" onClick={onClick} className="mt-2 w-full rounded-2xl py-3 text-sm font-bold text-neutral-400 hover:bg-neutral-50">
      {children}
    </button>
  );
}

function Nav({ onBack, onNext }: { onBack: () => void; onNext: () => void }): JSX.Element {
  return (
    <div className="mt-4 flex gap-2">
      <button type="button" onClick={onBack} className="rounded-2xl px-5 py-3.5 text-sm font-bold text-neutral-400 hover:bg-neutral-50">Atrás</button>
      <button type="button" onClick={onNext} className="flex-1 rounded-2xl bg-bioo-dark py-3.5 text-sm font-extrabold text-white active:scale-[0.98]">Continuar</button>
    </div>
  );
}
