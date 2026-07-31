import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Tooltip de la app — reemplaza el `title=""` del navegador.
//
// El tooltip nativo lo dibuja el SISTEMA OPERATIVO: caja blanca, tipografía de
// Windows, esquinas cuadradas. En un panel oscuro se ve como si otra aplicación
// se hubiera asomado encima. Tampoco se puede estilar: `title` no acepta CSS.
//
// Es UN host global (montado una vez en App.jsx, al lado de ConfirmHost) y no
// un componente por elemento. Cualquier nodo con `data-tooltip="..."` lo
// dispara, así que migrar un `title=` es cambiarle el nombre al atributo — sin
// envolver nada en divs extra, que en la agenda romperían el posicionamiento
// absoluto de las tarjetas. Y hay un solo portal en el DOM en vez de uno por
// cita.
//
// Saltos de línea con \n, igual que el nativo.

const DELAY   = 380;   // parecido al del navegador: no aparece si solo pasas por encima
const MARGEN  = 8;     // separación con el elemento
const BORDE   = 8;     // margen mínimo contra el viewport

export default function TooltipHost() {
  const [tip, setTip] = useState(null);   // { texto, x, y, origen: 'arriba'|'abajo' }
  const timer   = useRef(null);
  const nodoRef = useRef(null);           // elemento que disparó el tooltip
  const cajaRef = useRef(null);

  useEffect(() => {
    const limpiar = () => {
      clearTimeout(timer.current);
      nodoRef.current = null;
      setTip(t => (t === null ? t : null));
    };

    const mostrar = (el) => {
      const texto = el.getAttribute('data-tooltip');
      if (!texto) return;
      const r = el.getBoundingClientRect();
      // Se guarda el rect y se decide arriba/abajo al medir la caja (abajo, en
      // el efecto de posicionamiento): acá todavía no se sabe cuánto mide.
      setTip({ texto, rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width } });
    };

    const onOver = (e) => {
      // Solo mouse. En touch el tooltip taparía justo lo que el dedo acaba de
      // tocar, y la agenda ya usa el long-press para el menú contextual.
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = e.target.closest?.('[data-tooltip]');
      if (!el || el === nodoRef.current) return;
      clearTimeout(timer.current);
      nodoRef.current = el;
      timer.current = setTimeout(() => {
        // Puede haberse desmontado (drag, re-render de la grilla) mientras
        // corría el delay: mostrarlo entonces deja un tooltip huérfano.
        if (nodoRef.current === el && el.isConnected) mostrar(el);
      }, DELAY);
    };

    const onOut = (e) => {
      if (!nodoRef.current) return;
      // relatedTarget nulo = salió de la ventana. Si sigue dentro del mismo
      // elemento (pasó a un hijo), no es una salida real.
      if (e.relatedTarget && nodoRef.current.contains(e.relatedTarget)) return;
      limpiar();
    };

    const onEsc = (e) => { if (e.key === 'Escape') limpiar(); };

    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout',  onOut,  true);
    // Cualquier cosa que mueva el layout o cambie el foco cierra el tooltip:
    // quedaría flotando sobre un elemento que ya no está debajo.
    document.addEventListener('pointerdown', limpiar, true);
    document.addEventListener('dragstart',   limpiar, true);
    document.addEventListener('scroll',      limpiar, true);   // capture: agarra cualquier contenedor
    document.addEventListener('keydown',     onEsc,   true);
    window.addEventListener('resize',        limpiar);
    window.addEventListener('blur',          limpiar);

    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout',  onOut,  true);
      document.removeEventListener('pointerdown', limpiar, true);
      document.removeEventListener('dragstart',   limpiar, true);
      document.removeEventListener('scroll',      limpiar, true);
      document.removeEventListener('keydown',     onEsc,   true);
      window.removeEventListener('resize',        limpiar);
      window.removeEventListener('blur',          limpiar);
    };
  }, []);

  // Posicionamiento: se mide la caja ya renderizada y se coloca debajo del
  // elemento, o encima si no cabe. Se hace acá y no al mostrar porque hasta
  // que no está en el DOM no se sabe cuánto ocupa el texto.
  useEffect(() => {
    if (!tip || !cajaRef.current || tip.x != null) return;
    const caja = cajaRef.current.getBoundingClientRect();
    const { rect } = tip;

    const cabeAbajo = rect.bottom + MARGEN + caja.height <= window.innerHeight - BORDE;
    const y = cabeAbajo ? rect.bottom + MARGEN : rect.top - MARGEN - caja.height;

    // Centrado sobre el elemento, pero sin salirse por los lados.
    let x = rect.left + rect.width / 2 - caja.width / 2;
    x = Math.max(BORDE, Math.min(x, window.innerWidth - caja.width - BORDE));

    setTip(t => (t ? { ...t, x, y: Math.max(BORDE, y) } : t));
  }, [tip]);

  if (!tip) return null;

  return createPortal(
    <div
      ref={cajaRef}
      role="tooltip"
      className="app-tooltip"
      style={{
        top:  tip.y ?? -9999,
        left: tip.x ?? -9999,
        // Mientras se mide (primer render) está fuera de pantalla; sin esto se
        // ve un parpadeo en la esquina antes de saltar a su lugar.
        opacity: tip.x == null ? 0 : 1,
      }}
    >
      {String(tip.texto).split('\n').map((linea, i) => (
        <div key={i} className={i === 0 ? 'app-tooltip-titulo' : undefined}>{linea}</div>
      ))}
    </div>,
    document.body,
  );
}
