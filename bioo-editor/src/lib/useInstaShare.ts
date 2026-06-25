// useInstaShare — captura un nodo del DOM como PNG y lo comparte por
// el menú nativo del SO (Web Share API con archivos) o lo descarga en
// desktop como fallback. Diseñado para el flujo "Compartir en IG Stories"
// pero sirve para cualquier captura de imagen.
//
// Estrategia anti-iframe (YouTube/Spotify/embeds varios):
//   Los iframes cross-origin envenenan el canvas con SecurityError. En vez
//   de descartarlos con el `filter` (que deja huecos blancos), los
//   reemplazamos por placeholders visualmente similares ANTES de capturar
//   y los devolvemos a su lugar en el `finally`. La captura ve un div
//   inocuo, el DOM final del editor queda intacto.

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
  /** Color de fondo del PNG (algunos canales lo pintan negro si es null). */
  backgroundColor?: string;
  /** Logs verbose en consola para depurar capturas que salen rotas. */
  logging?: boolean;
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

interface IframeSwap {
  iframe: HTMLIFrameElement;
  placeholder: HTMLDivElement;
  parent: Node;
  nextSibling: Node | null;
}

/** Recorre el subtree del target y reemplaza cada <iframe> por un <div>
 *  placeholder con sus mismas dimensiones, className y estilos críticos
 *  de layout. Devuelve el listado de swaps para revertirlos después. */
function swapIframesForPlaceholders(root: HTMLElement): IframeSwap[] {
  const iframes = Array.from(root.querySelectorAll('iframe'));
  return iframes.map((iframe) => {
    // Medimos por offset (sin Forced reflow). Si no hay layout, cae a
    // valores razonables (16:9 a 320px).
    const w = iframe.offsetWidth  || iframe.clientWidth  || 320;
    const h = iframe.offsetHeight || iframe.clientHeight || 180;

    const placeholder = document.createElement('div');
    // Heredamos className para no romper grid spans / margins.
    placeholder.className = iframe.className;
    // Copiamos los styles inline críticos (padding-top hack 16:9 cuando
    // el embed usa esa técnica, etc.). Forzamos width/height fijos para
    // que no quede 0×0 si el iframe estaba dentro de un wrapper aspect.
    placeholder.style.cssText = [
      `width: ${w}px`,
      `height: ${h}px`,
      // El radius matchea con los .emb-yt/.emb/.u-img de u.html (24px).
      'border-radius: 24px',
      'background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
      'display: flex',
      'flex-direction: column',
      'align-items: center',
      'justify-content: center',
      'gap: 10px',
      'color: #6b7280',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size: 14px',
      'font-weight: 600',
      'box-shadow: 0 2px 12px rgba(21,36,11,.14)',
      // Si estamos dentro de un wrapper con aspect-ratio (padding-top
      // hack), nos posicionamos absolutos para llenarlo.
      iframe.style.position === 'absolute' ? 'position: absolute' : '',
      iframe.style.inset === '0px' || iframe.style.top === '0' ? 'inset: 0' : '',
    ].filter(Boolean).join('; ');

    placeholder.innerHTML =
      '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polygon points="5 3 19 12 5 21 5 3"/></svg>' +
      '<span>Contenido embebido</span>';

    const parent = iframe.parentNode;
    if (!parent) {
      // Iframe huérfano (raro). Devolvemos un swap inerte para no romper restore.
      return { iframe, placeholder, parent: document.body, nextSibling: null };
    }
    const nextSibling = iframe.nextSibling;
    parent.replaceChild(placeholder, iframe);
    return { iframe, placeholder, parent, nextSibling };
  });
}

/** Revierte los swaps. Idempotente — si el placeholder ya no está, lo
 *  inserta de nuevo en su sitio original. */
function restoreIframes(swaps: IframeSwap[]): void {
  for (const { iframe, placeholder, parent, nextSibling } of swaps) {
    try {
      if (placeholder.parentNode === parent) {
        parent.replaceChild(iframe, placeholder);
      } else {
        // El placeholder se movió o desapareció — insertamos donde estaba.
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(iframe, nextSibling);
        } else {
          parent.appendChild(iframe);
        }
      }
    } catch (e) {
      console.warn('[insta-share] no se pudo restaurar un iframe:', e);
    }
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
    backgroundColor = '#ffffff',
    logging = false,
  } = opts;

  const [status, setStatus] = useState<InstaShareStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const canShareRef = useRef<boolean | null>(null);
  if (canShareRef.current === null) canShareRef.current = browserCanShareFiles();

  const log = (...args: unknown[]): void => { if (logging) console.log('[insta-share]', ...args); };

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

    const node = target.current;
    let swaps: IframeSwap[] = [];

    try {
      log('start', { nodeRect: node.getBoundingClientRect(), pixelRatio });

      // 1) Reemplazamos iframes por placeholders ANTES de capturar.
      //    Cualquier iframe cross-origin (YouTube/Spotify/Calendly/...) le
      //    pone "tainted" al canvas y toBlob falla en silencio o devuelve
      //    una imagen vacía. Con placeholders evitamos el problema y
      //    además queda visualmente coherente.
      swaps = swapIframesForPlaceholders(node);
      log(`reemplazados ${swaps.length} iframes por placeholders`);

      // 2) Esperamos a que el browser repinte (Tailwind JIT, web fonts,
      //    layout de los placeholders). 500 ms es generoso pero seguro.
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // 3) Capturamos SOLO el target (no document.body) con opciones
      //    pensadas para evitar tainted canvas:
      //      - cacheBust:true       → fuerza re-fetch de imágenes con ?t=
      //      - pixelRatio:2         → retina (≈ scale:2 de html2canvas)
      //      - backgroundColor      → evita PNG transparente que IG pinta negro
      //      - fetchRequestInit cors → trata las imágenes externas como CORS
      //      - skipAutoScale:true   → no escala forzadamente
      const blob = await toBlob(node, {
        pixelRatio,
        cacheBust: true,
        backgroundColor,
        skipAutoScale: true,
        fetchRequestInit: { mode: 'cors', credentials: 'omit' },
      });

      log('toBlob result', { ok: !!blob, size: blob?.size, type: blob?.type });

      if (!blob || blob.size < 1024) {
        // Una captura "vacía" suele ser <1 KB (header PNG sin contenido).
        throw new Error('La captura salió vacía. Si tienes muchos videos embebidos prueba quitarlos un momento.');
      }

      const file = new File([blob], filename, { type: 'image/png' });

      if (canShareRef.current && navigator.canShare?.({ files: [file] })) {
        setStatus('sharing');
        try {
          await navigator.share({ files: [file], title, text });
          setStatus('done');
        } catch (err) {
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
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('done');
      }

      setTimeout(() => setStatus((s) => (s === 'done' ? 'idle' : s)), 2200);
    } catch (e) {
      console.error('[insta-share] error:', e);
      setError(e instanceof Error ? e.message : 'No se pudo generar la imagen.');
      setStatus('error');
      setTimeout(() => setStatus((s) => (s === 'error' ? 'idle' : s)), 3000);
    } finally {
      // 4) SIEMPRE restauramos los iframes — incluso si toBlob revienta.
      //    El DOM del editor queda intacto.
      restoreIframes(swaps);
      log('restaurados iframes:', swaps.length);
      inFlight.current = false;
    }
  }, [target, text, title, filename, pixelRatio, backgroundColor, logging]);

  return { share, status, error, canShareFiles: canShareRef.current ?? false };
}
