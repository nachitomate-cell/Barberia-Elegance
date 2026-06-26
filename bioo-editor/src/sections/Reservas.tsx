// Reservas.tsx — Sección del editor con dos tabs:
//   • Configuración → servicios, horario semanal, bloqueos, reglas.
//   • Mis reservas  → lista en vivo de citas con acciones (WhatsApp,
//                     completar, cancelar).

import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock, Scissors, CalendarX, Settings, Plus, Trash2,
  Loader2, Check, AlertCircle, Power, MessageCircle, X as XIcon,
  CheckCircle2, ListChecks, Inbox, Phone, Sparkles, Zap, Rocket, Copy,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useEditor } from '../store';
import { Card, Field, inputBase } from '../ui';
import {
  loadReservasConfig, saveReservasConfig, nuevoServicioId, DIAS_LABEL,
  watchReservas, cancelarReserva, completarReserva, whatsappUrl,
  reservaTimestamp, formatearFechaCorta, formatearFechaLarga,
  watchReservasMeta,
  type ReservasConfig, type Franja, type Weekday, type Reserva,
  type ReservasMeta,
} from '../lib/reservas';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type Tab = 'config' | 'mis';

const DIAS_ORDEN: Weekday[] = [1, 2, 3, 4, 5, 6, 0]; // L-D

