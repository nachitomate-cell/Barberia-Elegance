import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base absoluto /bio-app/ → los assets resuelven igual aunque la URL sea bioo.cl/editor
// (Vercel reescribe /editor → /bio-app/index.html). El build sale a la raíz del repo
// para que Vercel (outputDirectory ".") lo sirva.
export default defineConfig({
  plugins: [react()],
  base: '/bio-app/',
  build: { outDir: '../bio-app', emptyOutDir: true },
});
