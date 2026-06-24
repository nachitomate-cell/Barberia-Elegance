import { useState } from 'react';
import { AnimatePresence, motion, type Transition, type PanInfo } from 'framer-motion';
import { Sparkles, Mail, Lock, ShieldCheck, X } from 'lucide-react';
import { upgradeWithGoogle, upgradeWithEmail } from '../lib/auth';

/* Spring estilo iOS (igual que ShareModal/PreviewSheet). */
const SHEET_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30 };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Handle que el usuario está reclamando (bioo.cl/<username>). */
  username: string;
  /** Se invoca al fusionar/iniciar sesión con éxito.
   *  mode 'linked'  → cuenta nueva: el editor debe publicar el borrador.
   *  mode 'switched'→ cuenta existente: el editor carga su bio guardada. */
  onUpgraded: (mode: 'linked' | 'switched') => void;
}

type Busy = 'none' | 'google' | 'email';

export default function ClaimModal({ isOpen, onClose, username, onUpgraded }: Props): JSX.Element {
  const [mode, setMode] = useState<'menu' | 'email'>('menu');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState<Busy>('none');
  const [error, setError] = useState('');

  const reset = (): void => { setMode('menu'); setEmail(''); setPass(''); setBusy('none'); setError(''); };
  const close = (): void => { reset(); onClose(); };

  const handleGoogle = async (): Promise<void> => {
    if (busy !== 'none') return;
    setError(''); setBusy('google');
    const res = await upgradeWithGoogle();
    if (res.ok) { onUpgraded(res.mode); reset(); }
    else { setError(res.message); setBusy('none'); }
  };

  const handleEmail = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (busy !== 'none') return;
    setError(''); setBusy('email');
    const res = await upgradeWithEmail(email, pass);
    if (res.ok) { onUpgraded(res.mode); reset(); }
    else { setError(res.message); setBusy('none'); }
  };

  const handleDragEnd = (_e: unknown, info: PanInfo): void => {
    if (info.offset.y > 120 || info.velocity.y > 800) close();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Guardar tu página"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[94vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-14px_44px_-12px_rgba(0,0,0,0.35)]"
          >
            {/* Píldora + cerrar */}
            <div className="sticky top-0 z-10 flex items-center justify-center bg-white pt-3 pb-2">
              <span className="h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden />
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className="absolute right-4 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Encabezado */}
            <div className="px-6 pt-2 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#92c83a]/15 text-[#15240b]">
                <Sparkles size={26} />
              </span>
              <h2 className="mt-4 text-xl font-extrabold tracking-tight text-neutral-900">Guarda tu página</h2>
              <p className="mt-1 text-sm leading-snug text-neutral-500">
                Crea tu cuenta para publicar <span className="font-semibold text-neutral-700">bioo.cl/{username}</span> y no perder tu diseño.
              </p>
            </div>

            <div className="px-6 pt-6">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy !== 'none'}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white py-3.5 text-sm font-bold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-60"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
                {busy === 'google' ? 'Conectando con Google…' : 'Continuar con Google'}
              </button>

              {mode === 'menu' ? (
                <>
                  <div className="my-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                    <span className="h-px flex-1 bg-neutral-200" /> o <span className="h-px flex-1 bg-neutral-200" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMode('email'); setError(''); }}
                    disabled={busy !== 'none'}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-60"
                  >
                    <Mail size={17} /> Usar correo y contraseña
                  </button>
                </>
              ) : (
                <form onSubmit={handleEmail} className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 focus-within:border-[#92c83a] focus-within:bg-white">
                    <Mail size={16} className="shrink-0 text-neutral-400" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="h-12 w-full bg-transparent text-sm font-semibold text-neutral-800 outline-none placeholder:font-medium placeholder:text-neutral-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 focus-within:border-[#92c83a] focus-within:bg-white">
                    <Lock size={16} className="shrink-0 text-neutral-400" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder="Contraseña (mín. 6 caracteres)"
                      className="h-12 w-full bg-transparent text-sm font-semibold text-neutral-800 outline-none placeholder:font-medium placeholder:text-neutral-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy !== 'none'}
                    className="mt-1 w-full rounded-2xl bg-[#15240b] py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#234b12] active:scale-[0.98] disabled:opacity-60"
                  >
                    {busy === 'email' ? 'Creando tu cuenta…' : 'Crear cuenta y guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('menu'); setError(''); }}
                    className="w-full py-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-neutral-600"
                  >
                    ← Volver
                  </button>
                </form>
              )}

              {error && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600">{error}</p>
              )}

              <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-neutral-400">
                <ShieldCheck size={13} className="text-[#92c83a]" /> Tu diseño actual se conserva tal cual.
              </p>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
