import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

// Cuando el SW actualizado activa y reclama esta pestaña, recargamos para
// que el bundle nuevo entre en efecto sin requerir cierre manual.
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
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