export default function Reservas(): JSX.Element {
  const { state } = useEditor();
  const username = state.username;
  const [tab, setTab] = useState<Tab>('config');

  // Suscripción al stream de reservas (también en pestaña Config, para el
  // badge "tienes X pendientes" en el tab). Si falla, queda en [].
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [reservasErr, setReservasErr] = useState(false);
  useEffect(() => {
    if (!username || username === 'tunombre') { setReservas([]); return; }
    const unsub = watchReservas(
      username,
      (rows) => { setReservas(rows); setReservasErr(false); },
      (e) => { console.error('[reservas] stream:', e); setReservasErr(true); },
    );
    return (): void => unsub();
  }, [username]);

  const pendientes = useMemo(
    () => reservas.filter((r) => r.estado === 'confirmada' && reservaTimestamp(r) >= startOfToday()).length,
    [reservas],
  );

  return (
    <div className="space-y-5">
      <TabBar tab={tab} onChange={setTab} pendientes={pendientes} />
      {tab === 'config'
        ? <ConfigView username={username} />
        : <MisReservasView reservas={reservas} err={reservasErr} username={username} />}
    </div>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────── */
function TabBar({
  tab, onChange, pendientes,
}: { tab: Tab; onChange: (t: Tab) => void; pendientes: number }): JSX.Element {
  const tabs: Array<{ id: Tab; label: string; Icon: typeof Settings; badge?: number }> = [
    { id: 'config', label: 'Configuración', Icon: Settings },
    { id: 'mis',    label: 'Mis reservas',  Icon: ListChecks, badge: pendientes },
  ];
  return (
    <div className="flex gap-1 rounded-2xl bg-neutral-100/70 p-1">
      {tabs.map(({ id, label, Icon, badge }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? 'bg-white text-[#15240b] shadow-sm' : 'text-neutral-500 hover:text-[#15240b]'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
            {badge != null && badge > 0 && (
              <span className={`ml-0.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                active ? 'bg-[#92c83a]/15 text-[#15240b]' : 'bg-neutral-200 text-neutral-600'
              }`}>{badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CONFIGURACIÓN
   ════════════════════════════════════════════════════════════════ */
type BioState = 'loading' | 'noHandle' | 'noBio' | 'wrongOwner' | 'ready';

function ConfigView({ username }: { username: string }): JSX.Element {
  const [cfg, setCfg] = useState<ReservasConfig | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [saveErrMsg, setSaveErrMsg] = useState<string>('');
  const [dirty, setDirty] = useState(false);

  // ── Gate: para escribir en /bios/{u}/reservasConfig las reglas exigen que
  // /bios/{u} EXISTA con uid = currentUser. Si todavía no se publica la bioo
  // (botón "Guardar página" arriba), cualquier save acá rebota con
  // permission-denied. Vigilamos en vivo para destrabar el gate sin recargar.
  const [bioState, setBioState] = useState<BioState>('loading');
  useEffect(() => {
    if (!username || username === 'tunombre') { setBioState('noHandle'); return; }

    let unsubBio: (() => void) | null = null;
    const subscribe = (): void => {
      const uid = auth.currentUser?.uid || null;
      if (!uid) { setBioState('loading'); return; }
      if (unsubBio) { unsubBio(); unsubBio = null; }
      unsubBio = onSnapshot(
        doc(db, 'bios', username),
        (snap) => {
          if (!snap.exists()) { setBioState('noBio'); return; }
          const docUid = snap.get('uid');
          setBioState(docUid === uid ? 'ready' : 'wrongOwner');
        },
        (e) => { console.error('[reservas] bio snapshot:', e); setBioState('noBio'); },
      );
    };
    subscribe();
    const unsubAuth = onAuthStateChanged(auth, subscribe);
    return (): void => {
      if (unsubBio) unsubBio();
      unsubAuth();
    };
  }, [username]);

  useEffect(() => {
    let alive = true;
    setLoadErr(false);
    setCfg(null);
    loadReservasConfig(username)
      .then((c) => { if (alive) { setCfg(c); setDirty(false); } })
      .catch((e: unknown) => {
        console.error('[reservas] error al cargar config:', e);
        if (alive) setLoadErr(true);
      });
    return (): void => { alive = false; };
  }, [username]);

  function patch(p: Partial<ReservasConfig>): void {
    setCfg((prev) => (prev ? { ...prev, ...p } : prev));
    setDirty(true);
    setStatus('idle');
    setSaveErrMsg('');
  }

  // Espejo de cfg para que el setTimeout siempre lea la última versión sin
  // capturar un valor obsoleto en el closure.
  const cfgRef = useRef<ReservasConfig | null>(null);
  cfgRef.current = cfg;

  // Auto-save con debounce 800 ms. Reemplaza la barra sticky de "Guardar"
  // (chocaba con el FAB Vista Previa). El indicador inline de arriba
  // muestra el estado (Guardando… / Guardado / Reintentar).
  useEffect(() => {
    if (!dirty || !cfg || bioState !== 'ready') return;
    const t = window.setTimeout(() => {
      const snapshot = cfgRef.current;
      if (!snapshot) return;
      setStatus('saving');
      setSaveErrMsg('');
      saveReservasConfig(username, snapshot)
        .then(() => {
          setStatus('saved');
          setDirty(false);
          window.setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
        })
        .catch((e: unknown) => {
          console.error('[reservas] error al guardar:', e);
          const code = (e as { code?: string })?.code || '';
          if (code === 'permission-denied') {
            setSaveErrMsg(
              'Para activar tus reservas primero tienes que publicar tu bioo. ' +
              'Toca "Guardar página" arriba a la derecha y vuelve acá.',
            );
          } else if (code === 'unauthenticated' || (e as Error)?.message === 'not-authenticated') {
            setSaveErrMsg('Tu sesión se cerró. Refresca la página e intenta de nuevo.');
          } else {
            setSaveErrMsg('No pudimos guardar. Verifica tu conexión e intenta otra vez.');
          }
          setStatus('error');
        });
    }, 800);
    return (): void => window.clearTimeout(t);
  }, [cfg, dirty, bioState, username]);

  if (loadErr) {
    return (
      <Card icon={AlertCircle} title="No pudimos cargar tu agenda">
        <p className="text-sm text-neutral-500">
          Refresca la página. Si el problema persiste, escríbenos desde la
          pestaña Compartir.
        </p>
      </Card>
    );
  }

  if (!cfg || bioState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (bioState === 'noHandle' || bioState === 'noBio') {
    return <PublicaPrimero variant={bioState} />;
  }
  if (bioState === 'wrongOwner') {
    return <CuentaDistinta />;
  }

  return (
    <div className="space-y-4">
      {/* Indicador discreto de auto-save (reemplaza la barra sticky que
          colisionaba con el FAB Vista Previa). */}
      <SaveStatusPill status={status} dirty={dirty} />

      <Card icon={Power} title="Activar reservas">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            Cuando esté activo, en tu Bioo aparecerá un botón <b>Reservar hora</b>{' '}
            para que tus clientes agenden directo.
          </p>
          <Toggle on={cfg.activo} onChange={(v) => patch({ activo: v })} />
        </div>
      </Card>

      <ServiciosCard cfg={cfg} patch={patch} />
      <HorarioCard cfg={cfg} patch={patch} />
      <BloqueosCard cfg={cfg} patch={patch} />
      <AvanzadoCard cfg={cfg} patch={patch} />

      {saveErrMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="leading-snug">{saveErrMsg}</span>
        </div>
      )}
    </div>
  );
}

/** Pill discreto que sustituye a la barra sticky. No fixed/sticky → ya no
 *  colisiona con el FAB Vista Previa. Muestra estado del auto-save. */
function SaveStatusPill({ status, dirty }: { status: SaveStatus; dirty: boolean }): JSX.Element | null {
  let label = '';
  let icon: JSX.Element | null = null;
  let tone = 'text-neutral-400';
  if (status === 'saving') {
    label = 'Guardando…';
    icon = <Loader2 size={12} className="animate-spin" />;
  } else if (status === 'saved') {
    label = 'Guardado';
    icon = <Check size={12} />;
    tone = 'text-[#52780f]';
  } else if (status === 'error') {
    label = 'Reintentando…';
    icon = <AlertCircle size={12} />;
    tone = 'text-red-500';
  } else if (dirty) {
    label = 'Cambios pendientes';
    icon = <div className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />;
    tone = 'text-amber-700';
  } else {
    return null;
  }
  return (
    <div className={`flex items-center justify-end gap-1.5 text-[11px] font-semibold ${tone}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

/* ── Gates: cuando aún no es posible escribir en /bios/{u}/reservasConfig ── */
function PublicaPrimero({ variant }: { variant: 'noHandle' | 'noBio' }): JSX.Element {
  const titulo = variant === 'noHandle'
    ? 'Primero elige tu nombre de bioo'
    : 'Primero publica tu bioo';
  const cuerpo = variant === 'noHandle'
    ? 'Necesitamos saber qué nombre quieres en bioo.cl/tu-nombre antes de activar tus reservas. Vuelve a Enlaces o Perfil y guarda tu página para reservar tu URL.'
    : 'Para activar reservas necesitamos tu página creada. Toca el botón "Guardar página" arriba a la derecha para publicarla — solo toma un segundo. Cuando vuelvas, este aviso se va a esfumar solo.';
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#92c83a]/15 text-[#52780f]">
          <Rocket size={26} />
        </span>
        <p className="text-base font-bold text-[#15240b]">{titulo}</p>
        <p className="max-w-[40ch] text-sm leading-relaxed text-neutral-500">
          {cuerpo}
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <Sparkles size={13} /> Solo dura mientras configuras
        </div>
      </div>
    </Card>
  );
}

function CuentaDistinta(): JSX.Element {
  return (
    <Card icon={AlertCircle} title="Esta bioo no es de esta cuenta">
      <p className="text-sm leading-relaxed text-neutral-500">
        El handle que estás editando pertenece a otra cuenta. Inicia sesión con
        el email original del dueño desde el botón "Iniciar sesión" arriba para
        gestionar las reservas, o contáctanos si necesitas recuperar el acceso.
      </p>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════
   MIS RESERVAS
   ════════════════════════════════════════════════════════════════ */
type Bucket = 'hoy' | 'proximas' | 'pasadas';

function MisReservasView({
  reservas, err, username,
}: { reservas: Reserva[]; err: boolean; username: string }): JSX.Element {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Reserva | null>(null);
  const [actionErr, setActionErr] = useState<string>('');

  // Contador del free tier (lo escribe la CF avisarNuevaReservaBioo).
  const [meta, setMeta] = useState<ReservasMeta | null>(null);
  useEffect(() => {
    if (!username || username === 'tunombre') { setMeta(null); return; }
    const unsub = watchReservasMeta(username, setMeta, () => setMeta(null));
    return (): void => unsub();
  }, [username]);

  const buckets = useMemo(() => agruparPorBucket(reservas), [reservas]);

  async function onComplete(r: Reserva): Promise<void> {
    setBusyId(r.id); setActionErr('');
    try { await completarReserva(username, r.id); }
    catch (e) { console.error(e); setActionErr('No se pudo marcar como completada.'); }
    finally { setBusyId(null); }
  }
  async function onCancel(r: Reserva): Promise<void> {
    setBusyId(r.id); setActionErr('');
    try { await cancelarReserva(username, r); setConfirmCancel(null); }
    catch (e) { console.error(e); setActionErr('No se pudo cancelar la reserva.'); }
    finally { setBusyId(null); }
  }

  if (err) {
    return (
      <Card icon={AlertCircle} title="No pudimos cargar tus reservas">
        <p className="text-sm text-neutral-500">
          Verifica tu conexión y refresca. Si recién activaste el módulo, asegúrate de
          haber guardado la configuración.
        </p>
      </Card>
    );
  }

  if (!reservas.length) {
    return (
      <div className="space-y-5">
        <FreeTierBanner meta={meta} />
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#92c83a]/12 text-[#15240b]">
              <Inbox size={26} />
            </span>
            <p className="text-base font-bold text-[#15240b]">Aún no tienes reservas</p>
            <p className="max-w-[34ch] text-sm text-neutral-500">
              Cuando alguien reserve en tu Bioo, verás aquí su cita con un solo clic para
              confirmar por WhatsApp.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FreeTierBanner meta={meta} />

      {actionErr && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle size={15} /> {actionErr}
        </div>
      )}

      <BucketSection bucket="hoy" rows={buckets.hoy} busyId={busyId}
        onComplete={onComplete} onCancelAsk={(r) => setConfirmCancel(r)} />
      <BucketSection bucket="proximas" rows={buckets.proximas} busyId={busyId}
        onComplete={onComplete} onCancelAsk={(r) => setConfirmCancel(r)} />
      <BucketSection bucket="pasadas" rows={buckets.pasadas} busyId={busyId}
        onComplete={onComplete} onCancelAsk={(r) => setConfirmCancel(r)} />

      <ConfirmModal
        reserva={confirmCancel}
        busy={!!busyId && busyId === confirmCancel?.id}
        onClose={() => setConfirmCancel(null)}
        onConfirm={(r) => { void onCancel(r); }}
      />
    </div>
  );
}

/* ── Stat del mes en curso (sin framing de cap — el Free es ilimitado) ─── */
function FreeTierBanner({ meta }: { meta: ReservasMeta | null }): JSX.Element | null {
  if (!meta) return null;
  const usadas = Math.max(0, meta.usadasMes);
  const total  = Math.max(0, meta.totalHistorico);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(243,250,230,0.7)',
        boxShadow: 'inset 0 0 0 1px rgba(146,200,58,0.25)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{
            background: '#fff', color: '#52780f',
            boxShadow: 'inset 0 0 0 1px rgba(146,200,58,0.25)',
          }}
        >
          <Zap size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#15240b]">
              {usadas} {usadas === 1 ? 'reserva' : 'reservas'} este mes
            </p>
            <span className="rounded-full bg-[#92c83a]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#15240b]">
              Plan gratis
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
            Reservas ilimitadas, recordatorios por email al cliente y agenda integrada en tu bioo.
            {total > usadas ? ` Total histórico: ${total}.` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

function BucketSection({
  bucket, rows, busyId, onComplete, onCancelAsk,
}: {
  bucket: Bucket;
  rows: Reserva[];
  busyId: string | null;
  onComplete: (r: Reserva) => void;
  onCancelAsk: (r: Reserva) => void;
}): JSX.Element | null {
  if (!rows.length) return null;
  const labels: Record<Bucket, { title: string; hint?: string }> = {
    hoy:      { title: `Hoy · ${rows.length}` },
    proximas: { title: `Próximas · ${rows.length}` },
    pasadas:  { title: `Pasadas · ${rows.length}`, hint: 'Historial reciente' },
  };
  const { title, hint } = labels[bucket];
  return (
    <Card icon={bucket === 'pasadas' ? CheckCircle2 : CalendarClock} title={title} hint={hint}>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <ReservaItem
            key={r.id}
            r={r}
            busy={busyId === r.id}
            onComplete={() => onComplete(r)}
            onCancel={() => onCancelAsk(r)}
            pasada={bucket === 'pasadas'}
          />
        ))}
      </ul>
    </Card>
  );
}

function ReservaItem({
  r, busy, onComplete, onCancel, pasada,
}: {
  r: Reserva;
  busy: boolean;
  onComplete: () => void;
  onCancel: () => void;
  pasada: boolean;
}): JSX.Element {
  const cancelada  = r.estado === 'cancelada';
  const completada = r.estado === 'completada';
  const wa = whatsappUrl(r);
  const tel = r.cliente.whatsapp.replace(/[^\d+]/g, '');

  return (
    <li
      className={`rounded-2xl border p-3.5 transition-opacity ${
        cancelada ? 'border-neutral-200 bg-neutral-50/80 opacity-60'
                  : completada ? 'border-emerald-100 bg-emerald-50/40'
                  : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-bold text-[#15240b]">{r.cliente.nombre}</p>
            <EstadoTag estado={r.estado} />
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">
            {r.servicioNombre} · {r.duracion} min
            {r.precio ? ` · $${r.precio.toLocaleString('es-CL')}` : ''}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <CalendarClock size={12} /> {formatearFechaCorta(r.fecha)} · {r.hora}
          </p>
        </div>
      </div>

      {!completada && !cancelada && (
        <div className="mt-3 flex flex-wrap gap-2">
          {wa && (
            <a
              href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition-transform active:scale-95"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {tel && (
            <a
              href={`tel:${tel}`}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              title={tel}
            >
              <Phone size={13} /> Llamar
            </a>
          )}
          {!pasada && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <XIcon size={13} /> Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 ${
              pasada ? '' : 'ml-0'
            }`}
            style={{ background: '#15240b', color: '#fff' }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Completada
          </button>
        </div>
      )}
    </li>
  );
}

function EstadoTag({ estado }: { estado: Reserva['estado'] }): JSX.Element | null {
  if (estado === 'confirmada') return null;
  if (estado === 'completada') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
        <Check size={10} /> Completada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
      Cancelada
    </span>
  );
}

function ConfirmModal({
  reserva, busy, onClose, onConfirm,
}: {
  reserva: Reserva | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (r: Reserva) => void;
}): JSX.Element | null {
  if (!reserva) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={20} />
          </span>
          <h3 className="text-base font-bold text-[#15240b]">Cancelar reserva</h3>
        </div>
        <p className="text-sm leading-relaxed text-neutral-500">
          Vas a cancelar la cita de <b className="text-neutral-700">{reserva.cliente.nombre}</b> el{' '}
          <b className="text-neutral-700">{formatearFechaLarga(reserva.fecha)} a las {reserva.hora}</b>.
          La hora vuelve a quedar disponible para que otra persona reserve.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Mantener
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reserva)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <XIcon size={14} />}
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */
function startOfToday(): number {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfToday(): number {
  const d = new Date(); d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function agruparPorBucket(reservas: Reserva[]): {
  hoy: Reserva[]; proximas: Reserva[]; pasadas: Reserva[];
} {
  const hoyIni = startOfToday();
  const hoyFin = endOfToday();
  const PASADAS_MAX = 20; // no inundar la UI con todo el historial

  const hoy: Reserva[] = [];
  const proximas: Reserva[] = [];
  const pasadas: Reserva[] = [];
  for (const r of reservas) {
    const ts = reservaTimestamp(r);
    if (ts >= hoyIni && ts <= hoyFin) hoy.push(r);
    else if (ts > hoyFin) proximas.push(r);
    else pasadas.push(r);
  }
  // Las pasadas vienen en asc por slotKey → invertimos para mostrar las más
  // recientes primero, y cortamos para no saturar.
  pasadas.reverse();
  return { hoy, proximas, pasadas: pasadas.slice(0, PASADAS_MAX) };
}

/* ════════════════════════════════════════════════════════════════
   Sub-cards de Configuración (sin cambios respecto al paso 1)
   ════════════════════════════════════════════════════════════════ */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors touch-manipulation ${on ? 'bg-[#92c83a]' : 'bg-neutral-300'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ServiciosCard({
  cfg, patch,
}: { cfg: ReservasConfig; patch: (p: Partial<ReservasConfig>) => void }): JSX.Element {
  function agregar(): void {
    patch({
      servicios: [
        ...cfg.servicios,
        { id: nuevoServicioId(), nombre: '', duracion: 30 },
      ],
    });
  }
  function actualizar(id: string, p: Partial<ReservasConfig['servicios'][number]>): void {
    patch({ servicios: cfg.servicios.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  }
  function eliminar(id: string): void {
    patch({ servicios: cfg.servicios.filter((s) => s.id !== id) });
  }

  return (
    <Card icon={Scissors} title="Servicios" hint="Lo que ofreces y cuánto dura cada cita.">
      {cfg.servicios.length === 0 ? (
        <EmptyHint texto="Aún no agregas servicios. Empieza con tu corte clásico." />
      ) : (
        <ul className="space-y-2.5">
          {cfg.servicios.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-3"
            >
              <div className="grid grid-cols-12 gap-2.5">
                <input
                  className={`${inputBase} col-span-12 sm:col-span-6`}
                  placeholder="Nombre (p. ej. Corte clásico)"
                  value={s.nombre}
                  onChange={(e) => actualizar(s.id, { nombre: e.target.value })}
                />
                <div className="col-span-6 sm:col-span-3">
                  <NumberInput
                    value={s.duracion}
                    onChange={(v) => actualizar(s.id, { duracion: v })}
                    min={5}
                    max={480}
                    step={5}
                    suffix="min"
                  />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <NumberInput
                    value={s.precio ?? 0}
                    onChange={(v) => actualizar(s.id, { precio: v > 0 ? v : undefined })}
                    min={0}
                    max={1000000}
                    step={500}
                    prefix="$"
                    placeholder="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => eliminar(s.id)}
                  className="col-span-1 grid h-10 w-10 place-items-center self-center justify-self-center rounded-xl text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 active:bg-red-100"
                  aria-label="Eliminar servicio"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={agregar}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-500 transition-colors hover:border-bioo hover:text-bioo-dark"
      >
        <Plus size={15} /> Agregar servicio
      </button>
    </Card>
  );
}

/** Estilo "seamless" de inputs tipo hora (bg gris suave, sin borde duro, ring
 *  verde al focus). Reutilizado por todas las franjas del horario. */
const TIME_INPUT_CLASS =
  'flex-1 bg-neutral-100/70 border border-transparent rounded-xl px-4 py-2.5 ' +
  'text-[#15240b] font-medium text-sm focus:bg-white focus:border-[#92c83a] ' +
  'focus:ring-2 focus:ring-[#92c83a]/10 outline-none transition-all';

function HorarioCard({
  cfg, patch,
}: { cfg: ReservasConfig; patch: (p: Partial<ReservasConfig>) => void }): JSX.Element {
  function setDia(d: Weekday, franjas: Franja[]): void {
    patch({ horario: { ...cfg.horario, [d]: franjas } });
  }
  function toggleDia(d: Weekday): void {
    const abierto = cfg.horario[d].length > 0;
    setDia(d, abierto ? [] : [{ desde: '10:00', hasta: '19:00' }]);
  }
  function agregarFranja(d: Weekday): void {
    setDia(d, [...cfg.horario[d], { desde: '15:00', hasta: '19:00' }]);
  }
  function actualizarFranja(d: Weekday, i: number, p: Partial<Franja>): void {
    setDia(
      d,
      cfg.horario[d].map((f, idx) => (idx === i ? { ...f, ...p } : f)),
    );
  }
  function eliminarFranja(d: Weekday, i: number): void {
    setDia(d, cfg.horario[d].filter((_, idx) => idx !== i));
  }
  /** Copia las franjas del día `desde` a todos los demás días que tengan
   *  horario activo. Días en off (closed) NO se pisan automáticamente. */
  function copiarATodos(desde: Weekday): void {
    const franjasOrigen = cfg.horario[desde];
    if (!franjasOrigen.length) return;
    const nuevoHorario = { ...cfg.horario };
    ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).forEach((d) => {
      if (d === desde) return;
      // Solo replicamos a días que ya están "abiertos". Si el barbero tiene
      // domingos cerrados, copiar L-V no los activa por arte de magia.
      if (cfg.horario[d].length > 0) {
        nuevoHorario[d] = franjasOrigen.map((f) => ({ ...f }));
      }
    });
    patch({ horario: nuevoHorario });
  }

  return (
    <div>
      {/* Header de sección (sustituye al Card wrapper para ahorrar padding
          vertical y dar más respiro a las Bento cards). */}
      <div className="mb-3 flex items-center gap-2.5">
        <CalendarClock size={18} className="text-[#92c83a]" />
        <h3 className="text-base font-bold text-[#15240b]">Horario semanal</h3>
      </div>
      <p className="-mt-2 mb-3 text-xs text-neutral-400">
        Días y horas en que aceptas clientes.
      </p>

      <div>
        {DIAS_ORDEN.map((d) => {
          const franjas = cfg.horario[d];
          const abierto = franjas.length > 0;
          return (
            <div
              key={d}
              className="bg-white rounded-[24px] shadow-sm ring-1 ring-black/[0.03] mb-4 overflow-hidden"
            >
              {/* Header del día: justify-between fuerza al toggle al borde
                  interno derecho. w-full evita que se salga por overflow. */}
              <div
                className={`flex items-center justify-between w-full px-4 pt-4 ${abierto ? 'pb-3' : 'pb-4'}`}
              >
                <span
                  className={`text-[15px] font-bold tracking-tight ${abierto ? 'text-[#15240b]' : 'text-neutral-400'}`}
                >
                  {DIAS_LABEL[d]}
                </span>
                <Toggle on={abierto} onChange={() => toggleDia(d)} />
              </div>

              {/* Cuerpo: collapse animado cuando el día está apagado. */}
              <AnimatePresence initial={false}>
                {abierto && (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-2 px-4 pb-4">
                      {franjas.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={f.desde}
                            onChange={(e) => actualizarFranja(d, i, { desde: e.target.value })}
                            className={TIME_INPUT_CLASS}
                          />
                          <span className="text-neutral-300">—</span>
                          <input
                            type="time"
                            value={f.hasta}
                            onChange={(e) => actualizarFranja(d, i, { hasta: e.target.value })}
                            className={TIME_INPUT_CLASS}
                          />
                          {franjas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => eliminarFranja(d, i)}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              aria-label="Eliminar franja"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Acciones inline: agregar franja + copiar a todos
                          (reemplaza la barra flotante de save / acciones). */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => agregarFranja(d)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#52780f] transition-opacity hover:opacity-80"
                        >
                          <Plus size={12} /> Agregar franja
                        </button>
                        <button
                          type="button"
                          onClick={() => copiarATodos(d)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#52780f] transition-opacity hover:opacity-80"
                          title="Copia estas franjas a los demás días que ya estén activos"
                        >
                          <Copy size={11} /> Copiar a todos los días
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BloqueosCard({
  cfg, patch,
}: { cfg: ReservasConfig; patch: (p: Partial<ReservasConfig>) => void }): JSX.Element {
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');

  function agregar(): void {
    if (!fecha) return;
    if (cfg.bloqueos.some((b) => b.fecha === fecha)) { setFecha(''); setMotivo(''); return; }
    patch({
      bloqueos: [...cfg.bloqueos, { fecha, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) }]
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    });
    setFecha(''); setMotivo('');
  }
  function eliminar(f: string): void {
    patch({ bloqueos: cfg.bloqueos.filter((b) => b.fecha !== f) });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card icon={CalendarX} title="Días bloqueados" hint="Vacaciones, feriados o cualquier día que no quieras atender.">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={fecha}
          min={today}
          onChange={(e) => setFecha(e.target.value)}
          className={`${inputBase} flex-1 min-w-[160px] text-sm`}
        />
        <input
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (opcional)"
          className={`${inputBase} flex-[2] min-w-[160px] text-sm`}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={!fecha}
          className="flex items-center gap-1 rounded-xl bg-[#15240b] px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          <Plus size={14} /> Bloquear
        </button>
      </div>

      {cfg.bloqueos.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {cfg.bloqueos.map((b) => (
            <li
              key={b.fecha}
              className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-[#15240b]">{formatearFechaCorta(b.fecha)}</span>
              {b.motivo && <span className="truncate text-neutral-500">· {b.motivo}</span>}
              <button
                type="button"
                onClick={() => eliminar(b.fecha)}
                className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 active:bg-red-100"
                aria-label="Quitar"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AvanzadoCard({
  cfg, patch,
}: { cfg: ReservasConfig; patch: (p: Partial<ReservasConfig>) => void }): JSX.Element {
  return (
    <Card icon={Settings} title="Reglas de reserva" hint="Cómo aceptas las citas que llegan online.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Descanso entre citas">
          <NumberInput
            value={cfg.bufferMin}
            onChange={(v) => patch({ bufferMin: v })}
            min={0} max={120} step={5}
            suffix="min"
          />
        </Field>
        <Field label="Anticipación mínima">
          <NumberInput
            value={cfg.antelacionMinHoras}
            onChange={(v) => patch({ antelacionMinHoras: v })}
            min={0} max={72} step={1}
            suffix="h"
          />
        </Field>
        <Field label="Ventana de reserva">
          <NumberInput
            value={cfg.ventanaDias}
            onChange={(v) => patch({ ventanaDias: v })}
            min={1} max={120} step={1}
            suffix="días"
          />
        </Field>
      </div>
    </Card>
  );
}

function NumberInput({
  value, onChange, min, max, step, suffix, prefix, placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
  suffix?: string; prefix?: string; placeholder?: string;
}): JSX.Element {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
          {prefix}
        </span>
      )}
      <input
        type="number"
        value={value || ''}
        placeholder={placeholder}
        min={min} max={max} step={step}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={`${inputBase} text-sm ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

function EmptyHint({ texto }: { texto: string }): JSX.Element {
  return (
    <div className="rounded-2xl border-2 border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
      {texto}
    </div>
  );
}
