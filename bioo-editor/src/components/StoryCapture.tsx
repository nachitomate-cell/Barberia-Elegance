// StoryCapture — el lienzo "fuera de pantalla" que se convierte en la imagen
// que el usuario comparte a IG Stories. 1080×1920 (9:16) en píxeles reales,
// posicionado fuera del viewport (no se ve, pero el navegador lo layoutea
// para que html-to-image pueda fotografiarlo). El hook `useInstaShare`
// recibe el ref de este nodo y lo captura.
//
// Diseño: tarjeta tipo "preview de tu bioo" sobre fondo brand, con marco de
// teléfono mockup que envuelve al BioPreview real (mismo render que el visor),
// nombre de usuario, URL y branding inferior. Todo en colores bioo para que
// el resultado se vea cohesivo cuando se posteen como historia.

import { forwardRef } from 'react';
import BioPreview from '../preview/BioPreview';
import type { BioState } from '../types';

interface Props {
  state: BioState;
}

/* Dimensiones IG Story (9:16). 1080×1920 es el "tamaño nativo" — la captura
 * usa pixelRatio:2 por encima de esto en el hook, dando 2160×3840 efectivo. */
const STORY_W = 1080;
const STORY_H = 1920;

/* Marco de teléfono interno: ratio 9/19.5 (igual que PhoneFrame del editor),
 * pero a tamaño "media-history" para dejar espacio a header y footer. */
const PHONE_W = 720;   // ⅔ del story → suficientemente grande para leer
const PHONE_H = Math.round(PHONE_W * (19.5 / 9));  // ≈ 1560

const StoryCapture = forwardRef<HTMLDivElement, Props>(function StoryCapture(
  { state },
  ref,
): JSX.Element {
  const username = state.username || 'tunombre';

  return (
    <div
      ref={ref}
      aria-hidden="true"
      /* Off-screen pero LAYOUTEADO. left:-200vw es más confiable que
       * visibility:hidden (que sí impide la captura) o display:none (idem). */
      style={{
        position: 'fixed',
        left: '-200vw',
        top: 0,
        width: STORY_W,
        height: STORY_H,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <div
        style={{
          width: STORY_W,
          height: STORY_H,
          /* Gradiente brand bioo (lima → verde bosque) — se ve "premium" en
           * historia y deja contraste para el texto blanco arriba/abajo. */
          background: 'linear-gradient(170deg, #92c83a 0%, #2c5a17 55%, #15240b 100%)',
          color: '#ffffff',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '88px 0 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow decorativo arriba */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -200,
            left: -120,
            width: 700,
            height: 700,
            background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 60%)',
            filter: 'blur(0px)',
          }}
        />

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 24px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                color: '#15240b',
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1,
              }}
            >
              b
            </span>
            <span style={{ fontWeight: 800, fontSize: 28, letterSpacing: -0.4 }}>bioo</span>
          </span>
          <p
            style={{
              marginTop: 24,
              fontSize: 30,
              fontWeight: 600,
              opacity: 0.85,
              letterSpacing: 0.3,
            }}
          >
            Mira mi nueva página ✨
          </p>
        </div>

        {/* ── Phone mockup con el BioPreview real ── */}
        <div
          style={{
            marginTop: 36,
            width: PHONE_W,
            height: PHONE_H,
            borderRadius: 60,
            border: '14px solid #0e0e10',
            background: '#0e0e10',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 30px 70px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.35)',
            zIndex: 1,
          }}
        >
          {/* Pantalla interna — radius interno para que coincida con el bisel */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 46,
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            <BioPreview state={state} />
          </div>
        </div>

        {/* ── Footer URL + branding ── */}
        <div
          style={{
            marginTop: 'auto',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <p
            style={{
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: -1.2,
              lineHeight: 1,
            }}
          >
            bioo.cl/{username}
          </p>
          <p
            style={{
              marginTop: 14,
              fontSize: 22,
              opacity: 0.7,
              fontWeight: 500,
            }}
          >
            Crea la tuya gratis en bioo.cl
          </p>
        </div>
      </div>
    </div>
  );
});

export default StoryCapture;
