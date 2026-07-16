import { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import {
  QrCode, ShieldAlert, Loader2, CheckCircle2, Power, Clock,
  Smartphone, Unlink, Sparkles, X,
} from 'lucide-react';

// Vista del add-on premium "Asistente IA 24/7 + Confirmaciones" — vinculación del
// número PROPIO del local vía Evolution API (sesión/QR), 100% autogestionable.
// Backend: functions/evolution/gateway.js. Aislado del número oficial de Meta.

const TYC_TEXT =
  'Comprendo que al vincular mi línea particular a un asistente automatizado de terceros, ' +
  'asumo las políticas de uso responsable de WhatsApp y de la plataforma.';

function callFn(name, payload) {
  const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), name);
  return fn(payload).then((r) => r.data);
}

export default function WhatsAppAsistente() {
  const tid = resolveTenantId();
  const [cfg, setCfg]           = useState(null);
  const [tyc, setTyc]           = useState(false);
  const [modal, setModal]       = useState(false);
  const [qr, setQr]             = useState(null);
  const [pairing, setPairing]   = useState(null);
  const [vinculando, setVinc]   = useState(false);
  const [conectado, setConectado] = useState(false); // pantalla de éxito
  const [err, setErr]           = useState('');

  /* ── Suscripción al doc de config ── */
  useEffect(() => {
    const ref = doc(db, 'tenants', tid, 'configuracion', 'whatsapp');
    return onSnapshot(
      ref,
      (snap) => setCfg(snap.exists() ? snap.data() : {}),
      () => setCfg({}),
    );
  }, [tid]);

  const estado      = cfg?.estadoConexion || 'disconnected';
  const isConnected = estado === 'connected';
  const numero      = cfg?.numeroVinculado;
  const botOn       = cfg?.botEnabled === true;
  const confirmOn   = cfg?.confirmacionesEnabled === true;
  const ventana     = cfg?.recordatorio?.ventanaHoras ?? 24;

  /* ── Escritura directa de switches (admin) ── */
  function patchCfg(patch) {
    setDoc(doc(db, 'tenants', tid, 'configuracion', 'whatsapp'), patch, { merge: true }).catch(() => {});
  }

  /* ── Vincular ── */
  async function vincular() {
    setErr(''); setVinc(true); setQr(null); setConectado(false);
    try {
      const r = await callFn('evolutionVincular', { tycAceptado: true, tenantId: tid });
      setQr(r.qr); setPairing(r.pairingCode); setModal(true);
    } catch (e) {
      setErr(e?.message || 'No se pudo iniciar la vinculación. Reintenta.');
    } finally {
      setVinc(false);
    }
  }

  /* ── Polling del modal: refresca QR y detecta la conexión ── */
  useEffect(() => {
    if (!modal || conectado) return;
    let alive = true;
    const iv = setInterval(async () => {
      try {
        const r = await callFn('evolutionEstado', { tenantId: tid });
        if (!alive) return;
        if (r.estado === 'connected') {
          setConectado(true);
          setTimeout(() => { if (alive) { setModal(false); setConectado(false); } }, 1900);
        } else if (r.qr) {
          setQr(r.qr); setPairing(r.pairingCode);
        }
      } catch { /* transitorio */ }
    }, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [modal, conectado, tid]);

  async function desvincular() {
    if (!window.confirm('¿Desvincular WhatsApp? El bot dejará de responder y recuperas el control 100% manual de tu teléfono.')) return;
    setErr('');
    try { await callFn('evolutionDesvincular', { tenantId: tid }); }
    catch (e) { setErr(e?.message || 'No se pudo desvincular.'); }
  }

  return (
    <div className="space-y-5">
      {/* ── Sub-header ── */}
      <div className="flex items-center gap-2.5">
        <Sparkles size={18} className="text-amber-400" />
        <div>
          <h2 className="text-sm font-bold text-white">Asistente IA 24/7 sobre tu número</h2>
          <p className="text-xs text-slate-400">
            El bot responde y agenda solo, en <strong className="text-slate-300">tu propio WhatsApp</strong> — sin perder tu app ni tu número.
          </p>
        </div>
      </div>

      {err && (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">{err}</div>
      )}

      {!isConnected ? (
        /* ── No vinculado: T&C + botón ── */
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
            <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tyc}
                onChange={(e) => setTyc(e.target.checked)}
                className="mt-0.5 accent-amber-500 h-4 w-4 shrink-0"
              />
              <span className="text-xs text-amber-200/90 leading-relaxed">{TYC_TEXT}</span>
            </label>
          </div>

          <button
            type="button"
            onClick={vincular}
            disabled={!tyc || vinculando}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold py-3 transition-all"
          >
            {vinculando ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
            {vinculando ? 'Generando QR…' : 'Vincular WhatsApp'}
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            Vas a escanear un QR desde tu celular (WhatsApp → Dispositivos vinculados). Tu número sigue funcionando normal.
          </p>
        </div>
      ) : (
        /* ── Vinculado: estado + switches ── */
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <Smartphone size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Conectado
              </p>
              <p className="text-xs text-slate-400 truncate">{numero ? `+${numero}` : 'Tu número está vinculado'}</p>
            </div>
            <button onClick={desvincular} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-300 transition-colors">
              <Unlink size={14} /> Desvincular
            </button>
          </div>

          {/* Switch maestro del bot */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Power size={18} className={botOn ? 'text-emerald-400' : 'text-slate-500'} />
              <div>
                <p className="text-sm font-semibold text-white">Asistente IA</p>
                <p className="text-xs text-slate-400">{botOn ? 'Encendido — responde y agenda solo' : 'Apagado — nadie responde por ti (útil en feriados)'}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={botOn}
              onClick={() => patchCfg({ botEnabled: !botOn })}
              className={`relative w-12 h-7 rounded-full transition-colors ${botOn ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${botOn ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Confirmaciones anti-no-show */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock size={18} className={confirmOn ? 'text-emerald-400' : 'text-slate-500'} />
                <div>
                  <p className="text-sm font-semibold text-white">Confirmación de cita</p>
                  <p className="text-xs text-slate-400">
                    {confirmOn
                      ? 'Le pedimos al cliente confirmar por WhatsApp antes de su hora'
                      : 'Apagado — no se piden confirmaciones (útil para no molestar)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={confirmOn}
                onClick={() => patchCfg({ confirmacionesEnabled: !confirmOn })}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${confirmOn ? 'bg-emerald-500' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${confirmOn ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {confirmOn && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-700/40">
                <p className="text-xs text-slate-400">¿Cuántas horas antes se le pide confirmar?</p>
                <select
                  value={ventana}
                  onChange={(e) => patchCfg({ recordatorio: { ...(cfg?.recordatorio || {}), ventanaHoras: Number(e.target.value) } })}
                  className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={12}>12 horas antes</option>
                  <option value={24}>24 horas antes</option>
                  <option value={48}>48 horas antes</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de escaneo QR ── */}
      {modal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700/60 bg-[#0e0e12] p-6 shadow-2xl relative">
            <button onClick={() => setModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white" aria-label="Cerrar">
              <X size={18} />
            </button>

            {conectado ? (
              /* Éxito */
              <div className="flex flex-col items-center text-center py-6">
                <CheckCircle2 size={64} className="text-emerald-400 mb-4 animate-[pulse_1s_ease-in-out]" />
                <h3 className="text-lg font-bold text-white">¡Vinculado! 🎉</h3>
                <p className="text-sm text-slate-400 mt-1">Tu WhatsApp ya está conectado al Asistente.</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-white text-center mb-1">Escanea con tu WhatsApp</h3>
                <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
                  En tu celular: <strong className="text-slate-200">WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo</strong>
                </p>
                <div className="rounded-2xl bg-white p-3 mx-auto w-fit">
                  {qr
                    ? <img src={qr} alt="Código QR de vinculación" className="w-56 h-56 object-contain" />
                    : <div className="w-56 h-56 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-slate-400" /></div>}
                </div>
                {pairing && (
                  <p className="text-[11px] text-slate-500 text-center mt-3">
                    ¿No puedes escanear? Código: <span className="font-mono text-slate-300 tracking-widest">{pairing}</span>
                  </p>
                )}
                <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Esperando el escaneo… (el QR se refresca solo)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
