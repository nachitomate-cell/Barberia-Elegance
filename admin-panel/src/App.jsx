import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SucursalProvider } from './contexts/SucursalContext';
import { resolveTenantId } from './lib/tenantUtils';
import Membresias from './views/Membresias';
import CorteAlLapiz from './views/CorteAlLapiz';
import Rangos from './views/Rangos';
import SuspendedScreen from './components/SuspendedScreen';
import { ErrorBoundaryWithTenant } from './components/ErrorBoundary';
import { useVersionManager } from './hooks/useVersionManager';
import { useBillingPlan } from './hooks/useBillingPlan';
import AdminLayout from './components/layout/AdminLayout';
import Inicio      from './views/Inicio';
import InicioWallet from './views/InicioWallet';
import Servicios   from './views/Servicios';
import Menu        from './views/Menu';
import Agenda      from './views/Agenda';
import Pizarra     from './views/Pizarra';
import CitasPorCerrar from './views/CitasPorCerrar';
import Equipo      from './views/Equipo';
import Clientes    from './views/Clientes';
import ListaNegra  from './views/ListaNegra';
import Publicidad  from './views/Publicidad';
import Metricas    from './views/Metricas';
import Premios     from './views/Premios';
import Canjes      from './views/Canjes';
import Fidelizacion from './views/Fidelizacion';
import Productos   from './views/Productos';
import Inventario  from './views/Inventario';
import Lookbook       from './views/Lookbook';
import LinkBio        from './views/LinkBio';
import Configuracion    from './views/Configuracion';
import Gastos           from './views/Gastos';
import Caja             from './views/Caja';
import BookingFlow     from './views/BookingFlow';
import AgendaBarbero    from './views/AgendaBarbero';
import Chat            from './views/Chat';
import ChatbotConfig   from './views/ChatbotConfig';
import Marketing        from './views/Marketing';
import Anuncios         from './views/Anuncios';
import Aura             from './views/Aura';
import Ayuda            from './views/Ayuda';
import ServicioFavorito from './views/ServicioFavorito';
import LoginPage        from './views/LoginPage';
import BarberTV         from './views/BarberTV';
import TVConfig         from './views/TVConfig';
import Finanzas         from './views/Finanzas';
import Mensualidad      from './views/Mensualidad';
import Soporte          from './views/Soporte';
import Consultas        from './views/Consultas';
import HistorialCortes  from './views/HistorialCortes';
import InstagramPage    from './views/Instagram';
import Academia         from './views/Academia';
import Resenas          from './views/Resenas';
import ReservaPublica   from './views/ReservaPublica';
import Comisiones       from './views/Comisiones';
import GiftCards        from './views/GiftCards';
import Sorteos          from './views/Sorteos';
import Google           from './views/Google';
import WhatsApp         from './views/WhatsApp';
import ListaEspera      from './views/ListaEspera';
import Sucursales       from './views/Sucursales';
import RecibirPagos     from './views/RecibirPagos';
import Integraciones    from './views/Integraciones';
import Wallets          from './views/Wallets';
import Facturacion      from './views/Facturacion';
import Referidos        from './views/Referidos';
import SaldoGiftCard    from './views/SaldoGiftCard';
import VIPDashboard        from './views/VIPDashboard';
import BillingGate         from './components/BillingGate';
import ConfirmHost         from './components/ui/ConfirmHost';
import TuuSandboxHost      from './components/ui/TuuSandboxHost';
import DailyWelcomePanel    from './components/DailyWelcomePanel';
import HubTenantGate        from './components/HubTenantGate';

