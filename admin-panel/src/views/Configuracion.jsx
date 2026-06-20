import { useState, useEffect, useRef } from 'react';
import {
  Store, MapPin, Phone, Instagram, Image, Clock, Check, Save, HelpCircle, AlertCircle,
  GraduationCap, Scissors, Ban,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

/* ─── Constants ─────────────────────────────────────────────── */
const DIAS_LABELS = { '1':'Lunes','2':'Martes','3':'Miércoles','4':'Jueves','5':'Viernes','6':'Sábado','0':'Domingo' };
const DIAS_ORDER  = ['1','2','3','4','5','6','0'];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  ['00','30'].map(m => `${String(h).padStart(2,'0')}:${m}`)
).flat();

const DEFAULT_FEATURES = {
  hasCourses:     false,
  courses:        { title: 'Cursos de Barbería',    description: '', ctaMsg: '' },
  hasChairRental: false,
  chairRental:    { title: 'Arriendo de Sillones',  description: '', ctaMsg: '' },
  hasAcademiaInternal: false,
};

const DEFAULT_SETTINGS = {
  nombre:    '',
  direccion: '',
  telefono:  '',
  whatsapp:  '',
  instagram: '',
  logo:      '',
  horario: {
    '1': { activo: true,  inicio: '09:00', fin: '20:00' },
    '2': { activo: true,  inicio: '09:00', fin: '20:00' },
    '3': { activo: true,  inicio: '09:00', fin: '20:00' },
    '4': { activo: true,  inicio: '09:00', fin: '20:00' },
    '5': { activo: true,  inicio: '09:00', fin: '20:00' },
    '6': { activo: true,  inicio: '09:00', fin: '14:00' },
    '0': { activo: false, inicio: '10:00', fin: '14:00' },
  },
  features: DEFAULT_FEATURES,
};

/* ─── Helpers ────────────────────────────────────────────────── */
function settingsRef() {
  return doc(tenantCol('settings'), 'general');
}

function confRef() {
  return doc(tenantCol('configuracion'), 'main');
}

function mergeHorario(saved) {
  const base = { ...DEFAULT_SETTINGS.horario };
  if (!saved) return base;
  DIAS_ORDER.forEach(d => { if (saved[d]) base[d] = { ...base[d], ...saved[d] }; });
  return base;
}

function mergeFeatures(saved) {
  const base = { ...DEFAULT_FEATURES, courses: { ...DEFAULT_FEATURES.courses }, chairRental: { ...DEFAULT_FEATURES.chairRental } };
  if (!saved) return base;
  if (typeof saved.hasCourses === 'boolean')     base.hasCourses     = saved.hasCourses;
  if (typeof saved.hasChairRental === 'boolean') base.hasChairRental = saved.hasChairRental;
  if (typeof saved.hasAcademiaInternal === 'boolean') base.hasAcademiaInternal = saved.hasAcademiaInternal;
  if (saved.courses)     base.courses     = { ...base.courses,     ...saved.courses };
  if (saved.chairRental) base.chairRental = { ...base.chairRental, ...saved.chairRental };
  return base;
}

/* ─── Helpers ────────────────────────────────────────────────── */
import { resolveTenantId } from '../lib/tenantUtils';

