import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AdminDashboard from './AdminDashboard';
import { EditorProvider } from './store';
import './index.css';

// Ruteo mínimo por path: /admin → Centro de Comando; resto → editor.
const _path = window.location.pathname.replace(/\/+$/, '');
const isAdminRoute = _path.endsWith('/admin') || new URLSearchParams(window.location.search).get('view') === 'admin';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? (
      <AdminDashboard />
    ) : (
      <EditorProvider>
        <App />
      </EditorProvider>
    )}
  </React.StrictMode>,
);
