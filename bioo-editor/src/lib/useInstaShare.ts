// useInstaShare — captura un nodo del DOM como PNG y lo comparte por
// el menú nativo del SO (Web Share API con archivos) o lo descarga en
// desktop como fallback. Diseñado para el flujo "Compartir en IG Stories"
// pero sirve para cualquier captura de imagen.

import { useCallback, useRef, useState, type RefObject } from 'react';
import { toBlob } from 'html-to-image';

export type InstaShareStatus = 'idle' | 'generating' | 'sharing' | 'done' | 'error';

export interface UseInstaShareOptions {
  /** Texto que acompaña al share nativo (no aparece en IG Stories pero sí en otros canales). */
  text?: string;
  /** Título del share. */
  title?: string;
  /** Nombre del archivo descargado en desktop / nombre lógico en mobile. */
  filename?: string;
  /** Factor de escala. 2 ⇒ pantallazo a 2x para resolución retina. */
  pixelRatio?: number;
}

export interface UseInstaShareResult {
  /** Llamar al hacer click. Captura el target y dispara share/download. */
  share: () => Promise<void>;
  /** Estado de la UI para mostrar feedback. */
  status: InstaShareStatus;
  /** Último error legible (en español). null si nunca falló. */
  error: string | null;
  /** Estado derivado: true si el navegador puede compartir archivos PNG. */
  canShareFiles: boolean;
}

/** ¿El navegador soporta Web Share API con archivos? Importante: hay que
 *  probarlo con un File real, porque navigator.share existe en desktop
 *  pero rechaza files. Lo evaluamos perezosamente. */
function browserCanShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!('canShare' in navigator)) return false;
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Hook para "compartir como imagen". Recibe el ref del nodo a capturar. */
export function useInstaShare(
  target: RefObject<HTMLElement>,
  opts: UseInstaShareOptions = {},
): UseInstaShareResult {
  const {
    text = '¡Mira mi nuevo perfil en bioo.cl!',
    title = 'Mi nueva web',
    filename = 'mi-perfil-bioo.png',
    pixelRatio = 2,
  } = opts;

  const [status, setStatus] = useState<InstaShareStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  // Evita doble click mientras estamos generando/compartiendo.
  const inFlight = useRef(false);
  // Cache de la detección — costoso al hacerlo por click.
  const canShareRef = useRef<boolean | null>(null);
  if (canShareRef.current === null) canShareRef.current = browserCanShareFiles();

  const share = useCallback(async (): Promise<void> => {
    if (inFlight.current) return;
    if (!target.current) {
      setError('No encontramos el contenido a compartir.');
      setStatus('error');
      return;
    }
    inFlight.current = true;
    setError(null);
    setStatus('generating');

    try {
      // Capturamos el nodo. `filter` descarta iframes (YouTube/Spotify) y
      // canvases con WebGL externos que romperían toBlob por CORS.
      const blob = await toBlob(target.current, {
        pixelRatio,
        cacheBust: true,
        // Backgrounds nulos quedarían transparentes — los IG/WhatsApp
        // muestran negro detrás, mejor inyectamos blanco por si acaso.
        backgroundColor: '#ffffff',
        filter: (node) => {
          const tag = (node as HTMLElement).tagName;
          if (tag === 'IFRAME') return false;
          // Excluimos scripts/styles que html-to-image ya inlinea por separado.
          if (tag === 'SCRIPT') return false;
          return true;
        },
      });

      if (!blob) throw new Error('La captura no produjo una imagen.');

      const file = new File([blob], filename, { type: 'image/png' });

      if (canShareRef.current && navigator.canShare?.({ files: [file] })) {
        setStatus('sharing');
        try {
          await navigator.share({ files: [file], title, text });
          setStatus('done');
        } catch (err) {
          // El usuario cerró el menú de compartir — no es un error real.
          if ((err as DOMException).name === 'AbortError') {
            setStatus('idle');
            return;
          }
          throw err;
        }
      } else {
        // Desktop / browsers sin Web Share files → descarga directa.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Liberamos en el próximo tick para que el navegador ya descargó.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('done');
      }

      // Volvemos a "idle" para que el botón quede reusable.
      setTimeout(() => setStatus((s) => (s === 'done' ? 'idle' : s)), 2200);
    } catch (e) {
      console.error('[insta-share] error:', e);
      setError(e instanceof Error ? e.message : 'No se pudo generar la imagen.');
      setStatus('error');
      setTimeout(() => setStatus((s) => (s === 'error' ? 'idle' : s)), 2500);
    } finally {
      inFlight.current = false;
    }
  }, [target, text, title, filename, pixelRatio]);

  return { share, status, error, canShareFiles: canShareRef.current ?? false };
}
