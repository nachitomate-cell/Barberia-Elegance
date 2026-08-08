import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RUTAS_SOLO_ADMIN, RECEPCION_GRANTS } from './components/layout/Sidebar';
import { esRutaSoloAdmin } from './lib/rutasAdmin';
import { usePermisosRecepcion } from './hooks/usePermisosRecepcion';
import Spinner from './components/ui/Spinner';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SucursalProvider } from './contexts/SucursalContext';
const Membresias = lazy(() => import('./views/Membresias'));
const CorteAlLapiz = lazy(() => import('./views/CorteAlLapiz'));
const Rangos = lazy(() => import('./views/Rangos'));
import SuspendedScreen from './components/SuspendedScreen';
import { ErrorBoundaryWithTenant } from './components/ErrorBoundary';
import { useVersionManager } from './hooks/useVersionManager';
import { useBillingPlan } from './hooks/useBillingPlan';
import AdminLayout from './components/layout/AdminLayout';
const Inicio = lazy(() => import('./views/Inicio'));
const InicioWallet = lazy(() => import('./views/InicioWallet'));
const Servicios = lazy(() => import('./views/Servicios'));
const Menu = lazy(() => import('./views/Menu'));
const Agenda = lazy(() => import('./views/Agenda'));
const Pizarra = lazy(() => import('./views/Pizarra'));
const CitasPorCerrar = lazy(() => import('./views/CitasPorCerrar'));
const Actividad = lazy(() => import('./views/Actividad'));
const Equipo = lazy(() => import('./views/Equipo'));
const Clientes = lazy(() => import('./views/Clientes'));
const ListaNegra = lazy(() => import('./views/ListaNegra'));
const Publicidad = lazy(() => import('./views/Publicidad'));
const Metricas = lazy(() => import('./views/Metricas'));
const Premios = lazy(() => import('./views/Premios'));
const Canjes = lazy(() => import('./views/Canjes'));
const Fidelizacion = lazy(() => import('./views/Fidelizacion'));
const Productos = lazy(() => import('./views/Productos'));
const Inventario = lazy(() => import('./views/Inventario'));
const Lookbook = lazy(() => import('./views/Lookbook'));
const LinkBio = lazy(() => import('./views/LinkBio'));
const Configuracion = lazy(() => import('./views/Configuracion'));
const Gastos = lazy(() => import('./views/Gastos'));
const Caja = lazy(() => import('./views/Caja'));
const BookingFlow = lazy(() => import('./views/BookingFlow'));
const AgendaBarbero = lazy(() => import('./views/AgendaBarbero'));
const Chat = lazy(() => import('./views/Chat'));
const ChatbotConfig = lazy(() => import('./views/ChatbotConfig'));
const Marketing = lazy(() => import('./views/Marketing'));
const Anuncios = lazy(() => import('./views/Anuncios'));
const Aura = lazy(() => import('./views/Aura'));
const Ayuda = lazy(() => import('./views/Ayuda'));
const Faqs = lazy(() => import('./views/Faqs'));
const ServicioFavorito = lazy(() => import('./views/ServicioFavorito'));
const LoginPage = lazy(() => import('./views/LoginPage'));
const BarberTV = lazy(() => import('./views/BarberTV'));
const TVConfig = lazy(() => import('./views/TVConfig'));
const Finanzas = lazy(() => import('./views/Finanzas'));
const Mensualidad = lazy(() => import('./views/Mensualidad'));
const Soporte = lazy(() => import('./views/Soporte'));
const Consultas = lazy(() => import('./views/Consultas'));
const HistorialCortes = lazy(() => import('./views/HistorialCortes'));
const InstagramPage = lazy(() => import('./views/Instagram'));
const Academia = lazy(() => import('./views/Academia'));
const Resenas = lazy(() => import('./views/Resenas'));
const ReservaPublica = lazy(() => import('./views/ReservaPublica'));
const Comisiones = lazy(() => import('./views/Comisiones'));
const GiftCards = lazy(() => import('./views/GiftCards'));
const Sorteos = lazy(() => import('./views/Sorteos'));
const Google = lazy(() => import('./views/Google'));
const WhatsApp = lazy(() => import('./views/WhatsApp'));
const ListaEspera = lazy(() => import('./views/ListaEspera'));
const Sucursales = lazy(() => import('./views/Sucursales'));
const RecibirPagos = lazy(() => import('./views/RecibirPagos'));
const Integraciones = lazy(() => import('./views/Integraciones'));
const Ahorro = lazy(() => import('./views/Ahorro'));
const Wallets = lazy(() => import('./views/Wallets'));
const Facturacion = lazy(() => import('./views/Facturacion'));
const Referidos = lazy(() => import('./views/Referidos'));
const SaldoGiftCard = lazy(() => import('./views/SaldoGiftCard'));
const VIPDashboard = lazy(() => import('./views/VIPDashboard'));
import BillingGate         from './components/BillingGate';
import TrialGate           from './components/TrialGate';
import OnboardingChecklist from './components/OnboardingChecklist';
import ConfirmHost         from './components/ui/ConfirmHost';
import TooltipHost         from './components/ui/TooltipHost';
import TuuSandboxHost      from './components/ui/TuuSandboxHost';
import TuuCobroHost        from './components/ui/TuuCobroHost';
import DailyWelcomePanel    from './components/DailyWelcomePanel';
import HubTenantGate        from './components/HubTenantGate';


