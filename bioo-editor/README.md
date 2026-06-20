# bioo-editor (React)

Reescritura del editor de bioo a **React 18 + TypeScript + Tailwind + Framer Motion + Firebase modular**.
Reemplaza al editor estático `links/editor.html`. Vive aislado en esta carpeta: **no afecta producción**
hasta hacer el cutover del rewrite (ver más abajo).

## Correr en local
```bash
cd bioo-editor
npm install
npm run dev      # http://localhost:5173
```

## Build / typecheck
```bash
npm run build      # → dist/  (Vite, esbuild)
npm run typecheck  # tsc --noEmit (sin errores)
```

## Arquitectura
```
src/
  main.tsx              entrada (EditorProvider + App)
  App.tsx               shell: sidebar/bottom-nav, header (Guardar), visor desktop, FAB + sheet móvil
  store.tsx             estado tipado (useReducer) + borrador en localStorage
  types.ts              Block, Theme, Profile, BioState
  ui.tsx                Field / Group / Segmented / inputCls
  lib/
    firebase.ts         init modular (auth, db)
    bio.ts              loadBio / saveBio (Firestore: bios/{username})
    theme.ts            THEMES, FONTS, formas, computeUrl()
  preview/
    BioPreview.tsx      render del bio a partir del estado (compartido desktop + sheet)
    PreviewSheet.tsx    bottom-sheet móvil (AnimatePresence + spring iOS + drag-to-dismiss)
  sections/
    Links.tsx           bloques: alta, edición por tipo, destacar, eliminar, reordenar (Reorder)
    Profile.tsx         nombre, bio, foto (URL), usuario, verificado
    Appearance.tsx      tema, forma/estilo de botón, fuente
    Share.tsx           compartir nativo, redes, copiar, QR
```

## Implementado (Fase 1 — núcleo funcional)
- Estado tipado + **borrador automático** (localStorage), reactivo en el visor.
- **Enlaces**: 10 tipos, campos por tipo, destacar, eliminar, **reordenar con drag**.
- **Perfil**, **Apariencia** (8 temas, forma/estilo/fuente), **Compartir** (nativo + redes + QR).
- **Visor en vivo**: columna en desktop + **bottom-sheet móvil** con animación spring y arrastre para cerrar.
- **Guardar** a Firestore (`bios/{username}`) si hay sesión.

## Pendiente para paridad total (siguientes fases)
- Auth completa (gate anónimo + login + reclamo de usuario) y flujo borrador→publicar.
- Recorte de avatar (Cropper), portada, miniaturas por enlace.
- Tipos avanzados: imagen/banner, embeds YouTube/Spotify, fila de íconos sociales.
- Apariencia avanzada: fondos (color/degradado/animado/patrón/imagen), íconos verde/original,
  avatar forma+anillo, texto (peso/mayúsculas/espaciado), buscador + categorías + render incremental.
- Asistente de inicio + confeti.

## Cutover (último paso, reversible — hacer solo al llegar a paridad)
1. Build se sirve desde una carpeta (ej. `bio-editor/`).
2. En `vercel.json`, apuntar `bioo.cl/editor` al `index.html` del build de esta app
   (rewrite) en vez de `/links/editor.html`.
3. Encadenar el build en el `build` raíz (junto a admin-panel).
> Hasta entonces, el editor en producción sigue siendo el HTML estático actual (intacto).
