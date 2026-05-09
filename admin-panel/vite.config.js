import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/gestion-interna/',
  server: { port: 5173 },
  build: {
    outDir: '../gestion-interna',
    emptyOutDir: true,
  },
});