/* Cada vista se carga bajo demanda (lazy). Antes las 60 se empaquetaban juntas
   en un archivo de 3,6 MB que había que bajar completo para pintar cualquier
   pantalla. Este es el placeholder mientras baja el chunk de la vista. */
function CargandoVista() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

/* Si tras un deploy el navegador pide un chunk cuyo hash ya no existe, el
   import dinámico falla y la vista queda en blanco para siempre. Vite avisa con
   `vite:preloadError`; recargamos UNA vez para tomar el index.html nuevo. El
   candado en sessionStorage evita el bucle si la recarga tampoco lo resuelve. */
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    try {
      if (sessionStorage.getItem('chunk-reload')) return;
      sessionStorage.setItem('chunk-reload', '1');
    } catch { /* modo privado: se recarga igual */ }
    window.location.reload();
  });
  window.addEventListener('load', () => {
    try { sessionStorage.removeItem('chunk-reload'); } catch { /* noop */ }
  });
}

function TenantGate({ children }) {
  const { suspended } = useTenant();
  if (suspended === null) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Spinner size={32} className="text-slate-500" />
    </div>
  );
  if (suspended) return <SuspendedScreen />;
  return children;
}

// Pantalla que se muestra cuando el user no tiene rol admin. Explica por qué
// va a la agenda, y ofrece salida manual + botón "Entrar de todos modos" para
// casos de emergencia (bug de roles que dejaba admins colgados).
function RoleRedirectScreen({ role, email, tenantId, suffix }) {
  const [going, setGoing] = useState(false);
  // Solo mandamos a la agenda cuando el rol SÍ resolvió y no es admin. Si no
  // resolvió (null), quedarse quieto: expulsar a un admin por una lectura que
  // no llegó a tiempo es peor que dejarlo elegir con el botón de abajo.
  const rolResuelto = role !== null && role !== undefined;
  useEffect(() => {
    if (!rolResuelto) return;
    // Redirect automático a los 4 s para dar tiempo a leer y usar el bypass.
    const t = setTimeout(() => {
      setGoing(true);
      window.location.replace(`/agenda.html${suffix}`);
    }, 4000);
    return () => clearTimeout(t);
  }, [suffix, rolResuelto]);
  const rolLabel = rolResuelto ? role : 'aún no resolvió (posible bug de sincronización)';
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <Spinner size={32} className="text-slate-500" />
      <div className="max-w-md text-slate-300">
        <p className="text-sm font-semibold text-slate-200 mb-2">
          {!rolResuelto     ? 'No pudimos confirmar tu rol'
            : going         ? 'Llevándote a tu agenda…'
            :                 'Redirigiendo en unos segundos…'}
        </p>
        {rolResuelto ? (
          <p className="text-xs text-slate-500 mb-3">
            Tu cuenta {email ? <b>{email}</b> : null} tiene rol <b className="text-amber-400">{rolLabel}</b> en el local <b>{tenantId || 'sin tenant'}</b>. El panel de administración es solo para admins.
          </p>
        ) : (
          <p className="text-xs text-slate-500 mb-3">
            La conexión tardó demasiado y no alcanzamos a verificar los permisos de {email ? <b>{email}</b> : 'tu cuenta'} en el local <b>{tenantId || 'sin tenant'}</b>. Recarga la página; si eres admin, usa el botón de abajo para entrar igual.
          </p>
        )}
        <button
          onClick={() => {
            // Bypass: setea el rol a admin en sessionStorage y recarga.
            // Solo funciona si el user está autenticado; Firestore rules
            // seguirán bloqueando escrituras si no es admin real.
            try { sessionStorage.setItem('_role_override_admin', '1'); } catch {}
            window.location.reload();
          }}
          className="mt-2 px-3 py-1.5 rounded-md text-[11px] text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500"
        >
          Soy admin, entrar de todos modos
        </button>
      </div>
    </div>
  );
}

