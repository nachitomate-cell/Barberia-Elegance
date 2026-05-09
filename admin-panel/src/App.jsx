import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import Servicios   from './views/Servicios';
import Agenda      from './views/Agenda';
import Equipo      from './views/Equipo';
import Clientes    from './views/Clientes';
import Metricas    from './views/Metricas';
import Premios     from './views/Premios';
import Productos   from './views/Productos';
import Lookbook       from './views/Lookbook';
import Configuracion    from './views/Configuracion';
import Gastos           from './views/Gastos';
import BookingServicios from './views/BookingServicios';
import LoginPage        from './views/LoginPage';

function ProtectedApp() {
  const { user, role, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

  const isAdminRole  = role === 'admin' || role === 'jefe';
  const defaultRoute = isAdminRole ? 'agenda' : 'agenda';

  return (
    <AdminLayout>
      <Routes>
        <Route index                  element={<Navigate to={defaultRoute} replace />} />
        <Route path="agenda"          element={<Agenda />} />
        <Route path="servicios"       element={<Servicios />} />
        <Route path="equipo"          element={<Equipo />} />
        <Route path="clientes"        element={<Clientes />} />
        <Route path="premios"         element={<Premios />} />
        <Route path="productos"       element={<Productos />} />
        <Route path="lookbook"        element={<Lookbook />} />
        <Route path="metricas"        element={<Metricas />} />
        <Route path="gastos"          element={<Gastos />} />
        <Route path="configuracion"   element={<Configuracion />} />
        <Route path="booking-preview" element={<BookingServicios onContinuar={s => alert(`Seleccionado: ${s.nombre}`)} />} />
        <Route path="*"               element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <BrowserRouter basename="/gestion-interna">
          <Routes>
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
}
