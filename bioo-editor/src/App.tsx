import { useEffect, useRef, useState, type ComponentType } from 'react';
import { onAuthStateChanged, signInWithCustomToken, type User } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Link2, User as UserIcon, Palette, Share2, Inbox, Megaphone, CircleDollarSign, Eye, Save, Sparkles, type LucideIcon } from 'lucide-react';
import { auth } from './lib/firebase';
import { saveBio, loadUserBio } from './lib/bio';
import { ensureAnonymousSession, completePendingRedirect } from './lib/auth';
import { mintRandomHandle } from './lib/mintHandle';
import { FONTS, loadFont } from './lib/theme';
import type { FontKey } from './types';
import ClaimModal from './components/ClaimModal';
import PublishedModal from './components/PublishedModal';
import { useEditor } from './store';
import Links from './sections/Links';
import Profile from './sections/Profile';
import Appearance from './sections/Appearance';
import Share from './sections/Share';
import Leads from './sections/Leads';
import Marketing from './sections/Marketing';
import Sales from './sections/Sales';
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
  { id: 'sales', label: 'Ventas', Icon: CircleDollarSign },
  { id: 'marketing', label: 'Marketing', Icon: Megaphone },
  { id: 'share', label: 'Compartir', Icon: Share2 },
];

const VIEWS: Record<SectionId, ComponentType> = {
  links: Links,
  profile: Profile,
  design: Appearance,
  leads: Leads,
  sales: Sales,
  marketing: Marketing,
  share: Share,
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function App(): JSX.Element {
  const { state, dispatch } = useEditor();
  // uid de la última bio cargada — al fusionar/cambiar de cuenta el uid cambia y
  // hay que recargar; al fusionar un anónimo el uid se mantiene (no recargamos).
  const loadedUidRef = useRef<string | null>(null);
  // Evita iniciar sesión anónima más de una vez, y no la dispara si llegamos por SSO.
  const anonTriedRef = useRef(false);
  const ssoFlowRef = useRef<boolean>(new URLSearchParams(window.location.search).has('token'));
  const [section, setSection] = useState<SectionId>('links');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [claimOpen, setClaimOpen] = useState(false);
  // Modal post-publicar (sharing kit). `mintedNow` = primer publish desde
  // anónimo (acabamos de mintear el handle). Cambia el copy a celebración.
  const [publishedOpen, setPublishedOpen] = useState(false);
  const [mintedNow, setMintedNow] = useState(false);
  // SSO white-glove: si llega ?token=<customToken> mostramos un loader mientras
  // iniciamos sesión, para no parpadear la pantalla de login.
  const [ssoBusy, setSsoBusy] = useState<boolean>(
    () => new URLSearchParams(window.location.search).has('token'),
  );

  // Espejo del estado para los flujos asíncronos (redirect de Google, guardado
  // diferido) que no deben capturar un `state` obsoleto del render.
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Recepción del token de SSO (?token=<customToken>) ──────────────────────
  // Lo envía el partner (Club Patio) para entrar con 1 clic. Tras autenticar,
  // limpiamos el token de la URL (seguridad) y dejamos al usuario en el editor.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;
    void signInWithCustomToken(auth, token)
      .catch((err: unknown) => { console.error('[SSO] token inválido o expirado:', err); })
      .finally(() => {
        params.delete('token');
        const qs = params.toString();
        const clean = window.location.pathname + (qs ? `?${qs}` : '');
        window.history.replaceState({}, '', clean);
        setSsoBusy(false);
      });
  }, []);

  // ── Lazy Registration: handle entrante + redirect de Google pendiente ───────
  // El handle elegido en la landing llega por ?u=<handle> (o queda en localStorage);
  // lo fijamos como username del borrador. La sesión anónima se inicia en el
  // listener de auth (más abajo), una vez restaurada la sesión persistida — así no
  // pisamos a un usuario ya logueado por una carrera de inicialización.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token')) return; // el flujo SSO maneja su propia sesión

    let handle = (params.get('u') || '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (handle) {
      params.delete('u');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    // Respaldo: si no viene en la URL, usamos el handle guardado en la landing,
    // pero solo si el borrador sigue en el placeholder (no pisar uno en curso).
    if (!handle && stateRef.current.username === 'tunombre') {
      try { handle = (localStorage.getItem('bioo_intent_handle') || '').toLowerCase().replace(/[^a-z0-9._-]/g, ''); } catch { /* noop */ }
    }
    if (handle.length >= 3 && handle.length <= 30) {
      dispatch({ type: 'setUsername', value: handle });
      try { localStorage.setItem('bioo_intent_handle', handle); } catch { /* noop */ }
    }

    void (async () => {
      // Si volvemos de un redirect de Google (móvil/PWA) completamos el upgrade.
      const redirect = await completePendingRedirect();
      if (redirect?.ok && redirect.mode === 'linked') { void publishDraft(); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showWizard, setShowWizard] = useState<boolean>(() => {
    try { if (localStorage.getItem('bioo_onboarded')) return false; } catch { /* noop */ }
    return state.blocks.length === 0 && !state.profile.titulo.trim();
  });

  // Precarga TODAS las fuentes al abrir el editor. Sin esto, el primer click
  // a una fuente custom muestra el fallback unos cientos de ms (lo que parece
  // "no cambia"). Cargarlas al montar el shell ya las deja calientes.
  useEffect(() => {
    const keys = Object.keys(FONTS) as FontKey[];
    keys.forEach(loadFont);
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        // Cargamos la bio guardada cuando cambia el uid (login, o cambio a una
        // cuenta existente al fusionar). Los anónimos sin bio devuelven null y
        // conservan el borrador local. NO recargamos si el uid no cambió (p. ej.
        // al fusionar un anónimo: mantiene su diseño en curso).
        if (u && u.uid !== loadedUidRef.current) {
          loadedUidRef.current = u.uid;
          loadUserBio(u.uid)
            .then((bio) => { if (bio) dispatch({ type: 'load', state: bio }); })
            .catch(() => {});
        }
        // Sin usuario tras restaurar la sesión persistida → iniciamos sesión
        // anónima (Lazy Registration), salvo que estemos en el flujo SSO. Aquí ya
        // es seguro: si había un usuario logueado, este callback lo habría traído.
        if (!u) {
          loadedUidRef.current = null;
          if (!ssoFlowRef.current && !anonTriedRef.current) {
            anonTriedRef.current = true;
            void ensureAnonymousSession();
          }
        }
      }),
    [dispatch],
  );

  const goLogin = (): void => { window.location.href = '/registro?modo=login'; };

  /** Publica el borrador actual en Firestore (reclama el handle). Usa stateRef
   *  para no depender del `state` capturado en closures asíncronos. */
  const publishDraft = async (): Promise<void> => {
    setStatus('saving');
    try {
      await saveBio(stateRef.current);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('[bioo] error al guardar:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  /** Viralidad-first: cualquier usuario (incluso anónimo) puede publicar al
   *  toque. Si todavía tiene el placeholder `tunombre`, le minteamos un handle
   *  random tipo `k7mp9` ANTES de guardar. El registro queda como upgrade
   *  opcional ("quiero `bioo.cl/minombre`"), no como muro. */
  const handleSave = async (): Promise<void> => {
    // Si no hay sesión (anon deshabilitado en Firebase), reintentamos antes
    // de mandar al login — el flujo gratuito no debería caer ahí casi nunca.
    if (!auth.currentUser) {
      await ensureAnonymousSession();
      if (!auth.currentUser) { setClaimOpen(true); return; }
    }
    setStatus('saving');
    let justMinted = false;
    try {
      // Auto-mint si seguimos en placeholder. Lo hacemos UNA vez por sesión:
      // tras el primer publish el username queda fijo y se reusa al editar.
      if (stateRef.current.username === 'tunombre') {
        const minted = await mintRandomHandle();
        dispatch({ type: 'setUsername', value: minted });
        // dispatch es async-ish: forzamos el username en el state que vamos a publicar.
        stateRef.current = { ...stateRef.current, username: minted };
        try { localStorage.setItem('bioo_intent_handle', minted); } catch { /* noop */ }
        justMinted = true;
      }
      await saveBio(stateRef.current);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
      // Sharing kit: SIEMPRE al publicar. mintedNow controla el copy
      // ("Tu bio está al aire" vs "Comparte tu bioo") y el confeti del header.
      setMintedNow(justMinted);
      setPublishedOpen(true);
    } catch (err) {
      console.error('[bioo] error al guardar:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  /** Resultado del modal de registro/fusión.
   *  - 'linked'   → cuenta nueva (mismo uid): publicamos el borrador recién hecho.
   *  - 'switched' → ya existía una cuenta: onAuthStateChanged cargará su bio. */
  const handleUpgraded = (mode: 'linked' | 'switched'): void => {
    setClaimOpen(false);
    if (mode === 'linked') {
      void publishDraft();
    } else {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const isAnon = !user || user.isAnonymous;

  const SectionView = VIEWS[section];
  const sectionLabel = SECTIONS.find((s) => s.id === section)?.label ?? '';

  if (ssoBusy) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
          <p className="text-sm font-semibold text-neutral-500">Conectando tu cuenta…</p>
        </div>
      </div>
    );
  }

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
          {isAnon && (
            <button type="button" onClick={goLogin} className="hidden text-sm font-semibold text-neutral-500 transition-colors hover:text-bioo-dark sm:block">Iniciar sesión</button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-xl bg-bioo px-4 py-2 text-sm font-bold text-bioo-ink transition-transform active:scale-95 disabled:opacity-60"
          >
            <Save size={15} /> {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Guardado ✓' : isAnon ? 'Guardar página' : 'Guardar'}
          </button>
        </header>

        {/* Banner de upgrade — solo aparece DESPUÉS del primer publish (cuando
            el username ya no es el placeholder). Antes de publicar no molestamos:
            que el usuario diseñe sin friction. */}
        {isAnon && state.username !== 'tunombre' && (
          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="flex w-full items-center gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-left transition-colors hover:bg-amber-100"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-200/70 text-amber-700">
              <Sparkles size={15} />
            </span>
            <span className="min-w-0 flex-1 text-xs font-medium leading-tight text-amber-900">
              Tu página está en <b>bioo.cl/{state.username}</b>. Regístrate para elegir tu URL y conservarla.
            </span>
            <span className="shrink-0 rounded-lg bg-[#15240b] px-3 py-1.5 text-xs font-bold text-white">
              Elegir URL
            </span>
          </button>
        )}

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

      {/* Bottom nav (mobile) — carrusel horizontal, anti-aplastamiento */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 overflow-x-auto overscroll-x-contain snap-x snap-mandatory border-t border-neutral-200 bg-white/90 px-4 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
        {SECTIONS.map(({ id, label, Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className="flex min-w-[64px] shrink-0 snap-center flex-col items-center justify-center gap-1 py-1"
            >
              <span className={`rounded-full p-1.5 transition-colors ${active ? 'bg-[#92c83a]/15 text-[#15240b]' : 'text-neutral-400'}`}>
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <span className={`text-[10px] tracking-wide ${active ? 'font-semibold text-[#15240b]' : 'text-neutral-400'}`}>{label}</span>
            </button>
          );
        })}
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
        {/* A pantalla completa (el sheet ES el teléfono) → copia fiel de u.html */}
        <BioPreview state={state} />
      </PreviewSheet>

      <Wizard open={showWizard} onClose={() => setShowWizard(false)} />

      <ClaimModal
        isOpen={claimOpen}
        onClose={() => setClaimOpen(false)}
        username={state.username}
        onUpgraded={handleUpgraded}
      />

      <PublishedModal
        isOpen={publishedOpen}
        onClose={() => setPublishedOpen(false)}
        username={state.username}
        mintedNow={mintedNow}
      />
    </div>
  );
}