// ¿Lleva `ms` en estado "activo" sin salir? Se usa para no dejar al usuario
// mirando un spinner infinito si el rol jamás resuelve: pasado el plazo,
// mostramos la pantalla con el escape hatch en vez de girar para siempre.
function useStalled(active, ms) {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!active) { setStalled(false); return; }
    const t = setTimeout(() => setStalled(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return stalled;
}

function ProtectedApp() {
  const { user, role, loading } = useAuth();
  const { id: tenantId } = useTenant();
  const billingPlan = useBillingPlan();
  // Hay un tick entre "ya sé que hay usuario" y "ya sé qué rol tiene" (lectura
  // de claims / Firestore). Durante ese hueco NO podemos concluir que no es
  // admin: es exactamente lo que hacía aparecer la pantalla intermedia y, si
  // el rol tardaba, expulsaba admins a /agenda.html.
  const rolePendiente = !!user && (role === null || role === undefined);
  const roleNoResuelve = useStalled(rolePendiente, 8000);
  // Producto standalone (sin agenda): la landing es Inicio en vez de Agenda,
  // que en un tenant wallet-only no tiene sentido (no hay citas). Los tenants
  // por tipo (deluxe, restodemo) siguen mandando.
  // Recepción nunca aterriza en Inicio: ese panel muestra los ingresos del día
  // y del mes, que es justo lo que su rol no debe ver. Su puerta de entrada es
  // la agenda, que además es donde trabaja.
  const defaultRoute =
    role === 'recepcion'          ? 'agenda'   :
    billingPlan === 'wallet-only' ? 'inicio' :
    tenantId === 'deluxeperfumes' ? 'productos' :
    tenantId === 'restodemo'      ? 'menu'      :
    'agenda';

  if (loading || (rolePendiente && !roleNoResuelve)) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Spinner size={32} className="text-slate-500" />
    </div>
  );

  if (!user) return <LoginPage />;

  // gestion-interna es para ADMIN y RECEPCIÓN (y admin-barberos tipo Omar
  // Chameleon, cuyo claim es role='admin' aunque también estén en barberos/).
  // Cualquier otro rol se redirige a la agenda pública del local, donde tienen
  // su propio login para ver SU día. Motivo:
  //  · Evita fuga de la base de clientes (memoria feedback_no_exponer_whatsapp_cliente)
  //  · Un barbero no debería ver la agenda de sus compañeros ni las métricas del local
  //  · Sigue siendo una whitelist EXPLÍCITA: captura barberos, profesionales
  //    (rol legacy migrado desde AgendaPro), jefes y cualquier rol futuro sin
  //    tener que enumerarlos. Un rol nuevo entra solo si se agrega acá a mano.
  //
  // Recepción ve un panel recortado: el Sidebar la trata como no-admin y le
  // oculta todo lo marcado `adminOnly`. Ese recorte es de UI — lo que de
  // verdad protege son las reglas (ver scripts/test-rules-roles.js).
  const PANEL_ROLES = ['admin', 'recepcion'];
  if (!PANEL_ROLES.includes(role)) {
    // Pantalla explícita: si un admin cae acá por error (bug de roles), tiene
    // información para reportar y un botón para forzar entrada. El redirect
    // automático a /agenda.html se demora 3 s para dar espacio a corregir.
    //
    // HubTenantGate ANTES del redirect: en app.synaptechspa.cl (la app de las
    // tiendas) el tenant pre-login es `sandbox` por DOMAIN_MAP. Sin el gate, un
    // barbero real (ej. Bryan de chameleon, 07-08-2026) era rebotado a
    // /agenda.html?local=sandbox — un local donde NO existe — y quedaba en
    // "Esta cuenta no es de un barbero". El gate resuelve SU local primero
    // (bloquea con splash, así el timer del redirect no corre antes de tiempo)
    // y en subdominios de tenants es pass-through puro.
    const suffix = tenantId && tenantId !== 'elegance' ? `?local=${tenantId}` : '';
    return (
      <HubTenantGate>
        <RoleRedirectScreen role={role} email={user?.email} tenantId={tenantId} suffix={suffix} />
      </HubTenantGate>
    );
  }

  return (
    <HubTenantGate>
    <Suspense fallback={<CargandoVista />}>
    <Routes>
      {/* Vista TV: pantalla completa, sin sidebar ni navbar */}
      <Route path="tv" element={<BarberTV />} />

      {/* Resto del panel con AdminLayout. TrialGate por fuera: si el trial
          self-service venció, reemplaza TODO el panel por la selección de plan. */}
      <Route path="/*" element={
        <TrialGate>
        <OnboardingChecklist />
        <AdminLayout>
          <GuardRutaAdmin role={role} fallback={defaultRoute} />
          <DailyWelcomePanel />
          <Routes>
            <Route index                  element={<Navigate to={defaultRoute} replace />} />
            <Route path="inicio"          element={billingPlan === 'wallet-only' ? <InicioWallet /> : <Inicio />} />
            <Route path="agenda"          element={<Agenda />} />
            <Route path="pizarra"         element={<Pizarra />} />
            <Route path="por-cerrar"      element={<CitasPorCerrar />} />
            <Route path="actividad"       element={<Actividad />} />
            <Route path="servicios"       element={<Servicios />} />
            <Route path="menu"            element={<Menu />} />
            <Route path="equipo"          element={<Equipo />} />
            <Route path="clientes"        element={<Clientes />} />
            <Route path="lista-negra"     element={<ListaNegra />} />
            <Route path="publicidad"      element={<Publicidad />} />
            <Route path="fidelizacion"    element={<Fidelizacion />} />
            <Route path="premios"         element={<Premios />} />
            <Route path="canjes"          element={<Canjes />} />
            <Route path="productos"       element={<Productos />} />
            <Route path="inventario"      element={<Inventario />} />
            <Route path="lookbook"        element={<Lookbook />} />
            <Route path="link-bio"        element={<LinkBio />} />
            <Route path="tv-config"       element={<TVConfig />} />
            <Route path="servicio-favorito" element={<ServicioFavorito />} />
            <Route path="metricas"        element={<BillingGate><Metricas /></BillingGate>} />
            <Route path="gastos"          element={<BillingGate><Gastos /></BillingGate>} />
            <Route path="caja"            element={<BillingGate><Caja /></BillingGate>} />
            <Route path="finanzas"        element={<BillingGate><Finanzas /></BillingGate>} />
            <Route path="configuracion"   element={<Configuracion />} />
            <Route path="mensualidad"     element={<Mensualidad />} />
            <Route path="recibir-pagos"   element={<RecibirPagos />} />
            <Route path="integraciones"   element={<Integraciones />} />
            <Route path="ahorro"          element={<Ahorro />} />
            <Route path="wallets"         element={<Wallets />} />
            <Route path="facturacion"     element={<Facturacion />} />
            <Route path="referidos"       element={<Referidos />} />
            <Route path="mensajes"        element={<Chat />} />
            <Route path="chatbot"         element={<ChatbotConfig />} />
            <Route path="marketing"       element={<BillingGate><Marketing /></BillingGate>} />
            <Route path="anuncios"        element={<BillingGate><Anuncios /></BillingGate>} />
            <Route path="aura"            element={<BillingGate><Aura /></BillingGate>} />
            <Route path="ayuda/*"         element={<Ayuda />} />
            <Route path="faqs"            element={<Faqs />} />
            <Route path="soporte"         element={<Soporte />} />
            <Route path="consultas"       element={<Consultas />} />
            <Route path="membresias"      element={<Membresias />} />
            <Route path="corte-al-lapiz"  element={<CorteAlLapiz />} />
            <Route path="rangos"          element={<Rangos />} />
            <Route path="historial"       element={<HistorialCortes />} />
            <Route path="resenas"         element={<Resenas />} />
            <Route path="instagram"       element={<InstagramPage />} />
            <Route path="academia"        element={<Academia />} />
            <Route path="reserva-online"  element={<ReservaPublica />} />
            <Route path="comisiones"      element={<BillingGate><Comisiones /></BillingGate>} />
            <Route path="gift-cards"      element={<GiftCards />} />
            <Route path="sorteos"         element={<Sorteos />} />
            <Route path="google"          element={<Google />} />
            <Route path="whatsapp"        element={<WhatsApp />} />
            {/* Rutas legacy de los módulos separados — misma vista unificada */}
            <Route path="whatsapp-bot"    element={<WhatsApp />} />
            <Route path="whatsapp-notif"  element={<WhatsApp />} />
            <Route path="lista-espera"    element={<ListaEspera />} />
            <Route path="sucursales"      element={<Sucursales />} />
            <Route path="booking-preview"   element={<BookingFlow />} />
            <Route path="agenda-preview"    element={<AgendaBarbero barberoNombre="Joaquin Amiri" />} />
            <Route path="*"               element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </AdminLayout>
        </TrialGate>
      } />
    </Routes>
    </Suspense>
    </HubTenantGate>
  );
}