/* ─── Sub-components ─────────────────────────────────────────── */
function Card({ Icon, title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
        <Icon size={15} className="text-slate-400 shrink-0" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function DayRow({ diaKey, config, onChange }) {
  const sel = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500';
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-slate-800/60 last:border-0 ${!config.activo ? 'opacity-50' : ''}`}>
      <button type="button" onClick={() => onChange({ ...config, activo: !config.activo })}
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
          config.activo ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
        {config.activo && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>
      <span className="text-xs font-semibold text-slate-300 w-24 shrink-0">{DIAS_LABELS[diaKey]}</span>
      {config.activo ? (
        <div className="flex items-center gap-2">
          <select value={config.inicio} onChange={e => onChange({ ...config, inicio: e.target.value })} className={sel}>
            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
          <span className="text-slate-600 text-xs">–</span>
          <select value={config.fin} onChange={e => onChange({ ...config, fin: e.target.value })} className={sel}>
            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      ) : (
        <span className="text-xs text-slate-600 italic">Cerrado</span>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function Configuracion() {
  const [form,          setForm]          = useState(DEFAULT_SETTINGS);
  const [intervalo,     setIntervalo]     = useState(30);
  const [minutosLimite, setMinutosLimite] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [dirty,     setDirty]     = useState(false);
  const [saveErr,   setSaveErr]   = useState('');
  const [showHelp,  setShowHelp]  = useState(false);
  const savedTimer = useRef(null);
  const tenantId = resolveTenantId();

  useEffect(() => {
    Promise.all([getDoc(settingsRef()), getDoc(confRef())]).then(([settSnap, confSnap]) => {
      if (settSnap.exists()) {
        const d = settSnap.data();
        setForm({
          nombre:    d.nombre    || '',
          direccion: d.direccion || '',
          telefono:  d.telefono  || '',
          whatsapp:  d.whatsapp  || '',
          instagram: d.instagram || '',
          logo:      d.logo      || '',
          horario:   mergeHorario(d.horario),
          features:  mergeFeatures(d.features),
        });
      }
      if (confSnap.exists()) {
        const cd = confSnap.data();
        if (cd.intervaloMinutos)          setIntervalo(cd.intervaloMinutos);
        if (cd.minutosLimiteReagendar !== undefined) setMinutosLimite(cd.minutosLimiteReagendar);
      }
    }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const setDia = (d, cfg) => { setForm(f => ({ ...f, horario: { ...f.horario, [d]: cfg } })); setDirty(true); };
  const setFeat      = (k, v) => { setForm(f => ({ ...f, features: { ...f.features, [k]: v } })); setDirty(true); };
  const setFeatCourse = (k, v) => { setForm(f => ({ ...f, features: { ...f.features, courses: { ...f.features.courses, [k]: v } } })); setDirty(true); };
  const setFeatChair  = (k, v) => { setForm(f => ({ ...f, features: { ...f.features, chairRental: { ...f.features.chairRental, [k]: v } } })); setDirty(true); };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveErr('');
    try {
      // Convertir form.horario al formato que usa firebaseUtils / booking.service
      const diasLaborales = [];
      const diasConfig = {};
      let horarioInicio = '09:00';
      let horarioFin    = '20:00';
      let primerDia = true;
      Object.entries(form.horario).forEach(([dia, cfg]) => {
        if (cfg.activo) {
          const n = Number(dia);
          diasLaborales.push(n);
          diasConfig[n] = { inicio: cfg.inicio, fin: cfg.fin };
          if (primerDia) { horarioInicio = cfg.inicio; horarioFin = cfg.fin; primerDia = false; }
        }
      });

      await Promise.all([
        setDoc(settingsRef(), form, { merge: true }),
        setDoc(confRef(), {
          intervaloMinutos:        intervalo,
          minutosLimiteReagendar:  minutosLimite,
          diasLaborales,
          diasConfig,
          horarioInicio,
          horarioFin,
        }, { merge: true }),
      ]);
      setSaved(true);
      setDirty(false);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveErr(e?.message || 'Error al guardar. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Configuración</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Información pública de tu local</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="relative flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : saved
              ? <Check size={15} />
              : <Save size={15} />}
          {saved ? 'Guardado' : 'Guardar cambios'}
          {dirty && !saving && !saved && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950" />
          )}
        </button>
      </div>

      {/* Error banner */}
      {saveErr && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/50 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle size={15} className="shrink-0" />
          <span className="flex-1">{saveErr}</span>
          <button onClick={() => setSaveErr('')} className="text-red-400/50 hover:text-red-400 transition-colors">
            <Check size={13} />
          </button>
        </div>
      )}

      {/* Información General */}
      <Card Icon={Store} title="Información General">
        <Field label="Nombre del local">
          <input className={inp} placeholder="Barbería Elegance" value={form.nombre}
            onChange={e => set('nombre', e.target.value)} />
        </Field>
        <Field label="Dirección">
          <input className={inp} placeholder="Av. Ejemplo 123, Santiago" value={form.direccion}
            onChange={e => set('direccion', e.target.value)} />
        </Field>
        <Field label="Logo (URL)">
          <div className="flex gap-3 items-start">
            {form.logo && (
              <img src={form.logo} alt="logo" className="w-12 h-12 rounded-lg object-contain bg-slate-800 border border-slate-700 shrink-0" />
            )}
            {!form.logo && (
              <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Image size={18} className="text-slate-600" />
              </div>
            )}
            <input className={inp} placeholder="https://..." value={form.logo}
              onChange={e => set('logo', e.target.value)} />
          </div>
        </Field>
      </Card>

      {/* Contacto y Redes Sociales */}
      <Card Icon={Phone} title="Contacto y Redes Sociales">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Teléfono">
            <input className={inp} placeholder="+56 2 1234 5678" value={form.telefono}
              onChange={e => set('telefono', e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <input className={inp} placeholder="+56 9 8765 4321" value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value)} />
          </Field>
        </div>
        <Field label="Instagram">
          <div className="relative">
            <Instagram size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={`${inp} pl-9`} placeholder="@barberiaelegance" value={form.instagram}
              onChange={e => set('instagram', e.target.value)} />
          </div>
        </Field>
      </Card>

      {/* Horario de Atención */}
      <Card Icon={Clock} title="Horario de Atención">
        <p className="text-xs text-slate-500 -mt-1">Referencia informativa del local. La disponibilidad real de reservas la controlan los horarios individuales de cada barbero en <strong className="text-slate-400">Equipo</strong>.</p>
        <div className="mt-2">
          {DIAS_ORDER.map(d => (
            <DayRow key={d} diaKey={d} config={form.horario[d]} onChange={cfg => setDia(d, cfg)} />
          ))}
        </div>
      </Card>

      {/* Duración de Turnos */}
      <Card Icon={Clock} title="Duración de Turnos">
        <p className="text-xs text-slate-500 -mt-1">
          Intervalo entre horas disponibles en la agenda pública de reservas.
        </p>
        <div className="flex gap-3">
          {[[15, '15 minutos', 'Cada cuarto de hora'], [30, '30 minutos', 'Cada media hora'], [45, '45 minutos', 'Cada tres cuartos'], [60, '1 hora', 'Cada hora completa']].map(([mins, label, sub]) => (
            <button
              key={mins}
              type="button"
              onClick={() => { setIntervalo(mins); setDirty(true); }}
              className={`flex-1 flex flex-col items-center py-3 px-2 rounded-lg border transition-all ${
                intervalo === mins
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className={`text-[10px] mt-0.5 ${intervalo === mins ? 'text-emerald-500/70' : 'text-slate-600'}`}>{sub}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Política de Cancelación */}
      <Card Icon={Ban} title="Política de Cancelación">
        <p className="text-xs text-slate-500 -mt-1">
          Tiempo mínimo de anticipación requerido para que un cliente pueda reagendar o cancelar su cita. Con <strong className="text-slate-400">Sin límite</strong> los clientes pueden cancelar en cualquier momento.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[[0,'Sin límite'],[60,'1 hora'],[120,'2 horas'],[240,'4 horas'],[360,'6 horas'],[480,'8 horas'],[720,'12 horas'],[1440,'24 horas']].map(([mins, label]) => (
            <button
              key={mins}
              type="button"
              onClick={() => { setMinutosLimite(mins); setDirty(true); }}
              className={`flex flex-col items-center py-2.5 px-2 rounded-lg border transition-all ${
                minutosLimite === mins
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Servicios Extra — Cursos/Arriendo solo Chameleon · Academia solo Elegance */}
      {(tenantId === 'chameleon' || tenantId === 'elegance') && (
      <Card Icon={GraduationCap} title="Servicios Extra">
        {tenantId === 'chameleon' && (<>
        <p className="text-xs text-slate-500 -mt-1">
          Agrega secciones informativas con botón de WhatsApp en tu página pública.
        </p>

        {/* Cursos */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <GraduationCap size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-white">Cursos de Barbería</span>
            </div>
            <button type="button" onClick={() => setFeat('hasCourses', !form.features.hasCourses)}
              className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${form.features.hasCourses ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.features.hasCourses ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.features.hasCourses && (
            <div className="px-4 py-4 space-y-3 border-t border-slate-700/50">
              <Field label="Título">
                <input className={inp} value={form.features.courses.title}
                  onChange={e => setFeatCourse('title', e.target.value)} />
              </Field>
              <Field label="Descripción">
                <textarea className={`${inp} resize-none`} rows={2} value={form.features.courses.description}
                  onChange={e => setFeatCourse('description', e.target.value)} />
              </Field>
              <Field label="Mensaje de WhatsApp">
                <input className={inp} placeholder="Hola, quiero información sobre los cursos…"
                  value={form.features.courses.ctaMsg}
                  onChange={e => setFeatCourse('ctaMsg', e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        {/* Arriendo de Sillones */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <Scissors size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-white">Arriendo de Sillones</span>
            </div>
            <button type="button" onClick={() => setFeat('hasChairRental', !form.features.hasChairRental)}
              className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${form.features.hasChairRental ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.features.hasChairRental ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.features.hasChairRental && (
            <div className="px-4 py-4 space-y-3 border-t border-slate-700/50">
              <Field label="Título">
                <input className={inp} value={form.features.chairRental.title}
                  onChange={e => setFeatChair('title', e.target.value)} />
              </Field>
              <Field label="Descripción">
                <textarea className={`${inp} resize-none`} rows={2} value={form.features.chairRental.description}
                  onChange={e => setFeatChair('description', e.target.value)} />
              </Field>
              <Field label="Mensaje de WhatsApp">
                <input className={inp} placeholder="Hola, me interesa el arriendo de un sillón…"
                  value={form.features.chairRental.ctaMsg}
                  onChange={e => setFeatChair('ctaMsg', e.target.value)} />
              </Field>
            </div>
          )}
        </div>
        </>)}

        {/* Módulo Academia Interno (Solo Elegance) */}
        {tenantId === 'elegance' && (
          <div className="border border-slate-700/50 rounded-lg overflow-hidden mt-4">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={15} className="text-slate-400" />
                <span className="text-sm font-semibold text-white">Módulo Academia (Panel Interno)</span>
              </div>
              <button type="button" onClick={() => setFeat('hasAcademiaInternal', !form.features.hasAcademiaInternal)}
                className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${form.features.hasAcademiaInternal ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.features.hasAcademiaInternal ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {form.features.hasAcademiaInternal && (
              <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900">
                <p className="text-xs text-slate-500">
                  El módulo <strong>Academia</strong> se activará en el menú lateral izquierdo para que puedas administrar cursos, alumnos y material de estudio de forma interna.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
      )}

      {/* Soporte Técnico */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d0d0d 0%, #111 100%)',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 0 40px rgba(212,175,55,0.04)',
        }}
      >
        <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.12)', background: 'rgba(212,175,55,0.04)' }}>
          <HelpCircle size={15} style={{ color: '#D4AF37' }} className="shrink-0" />
          <h2 className="text-sm font-semibold text-white">Soporte Técnico</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-start gap-4">
            <img src="/logo1.png" alt="SynapTech" className="w-10 h-10 rounded-xl object-contain shrink-0" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', padding: '6px' }} />
            <div>
              <p className="text-white font-semibold text-sm">SynapTech SpA</p>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                ¿Tienes dudas o necesitas ayuda? Nuestro equipo de soporte está disponible para asistirte con la plataforma.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href="https://wa.me/56983568212?text=Hola%20SynapTech%2C%20necesito%20soporte%20con%20mi%20panel%20de%20barber%C3%ADa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#25D366', color: '#fff' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a
              href="mailto:hola@synaptechspa.cl?subject=Soporte%20Panel%20Barber%C3%ADa"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <HelpCircle size={15} />
              Email
            </a>
          </div>
          <p className="text-center text-xs text-slate-600">
            ⚡ Engineered by{' '}
            <a href="https://www.synaptechspa.cl/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors" style={{ color: 'rgba(212,175,55,0.6)' }}>
              SynapTech SpA
            </a>
            {' '}— software del futuro, hoy.
          </p>
        </div>
      </div>

      {showHelp && (
        <HelpModal title="Ayuda — Configuración" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-white">Configuración</strong> gestionas la información pública y las reglas de reserva del local.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Actualiza el <span className="text-white">nombre</span>, dirección, teléfono e Instagram de tu barbería.</li>
            <li>Define el <span className="text-white">horario de apertura y cierre</span> y los días hábiles del local.</li>
            <li>Configura con cuántos días de <span className="text-white">anticipación</span> pueden reservar los clientes.</li>
            <li>Guarda los cambios con <span className="text-white">Guardar cambios</span> — se reflejan en la app pública de inmediato.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
