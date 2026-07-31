import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

// Desplegable de la app — reemplaza el <select> nativo.
//
// El <select> es el último control que no se puede estilar: el botón sí, pero
// la LISTA la dibuja el sistema operativo. En Windows sale blanca con la fila
// activa en azul, dentro de un panel oscuro. No hay CSS que lo arregle; la
// única salida es no usar el nativo.
//
// La lista va en un portal a <body>: dentro del modal quedaría recortada por el
// `overflow` del contenedor que scrollea, y es justo donde más se usa.
//
// API a propósito distinta del nativo: `onChange` entrega el VALOR, no un
// evento. Un `e.target.value` falso invita a tratarlo como un <select> de
// verdad y a esperar cosas que no existen (form submit nativo, validación HTML).
//
// options: [{ value, label, disabled?, hint? }]

const ALTO_MAX = 288;   // ~8 filas antes de scrollear

export default function Select({
  value,
  onChange,
  options = [],
  className = '',
  placeholder = '— elegir —',
  disabled = false,
  ariaLabel,
}) {
  const [abierto, setAbierto] = useState(false);
  const [marcado, setMarcado] = useState(-1);    // fila resaltada por teclado
  const [pos, setPos]         = useState(null);  // {top,left,width,arriba}
  const btnRef   = useRef(null);
  const listaRef = useRef(null);
  const buscar   = useRef({ txt: '', t: 0 });
  const listId   = useId();

  const sel      = options.find(o => String(o.value) === String(value));
  const idxSel   = options.findIndex(o => String(o.value) === String(value));

  const medir = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const abajo  = window.innerHeight - r.bottom - 8;
    const arriba = r.top - 8;
    // Se abre hacia arriba solo si abajo no cabe Y arriba hay más espacio: en
    // un modal bajo, abrir siempre hacia abajo deja la lista fuera de pantalla.
    const haciaArriba = abajo < Math.min(ALTO_MAX, options.length * 38 + 8) && arriba > abajo;
    setPos({
      left:  r.left,
      width: r.width,
      top:   haciaArriba ? undefined : r.bottom + 6,
      bottom: haciaArriba ? window.innerHeight - r.top + 6 : undefined,
      alto:  Math.min(ALTO_MAX, Math.max(120, (haciaArriba ? arriba : abajo) - 8)),
    });
  }, [options.length]);

  const abrir = useCallback(() => {
    if (disabled) return;
    medir();
    setMarcado(idxSel >= 0 ? idxSel : 0);
    setAbierto(true);
  }, [disabled, medir, idxSel]);

  const cerrar = useCallback(() => { setAbierto(false); setMarcado(-1); }, []);

  const elegir = useCallback((op) => {
    if (!op || op.disabled) return;
    cerrar();
    btnRef.current?.focus();
    if (String(op.value) !== String(value)) onChange?.(op.value);
  }, [cerrar, onChange, value]);

  // Click fuera / scroll / resize. El scroll CIERRA en vez de reposicionar:
  // seguir al elemento mientras el modal scrollea se ve peor que cerrarse, y
  // reposicionar en cada frame de scroll es caro con listas largas.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (listaRef.current?.contains(e.target)) return;
      cerrar();
    };
    // El scroll se escucha en captura (los contenedores internos no burbujean
    // el evento), así que llega TAMBIÉN el de la propia lista: sin este filtro
    // la lista se cerraba apenas la rueda la movía un pixel, y con 30 horas o
    // 20 servicios era imposible llegar al final. Mismo caso al abrirla con un
    // valor de más abajo: el scrollIntoView que deja la fila a la vista
    // disparaba un scroll y se cerraba sola.
    const scroll = (e) => {
      const lista = listaRef.current;
      if (lista && (e.target === lista || lista.contains(e.target))) return;
      cerrar();
    };
    document.addEventListener('mousedown', fuera, true);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', fuera, true);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto, cerrar]);

  // La fila marcada siempre visible (teclado y apertura con valor ya elegido).
  useEffect(() => {
    if (!abierto || marcado < 0) return;
    listaRef.current?.querySelector(`[data-idx="${marcado}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [abierto, marcado]);

  const mover = (paso) => {
    setMarcado(i => {
      const n = options.length;
      if (!n) return -1;
      let j = i < 0 ? (idxSel >= 0 ? idxSel : 0) : i;
      // Salta deshabilitadas; el tope de intentos evita el bucle infinito si
      // TODAS lo están.
      for (let k = 0; k < n; k++) {
        j = (j + paso + n) % n;
        if (!options[j]?.disabled) return j;
      }
      return i;
    });
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!abierto) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    switch (e.key) {
      case 'Escape':    e.preventDefault(); cerrar(); btnRef.current?.focus(); break;
      case 'ArrowDown': e.preventDefault(); mover(1);  break;
      case 'ArrowUp':   e.preventDefault(); mover(-1); break;
      case 'Home':      e.preventDefault(); setMarcado(options.findIndex(o => !o.disabled)); break;
      case 'End':       e.preventDefault(); setMarcado(options.length - 1); break;
      case 'Enter':
      case ' ':         e.preventDefault(); elegir(options[marcado]); break;
      case 'Tab':       cerrar(); break;
      default: {
        // Type-ahead: el nativo lo tiene y en listas de 12 servicios se echa
        // de menos apenas deja de estar.
        if (e.key.length !== 1) return;
        const ahora = Date.now();
        buscar.current.txt = ahora - buscar.current.t > 700 ? e.key : buscar.current.txt + e.key;
        buscar.current.t = ahora;
        const q = buscar.current.txt.toLowerCase();
        const i = options.findIndex(o => !o.disabled && String(o.label).toLowerCase().startsWith(q));
        if (i >= 0) setMarcado(i);
      }
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={abierto ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`${className} app-select-btn ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate text-left ${sel ? '' : 'text-slate-500'}`}>
          {sel ? sel.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 ml-2 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && pos && createPortal(
        <div
          ref={listaRef}
          id={listId}
          role="listbox"
          className="app-select-lista"
          style={{
            left: pos.left, width: pos.width,
            top: pos.top, bottom: pos.bottom,
            maxHeight: pos.alto,
          }}
        >
          {options.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-slate-500">Sin opciones</div>
          )}
          {options.map((o, i) => {
            const activa = String(o.value) === String(value);
            return (
              <div
                key={`${o.value}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={activa}
                aria-disabled={o.disabled || undefined}
                // onMouseDown y no onClick: el mousedown del "click fuera" se
                // dispara antes y cerraría la lista sin llegar a elegir nada.
                onMouseDown={(e) => { e.preventDefault(); elegir(o); }}
                onMouseEnter={() => !o.disabled && setMarcado(i)}
                className={`app-select-op ${activa ? 'is-activa' : ''} ${marcado === i ? 'is-marcada' : ''} ${o.disabled ? 'is-off' : ''}`}
              >
                <span className="truncate">
                  {o.label}
                  {o.hint && <span className="ml-1.5 text-[11px] text-slate-500">{o.hint}</span>}
                </span>
                {activa && <Check size={14} className="shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
