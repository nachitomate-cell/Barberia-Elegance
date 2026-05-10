import { useState, useEffect } from 'react';
import {
  Store, MapPin, Phone, Instagram, Image, Clock, Check, Save, HelpCircle,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';

/* ─── Constants ─────────────────────────────────────────────── */
const DIAS_LABELS = { '1':'Lunes','2':'Martes','3':'Miércoles','4':'Jueves','5':'Viernes','6':'Sábado','0':'Domingo' };
const DIAS_ORDER  = ['1','2','3','4','5','6','0'];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  ['00','30'].map(m => `${String(h).padStart(2,'0')}:${m}`)
).flat();

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
};

/* ─── Helpers ────────────────────────────────────────────────── */
function settingsRef() {
  return doc(tenantCol('settings'), 'general');
}

function mergeHorario(saved) {
  const base = { ...DEFAULT_SETTINGS.horario };
  if (!saved) return base;
  DIAS_ORDER.forEach(d => { if (saved[d]) base[d] = { ...base[d], ...saved[d] }; });
  return base;
}

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
  const [form,    setForm]    = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    getDoc(settingsRef()).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          nombre:    d.nombre    || '',
          direccion: d.direccion || '',
          telefono:  d.telefono  || '',
          whatsapp:  d.whatsapp  || '',
          instagram: d.instagram || '',
          logo:      d.logo      || '',
          horario:   mergeHorario(d.horario),
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDia = (d, cfg) => setForm(f => ({ ...f, horario: { ...f.horario, [d]: cfg } }));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setDoc(settingsRef(), form, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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
          <h1 className="text-xl font-bold text-white">Configuración</h1>
          <p className="text-sm text-slate-500 mt-0.5">Información pública de tu local</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : saved
              ? <Check size={15} />
              : <Save size={15} />}
          {saved ? 'Guardado' : 'Guardar cambios'}
        </button>
      </div>

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
        <p className="text-xs text-slate-500 -mt-1">Horario general del local. Los barberos pueden tener horarios individuales en Equipo.</p>
        <div className="mt-2">
          {DIAS_ORDER.map(d => (
            <DayRow key={d} diaKey={d} config={form.horario[d]} onChange={cfg => setDia(d, cfg)} />
          ))}
        </div>
      </Card>

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
              href="https://wa.me/56912345678?text=Hola%20SynapTech%2C%20necesito%20soporte%20con%20mi%20panel%20de%20barber%C3%ADa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#25D366', color: '#fff' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a
              href="mailto:soporte@synaptechspa.cl?subject=Soporte%20Panel%20Barber%C3%ADa"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <HelpCircle size={15} />
              Email
            </a>
          </div>
          <p className="text-center text-xs text-slate-600">
            Desarrollado con ❤️ por{' '}
            <a href="https://www.synaptechspa.cl/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors" style={{ color: 'rgba(212,175,55,0.6)' }}>
              SynapTech SpA
            </a>
          </p>
        </div>
      </div>

    </div>
  );
}
