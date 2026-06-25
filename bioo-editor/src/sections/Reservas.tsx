// Reservas.tsx — Sección del editor con dos tabs:
//   • Configuración → servicios, horario semanal, bloqueos, reglas.
//   • Mis reservas  → lista en vivo de citas con acciones (WhatsApp,
//                     completar, cancelar).

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock, Scissors, CalendarX, Settings, Plus, Trash2,
  Loader2, Check, AlertCircle, Power, MessageCircle, X as XIcon,
  CheckCircle2, ListChecks, Inbox, Phone, Sparkles, Zap,
} from 'lucide-react';
import { useEditor } from '../store';
import { Card, Field, inputBase } from '../ui';
import {
  loadReservasConfig, saveReservasConfig, nuevoServicioId, DIAS_LABEL,
  watchReservas, cancelarReserva, completarReserva, whatsappUrl,
  reservaTimestamp, formatearFechaCorta, formatearFechaLarga,
  watchReservasMeta, RESERVAS_FREE_LIMIT,
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
function ConfigView({ username }: { username: string }): JSX.Element {
  const [cfg, setCfg] = useState<ReservasConfig | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [dirty, setDirty] = useState(false);

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
  }

  async function handleSave(): Promise<void> {
    if (!cfg) return;
    setStatus('saving');
    try {
      await saveReservasConfig(username, cfg);
      setStatus('saved');
      setDirty(false);
      setTimeout(() => setStatus('idle'), 2200);
    } catch (e) {
      console.error('[reservas] error al guardar:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  }

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

  if (!cfg) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Barra de guardado sticky — en móvil se eleva por encima del bottom-nav */}
      <div
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        className="sticky z-10 flex items-center justify-end gap-3 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] md:!bottom-4"
      >
        <span className="mr-auto pl-2 text-xs text-neutral-400">
          {dirty ? 'Cambios sin guardar' : status === 'saved' ? '' : 'Todo al día'}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving' || !dirty}
          className="flex items-center gap-2 rounded-xl bg-bioo px-4 py-2.5 text-sm font-bold text-bioo-ink transition-transform active:scale-95 disabled:opacity-50"
        >
          {status === 'saving'
            ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
            : status === 'saved'
              ? <><Check size={15} /> Guardado</>
              : status === 'error'
                ? <><AlertCircle size={15} /> Reintentar</>
                : 'Guardar cambios'}
        </button>
      </div>
    </div>
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

/* ── Banner del free tier (uso del mes + nudge de upgrade) ──────── */
function FreeTierBanner({ meta }: { meta: ReservasMeta | null }): JSX.Element | null {
  if (!meta) return null;
  const usadas = Math.max(0, Math.min(meta.usadasMes, RESERVAS_FREE_LIMIT * 2));
  const restantes = Math.max(0, RESERVAS_FREE_LIMIT - usadas);
  const pct = Math.min(100, Math.round((usadas / RESERVAS_FREE_LIMIT) * 100));

  // Estado visual según uso. El "límite" no bloquea — solo invita a upgrade.
  let theme: { ring: string; bg: string; bar: string; ico: string; tag: string };
  let title: string;
  let body: string;
  if (usadas >= RESERVAS_FREE_LIMIT) {
    theme = {
      ring: 'rgba(239,68,68,0.25)', bg: 'rgba(254,242,242,0.85)',
      bar: '#ef4444', ico: '#b91c1c', tag: 'bg-red-100 text-red-700',
    };
    title = `Llegaste al límite del plan gratis (${RESERVAS_FREE_LIMIT}/mes)`;
    body  = 'Seguiremos recibiendo tus reservas con normalidad este mes; sube a Premium para asegurar uso ilimitado.';
  } else if (pct >= 80) {
    theme = {
      ring: 'rgba(217,119,6,0.22)', bg: 'rgba(255,251,235,0.95)',
      bar: '#f59e0b', ico: '#b45309', tag: 'bg-amber-100 text-amber-700',
    };
    title = `Te quedan ${restantes} reservas este mes`;
    body  = 'Estás cerca del límite del plan gratis. Considera subir a Premium para citas ilimitadas.';
  } else {
    theme = {
      ring: 'rgba(146,200,58,0.25)', bg: 'rgba(243,250,230,0.7)',
      bar: '#92c83a', ico: '#52780f', tag: 'bg-[#92c83a]/15 text-[#15240b]',
    };
    title = `${usadas} / ${RESERVAS_FREE_LIMIT} reservas este mes`;
    body  = 'Plan gratuito de Bioo. Reservas ilimitadas vienen con Premium.';
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: theme.bg, boxShadow: `inset 0 0 0 1px ${theme.ring}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: '#fff', color: theme.ico, boxShadow: `inset 0 0 0 1px ${theme.ring}` }}
        >
          {usadas >= RESERVAS_FREE_LIMIT ? <Sparkles size={17} /> : <Zap size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#15240b]">{title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.tag}`}>
              Plan gratis
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{body}</p>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, background: theme.bar }}
            />
          </div>
        </div>

        {/* Botón placeholder: la pasarela Premium se enchufa después. */}
        {pct >= 80 && (
          <a
            href="https://bioo.cl/admin"
            className="hidden shrink-0 items-center gap-1 self-center rounded-xl bg-[#15240b] px-3 py-2 text-xs font-bold text-white transition-transform active:scale-95 sm:inline-flex"
          >
            Subir a Premium
          </a>
        )}
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

  return (
    <Card icon={CalendarClock} title="Horario semanal" hint="Días y horas en que aceptas clientes.">
      <ul className="space-y-2.5">
        {DIAS_ORDEN.map((d) => {
          const franjas = cfg.horario[d];
          const abierto = franjas.length > 0;
          return (
            <li key={d} className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-sm font-semibold ${abierto ? 'text-[#15240b]' : 'text-neutral-400'}`}>
                  {DIAS_LABEL[d]}
                </span>
                <Toggle on={abierto} onChange={() => toggleDia(d)} />
              </div>

              {abierto && (
                <div className="mt-3 space-y-2">
                  {franjas.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={f.desde}
                        onChange={(e) => actualizarFranja(d, i, { desde: e.target.value })}
                        className={`${inputBase} flex-1 text-sm`}
                      />
                      <span className="text-neutral-300">—</span>
                      <input
                        type="time"
                        value={f.hasta}
                        onChange={(e) => actualizarFranja(d, i, { hasta: e.target.value })}
                        className={`${inputBase} flex-1 text-sm`}
                      />
                      {franjas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarFranja(d, i)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label="Eliminar franja"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => agregarFranja(d)}
                    className="flex items-center gap-1 text-xs font-semibold text-bioo-dark transition-opacity hover:opacity-80"
                  >
                    <Plus size={12} /> Agregar franja (p. ej. tarde)
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
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
