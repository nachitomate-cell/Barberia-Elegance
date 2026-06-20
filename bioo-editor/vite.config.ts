import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo → el build se puede servir bajo cualquier ruta (ej. bioo.cl/editor).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
