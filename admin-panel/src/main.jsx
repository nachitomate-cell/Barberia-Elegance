import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

// Cuando el SW actualizado activa y reclama esta pestaña, recargamos para
// que el bundle nuevo entre en efecto sin requerir cierre manual.
//
// Guard clave: NO recargar en el primer control (initial claim). Cuando el SW
// se instala por primera vez o después de un hard-refresh, dispara
// `controllerchange` aunque no haya un bundle nuevo, y el reload subsecuente
// causaba un flash blanco al arranque de sesión. Solo recargamos si YA había
// un controller antes → confirma que se trata de una actualización real.
if ('serviceWorker' in navigator) {
  let reloading = false;
  const _tenia = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !_tenia) return;
    reloading = true;
    window.location.reload();
  });
}

// ThemeProvider va lo más afuera posible: useChartTheme() lo consume desde
// cualquier vista, así que tiene que envolver todo el árbol.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
