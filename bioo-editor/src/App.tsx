import { useEffect, useRef, useState, type ComponentType } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Link2, User as UserIcon, Palette, Share2, Inbox, Megaphone, Eye, Save, type LucideIcon } from 'lucide-react';
import { auth } from './lib/firebase';
import { saveBio, loadUserBio } from './lib/bio';
import { useEditor } from './store';
import Links from './sections/Links';
import Profile from './sections/Profile';
import Appearance from './sections/Appearance';
import Share from './sections/Share';
import Leads from './sections/Leads';
import Marketing from './sections/Marketing';
import BioPreview from './preview/BioPreview';
import PreviewSheet from './preview/PreviewSheet';
import PhoneFrame from './components/PhoneFrame';
import Wizard from './components/Wizard';
import type { SectionId } from './types';

const SECTIONS: { id: SectionId; label: string; Icon: LucideIcon }[] = [
  { id: 'links', label: 'Enlaces', Icon: Link2 },
  { id: 'profile', label: 'Perfil', Icon: UserIcon },
  { id: 'design', label: 'Apariencia', Icon: Palette },
  { id: 'leads', label: 'Leads', Icon: Inbox },
  { id: 'marketing', label: 'Marketing', Icon: Megaphone },
  { id: 'share', label: 'Compartir', Icon: Share2 },
];

const VIEWS: Record<SectionId, ComponentType> = {
  links: Links,
  profile: Profile,
  design: Appearance,
  leads: Leads,
  marketing: Marketing,
  share: Share,
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function App(): JSX.Element {
  const { state, dispatch } = useEditor();
  const loadedRef = useRef(false);
  const [section, setSection] = useState<SectionId>('links');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [showWizard, setShowWizard] = useState<boolean>(() => {
    try { if (localStorage.getItem('bioo_onboarded')) return false; } catch { /* noop */ }
    return state.blocks.length === 0 && !state.profile.titulo.trim();
  });

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        // Al autenticarse, cargamos la bio guardada del usuario (una vez).
        if (u && !loadedRef.current) {
          loadedRef.current = true;
          loadUserBio(u.uid)
            .then((bio) => { if (bio) dispatch({ type: 'load', state: bio }); })
            .catch(() => {});
        }
      }),
    [dispatch],
  );

  const goLogin = (): void => { window.location.href = '/registro?modo=login'; };

  const handleSave = async (): Promise<void> => {
    if (!auth.currentUser) {
      if (window.confirm('Para publicar tu página necesitas iniciar sesión. ¿Ir a iniciar sesión?')) goLogin();
      return;
    }
    setStatus('saving');
    try {
      await saveBio(state);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  const SectionView = VIEWS[section];
  const sectionLabel = SECTIONS.find((s) => s.id === section)?.label ?? '';

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-6xl bg-neutral-50">
      {/* ── Región de edición (≈60%) ── */}
      <div className="flex min-w-0 flex-1">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="/bioo-iso.png" alt="" className="h-7 w-7" onError={(e) => ((e.currentTarget.style.display = 'none'))} />
          <span className="text-lg font-extrabold tracking-tight">bioo</span>
        </div>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                section === id ? 'bg-bioo text-bioo-ink' : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-2 text-[11px] text-neutral-400">Hecho con ♥ en Chile 🇨🇱</div>
      </aside>

      {/* Editor central */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white/85 px-4 py-3 backdrop-blur">
          <span className="mr-auto truncate text-sm font-medium text-neutral-400">bioo.cl/<span className="text-neutral-600">{state.username}</span></span>
          {!user && (
            <button type="button" onClick={goLogin} className="text-sm font-semibold text-neutral-500 transition-colors hover:text-bioo-dark">Iniciar sesión</button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-xl bg-bioo px-4 py-2 text-sm font-bold text-bioo-ink transition-transform active:scale-95 disabled:opacity-60"
          >
            <Save size={15} /> {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Guardado ✓' : 'Guardar'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-32 pt-6 md:pb-10">
          <h1 className="mb-5 text-2xl font-bold tracking-tight">{sectionLabel}</h1>
          <SectionView />
        </div>
      </main>
      </div>

      {/* ── Visor (≈40%, md+) ── */}
      <aside className="hidden shrink-0 items-center justify-center border-l border-neutral-200 bg-neutral-100 p-6 md:flex md:w-[40%]">
        <PhoneFrame>
          <BioPreview state={state} />
        </PhoneFrame>
      </aside>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-6xl items-stretch justify-around border-t border-neutral-200 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium ${section === id ? 'text-bioo-dark' : 'text-neutral-400'}`}
          >
            <Icon size={20} /> {label}
          </button>
        ))}
      </nav>

      {/* FAB Vista Previa (mobile/tablet) */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_34px_-10px_rgba(0,0,0,0.55)] ring-1 ring-white/10 md:hidden"
      >
        <Eye size={18} /> Vista Previa
      </motion.button>

      <PreviewSheet open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <PhoneFrame embedded>
          <BioPreview state={state} />
        </PhoneFrame>
      </PreviewSheet>

      <Wizard open={showWizard} onClose={() => setShowWizard(false)} />
    </div>
  );
}