/* Cierra por URL las vistas reservadas al admin.
   Ocultar el ítem del Sidebar no cierra la ruta: recepción escribiendo
   /gestion-interna/metricas entraba igual, y Métricas se calcula desde
   `citas`, que sí puede leer — o sea, veía los ingresos.
   La lista se DERIVA de los NAV_GROUPS del Sidebar, así que una vista nueva
   marcada `adminOnly` queda protegida sin tocar este archivo.

   Recepción además respeta los permisos que su admin configuró en
   Configuración → Recepción (`configuracion/recepcion`): los módulos base
   apagados se cierran, y los CONCEDIBLES (RECEPCION_GRANTS) se abren solo
   con permiso explícito aunque sean adminOnly. Mientras los permisos
   cargan (null) no se expulsa a nadie: una lectura lenta no puede echar a
   recepción de la agenda. */
function GuardRutaAdmin({ role, fallback }) {
  const { pathname } = useLocation();
  const permisos = usePermisosRecepcion();   // incondicional (regla de hooks)
  if (role === 'admin') return null;
  const ruta = String(pathname || '').replace(/^\/+|\/+$/g, '');
  const base = ruta.split('/')[0] || '';
  if (role === 'recepcion') {
    if (RECEPCION_GRANTS.includes(base)) {
      if (permisos === null) return null;    // cargando
      return permisos[base] === true ? null : <Navigate to={`/${fallback}`} replace />;
    }
    if (esRutaSoloAdmin(pathname, RUTAS_SOLO_ADMIN)) return <Navigate to={`/${fallback}`} replace />;
    if (permisos && permisos[base] === false) return <Navigate to={`/${fallback}`} replace />;
    return null;
  }
  // La regla vive en lib/rutasAdmin.js para poder probarla sola
  // (npm run check:rutas-admin). Ver ahí por qué se compara la ruta completa.
  if (!esRutaSoloAdmin(pathname, RUTAS_SOLO_ADMIN)) return null;
  return <Navigate to={`/${fallback}`} replace />;
}

export default function App() {
  useVersionManager();

  return (
    <TenantProvider>
      <ErrorBoundaryWithTenant>
        <TenantGate>
          <AuthProvider>
            <SucursalProvider>
              <BrowserRouter basename="/gestion-interna">
                <Routes>
                  <Route path="/saldo-gift-card" element={<SaldoGiftCard />} />
                  <Route path="/dashboard" element={<VIPDashboard />} />
                  <Route path="/*" element={<ProtectedApp />} />
                </Routes>
              </BrowserRouter>
              <ConfirmHost />
              {/* Un solo host para todos los `data-tooltip=""` de la app. */}
              <TooltipHost />
              <TuuSandboxHost />
              <TuuCobroHost />
            </SucursalProvider>
          </AuthProvider>
        </TenantGate>
      </ErrorBoundaryWithTenant>
    </TenantProvider>
  );
}
