import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { resolveTenantId } from './lib/tenantUtils';
import Membresias from './views/Membresias';
import CorteAlLapiz from './views/CorteAlLapiz';
import SuspendedScreen from './components/SuspendedScreen';
import { ErrorBoundaryWithTenant } from './components/ErrorBoundary';
import { useVersionManager } from './hooks/useVersionManager';
import AdminLayout from './components/layout/AdminLayout';
import Inicio      from './views/Inicio';
import Servicios   from './views/Servicios';
import Agenda      from './views/Agenda';
import CitasPorCerrar from './views/CitasPorCerrar';
import Equipo      from './views/Equipo';
import Clientes    from './views/Clientes';
import Metricas    from './views/Metricas';
import Premios     from './views/Premios';
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
import Marketing        from './views/Marketing';
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
import ListaEspera      from './views/ListaEspera';
import Sucursales       from './views/Sucursales';
import SaldoGiftCard    from './views/SaldoGiftCard';
import VIPDashboard        from './views/VIPDashboard';
import BillingGate         from './components/BillingGate';
import ConfirmHost         from './components/ui/ConfirmHost';

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

function ProtectedApp() {
  const { user, role, loading } = useAuth();
  const { id: tenantId } = useTenant();
  const defaultRoute = tenantId === 'deluxeperfumes' ? 'productos' : 'agenda';

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <Routes>
      {/* Vista TV: pantalla completa, sin sidebar ni navbar */}
      <Route path="tv" element={<BarberTV />} />

      {/* Resto del panel con AdminLayout */}
      <Route path="/*" element={
        <AdminLayout>
          <Routes>
            <Route index                  element={<Navigate to={defaultRoute} replace />} />
            <Route path="inicio"          element={<Inicio />} />
            <Route path="agenda"          element={<Agenda />} />
            <Route path="por-cerrar"      element={<CitasPorCerrar />} />
            <Route path="servicios"       element={<Servicios />} />
            <Route path="equipo"          element={<Equipo />} />
            <Route path="clientes"        element={<Clientes />} />
            <Route path="premios"         element={<Premios />} />
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
            <Route path="mensajes"        element={<Chat />} />
            <Route path="marketing"       element={<BillingGate><Marketing /></BillingGate>} />
            <Route path="soporte"         element={<Soporte />} />
            <Route path="consultas"       element={<Consultas />} />
            <Route path="membresias"      element={<Membresias />} />
            <Route path="corte-al-lapiz"  element={<CorteAlLapiz />} />
            <Route path="historial"       element={<HistorialCortes />} />
            <Route path="resenas"         element={<Resenas />} />
            <Route path="instagram"       element={<InstagramPage />} />
            <Route path="academia"        element={<Academia />} />
            <Route path="reserva-online"  element={<ReservaPublica />} />
            <Route path="comisiones"      element={<BillingGate><Comisiones /></BillingGate>} />
            <Route path="gift-cards"      element={<GiftCards />} />
            <Route path="lista-espera"    element={<ListaEspera />} />
            <Route path="sucursales"      element={<Sucursales />} />
            <Route path="booking-preview"   element={<BookingFlow />} />
            <Route path="agenda-preview"    element={<AgendaBarbero barberoNombre="Joaquin Amiri" />} />
            <Route path="*"               element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </AdminLayout>
      } />
    </Routes>
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
            <BrowserRouter basename="/gestion-interna">
              <Routes>
                <Route path="/saldo-gift-card" element={<SaldoGiftCard />} />
                <Route path="/dashboard" element={<VIPDashboard />} />
                <Route path="/*" element={<ProtectedApp />} />
              </Routes>
            </BrowserRouter>
            <ConfirmHost />
          </AuthProvider>
        </TenantGate>
      </ErrorBoundaryWithTenant>
    </TenantProvider>
  );
}
