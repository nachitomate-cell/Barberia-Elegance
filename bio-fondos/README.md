# Fondos predefinidos de bioo

Fondos seleccionables en el editor (Apariencia → Fondo → Imagen → "O elige un fondo listo").

## Estructura
- `fondoN.jpg`        → fondo full (máx 1080px de ancho, JPG ~q82). Se aplica como `bg.image`.
- `thumbs/fondoN.jpg` → miniatura (240px) para la galería del editor.

Las rutas se referencian root-relative (`/bio-fondos/...`), igual que el resto de assets de bioo.
Solo se guarda la **ruta** en la config del usuario (no un data URL), así que es liviano en Firestore.

## Cómo agregar un fondo nuevo
1. Deja la imagen fuente (vertical 9:16) en `bio/Fondos/` (esa carpeta está en `.gitignore`, no se commitea).
2. Comprime con el script (usa jimp; genera full + thumb):
   ```bash
   node -e '
   const J=require("jimp"),fs=require("fs"),p=require("path");
   const src="bio/Fondos", out="bio-fondos";
   (async()=>{ const fs_=require("fs"); const files=fs_.readdirSync(src).filter(f=>/\.(png|jpe?g)$/i.test(f)).sort();
     let i=0; for(const f of files){ i++; const img=await J.read(p.join(src,f));
       const full=img.clone(); if(full.bitmap.width>1080) full.resize(1080,J.AUTO); full.quality(82); await full.writeAsync(p.join(out,`fondo${i}.jpg`));
       await img.clone().resize(240,J.AUTO).quality(78).writeAsync(p.join(out,"thumbs",`fondo${i}.jpg`)); }
     console.log("listo",i); })();'
   ```
   (jimp es JS puro, sin compilación nativa: `npm i jimp@0.22.10`.)
3. Aumenta `BG_PRESET_COUNT` en `links/editor.html` (función `renderAppearance`).
4. Commitea **solo** `bio-fondos/` (las fuentes en `bio/` quedan ignoradas).