function TenantGate({ children }) {
  const { suspended } = useTenant();
  if (suspended === null) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
  useEffect(() => {
    // Redirect automático a los 4 s para dar tiempo a leer y usar el bypass.
    const t = setTimeout(() => {
      setGoing(true);
      window.location.replace(`/agenda.html${suffix}`);
    }, 4000);
    return () => clearTimeout(t);
  }, [suffix]);
  const rolLabel = role === null || role === undefined
    ? 'aún no resolvió (posible bug de sincronización)'
    : role;
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <div className="max-w-md text-slate-300">
        <p className="text-sm font-semibold text-slate-200 mb-2">
          {going ? 'Llevándote a tu agenda…' : 'Redirigiendo en unos segundos…'}
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Tu cuenta {email ? <b>{email}</b> : null} tiene rol <b className="text-amber-400">{rolLabel}</b> en el local <b>{tenantId || 'sin tenant'}</b>. El panel de administración es solo para admins.
        </p>
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

function ProtectedApp() {
  const { user, role, loading } = useAuth();
  const { id: tenantId } = useTenant();
  const billingPlan = useBillingPlan();
  // Producto standalone (sin agenda): la landing es Inicio en vez de Agenda,
  // que en un tenant wallet-only no tiene sentido (no hay citas). Los tenants
  // por tipo (deluxe, restodemo) siguen mandando.
  const defaultRoute =
    billingPlan === 'wallet-only' ? 'inicio' :
    tenantId === 'deluxeperfumes' ? 'productos' :
    tenantId === 'restodemo'      ? 'menu'      :
    'agenda';

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

  // gestion-interna es SOLO para admins (y admin-barberos tipo Omar Chameleon,
  // cuyo claim es role='admin' aunque también estén en la colección barberos/).
  // Cualquier otro rol se redirige a la agenda pública del local, donde tienen
  // su propio login para ver SU día. Motivo:
  //  · Evita fuga de la base de clientes (memoria feedback_no_exponer_whatsapp_cliente)
  //  · Un barbero no debería ver la agenda de sus compañeros ni las métricas del local
  //  · Whitelist explícito de 'admin' captura barberos, profesionales (rol
  //    legacy migrado desde AgendaPro), jefes, y cualquier rol futuro sin
  //    tener que enumerarlos.
  if (role !== 'admin') {
    // Pantalla explícita: si un admin cae acá por error (bug de roles), tiene
    // información para reportar y un botón para forzar entrada. El redirect
    // automático a /agenda.html se demora 3 s para dar espacio a corregir.
    const suffix = tenantId && tenantId !== 'elegance' ? `?local=${tenantId}` : '';
    return <RoleRedirectScreen role={role} email={user?.email} tenantId={tenantId} suffix={suffix} />;
  }

  return (
    <HubTenantGate>
    <Routes>
      {/* Vista TV: pantalla completa, sin sidebar ni navbar */}
      <Route path="tv" element={<BarberTV />} />

      {/* Resto del panel con AdminLayout */}
      <Route path="/*" element={
        <AdminLayout>
          <DailyWelcomePanel />
          <Routes>
            <Route index                  element={<Navigate to={defaultRoute} replace />} />
            <Route path="inicio"          element={billingPlan === 'wallet-only' ? <InicioWallet /> : <Inicio />} />
            <Route path="agenda"          element={<Agenda />} />
            <Route path="pizarra"         element={<Pizarra />} />
            <Route path="por-cerrar"      element={<CitasPorCerrar />} />
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
            <Route path="wallets"         element={<Wallets />} />
            <Route path="facturacion"     element={<Facturacion />} />
            <Route path="referidos"       element={<Referidos />} />
            <Route path="mensajes"        element={<Chat />} />
            <Route path="chatbot"         element={<ChatbotConfig />} />
            <Route path="marketing"       element={<BillingGate><Marketing /></BillingGate>} />
            <Route path="anuncios"        element={<BillingGate><Anuncios /></BillingGate>} />
            <Route path="aura"            element={<BillingGate><Aura /></BillingGate>} />
            <Route path="ayuda/*"         element={<Ayuda />} />
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
      } />
    </Routes>
    </HubTenantGate>
  );
}

const TENANT_MANIFESTS = {
  elegance:      '/gestion-interna/manifest-elegance.webmanifest',
  gitana:        '/gestion-interna/manifest-gitana.webmanifest',
  ferraza:       '/gestion-interna/manifest-ferraza.webmanifest',
  mapubarber:    '/gestion-interna/manifest-mapubarber.webmanifest',
  mapubarbershop:'/gestion-interna/manifest-mapubarber.webmanifest',
  chameleon:     '/gestion-interna/manifest-chameleon.webmanifest',
  delnero:       '/gestion-interna/manifest-delnero.webmanifest',
  marcelo_hairdressing: '/gestion-interna/manifest-marcelo_hairdressing.webmanifest',
  yugen:         '/gestion-interna/manifest-yugen.webmanifest',
};

export default function App() {
  useVersionManager();

  useEffect(() => {
    const tid  = resolveTenantId();
    // Solo sobrescribimos a un manifest ESTÁTICO si existe para este tenant.
    // Los demás conservan el manifest dinámico que el middleware ya sirve por
    // dominio (con su identidad correcta) → evita que se instalen como "Elegance".
    const href = TENANT_MANIFESTS[tid];
    const link = document.querySelector('link[rel="manifest"]');
    if (href && link) link.setAttribute('href', href);
  }, []);

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
              <TuuSandboxHost />
            </SucursalProvider>
          </AuthProvider>
        </TenantGate>
      </ErrorBoundaryWithTenant>
    </TenantProvider>
  );
}
