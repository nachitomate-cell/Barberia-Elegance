/* Entry point del módulo Ayuda dentro del panel.
 * Router interno para: home, categoría, artículo.
 * El AdminLayout (sidebar + navbar del panel) queda alrededor,
 * pero el contenido usa su propio sistema visual scoped en
 * `.ayuda-root` (ver styles/ayuda.css). */
import { Routes, Route, Navigate } from 'react-router-dom';
import AyudaHome      from './ayuda/AyudaHome';
import AyudaCategoria from './ayuda/AyudaCategoria';
import AyudaArticulo  from './ayuda/AyudaArticulo';
import AyudaAdmin     from './ayuda/AyudaAdmin';

export default function Ayuda() {
  return (
    <Routes>
      <Route index                               element={<AyudaHome />} />
      {/* Editor superadmin: /ayuda/admin, /ayuda/admin/nuevo, /ayuda/admin/:artId */}
      <Route path="admin/*"                      element={<AyudaAdmin />} />
      <Route path=":categoriaSlug"               element={<AyudaCategoria />} />
      <Route path=":categoriaSlug/:articuloSlug" element={<AyudaArticulo />} />
      <Route path="*"                            element={<Navigate to="." replace />} />
    </Routes>
  );
}
