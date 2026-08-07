import { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

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
//
// `searchable` agrega un buscador dentro de la lista. Se pensó para el catálogo
// de servicios (elegir el servicio de una cita en un local con 20 cortes es
// scrollear a ciegas), pero sirve para cualquier lista larga. Filtra por
// palabras sueltas y sin acentos: "cort barb" encuentra "Corte + Barba".

const ALTO_MAX = 288;   // ~8 filas antes de scrollear
// Debajo de este número de opciones el buscador estorba más de lo que ayuda:
// la lista entera ya cabe en pantalla y el type-ahead alcanza.
const MIN_BUSCADOR = 6;

/** Minúsculas + sin acentos, para comparar lo que el usuario escribe. */
const normalizar = s => (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Select({
  value,
  onChange,
  options = [],
  className = '',
  placeholder = '— elegir —',
  disabled = false,
  ariaLabel,
  searchable = false,
  searchPlaceholder = 'Buscar…',
}) {
  const [abierto, setAbierto] = useState(false);
  const [marcado, setMarcado] = useState(-1);    // fila resaltada por teclado
  const [pos, setPos]         = useState(null);  // {top,left,width,arriba}
  const [q, setQ]             = useState('');    // texto del buscador
  const btnRef   = useRef(null);
  const listaRef = useRef(null);
  const inputRef = useRef(null);
  const buscar   = useRef({ txt: '', t: 0 });
  const listId   = useId();

  const conBuscador = searchable && options.length >= MIN_BUSCADOR;

  // Lista visible = las opciones que pasan el filtro. Todo lo demás (teclado,
  // marcado, elegir) trabaja sobre ESTA lista, no sobre `options`.
  const visibles = useMemo(() => {
    if (!conBuscador) return options;
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);
    if (!palabras.length) return options;
    return options.filter(o => {
      const txt = normalizar(`${o.label ?? ''} ${o.hint ?? ''}`);
      return palabras.every(w => txt.includes(w));
    });
  }, [conBuscador, options, q]);

  const sel      = options.find(o => String(o.value) === String(value));
  const idxSel   = visibles.findIndex(o => String(o.value) === String(value));

  const medir = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const abajo  = window.innerHeight - r.bottom - 8;
    const arriba = r.top - 8;
    // Se abre hacia arriba solo si abajo no cabe Y arriba hay más espacio: en
    // un modal bajo, abrir siempre hacia abajo deja la lista fuera de pantalla.
    const alto = Math.min(ALTO_MAX, options.length * 38 + 8 + (conBuscador ? 44 : 0));
    const haciaArriba = abajo < alto && arriba > abajo;
    setPos({
      left:  r.left,
      width: r.width,
      top:   haciaArriba ? undefined : r.bottom + 6,
      bottom: haciaArriba ? window.innerHeight - r.top + 6 : undefined,
      alto:  Math.min(ALTO_MAX, Math.max(120, (haciaArriba ? arriba : abajo) - 8)),
    });
  }, [options.length, conBuscador]);

  const abrir = useCallback(() => {
    if (disabled) return;
    medir();
    setQ('');
    setMarcado(idxSel >= 0 ? idxSel : 0);
    setAbierto(true);
  }, [disabled, medir, idxSel]);

  const cerrar = useCallback(() => { setAbierto(false); setMarcado(-1); setQ(''); }, []);

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

  // Con buscador, el foco va al input apenas abre: se escribe de inmediato sin
  // tener que hacer un segundo clic.
  useEffect(() => {
    if (abierto && conBuscador) inputRef.current?.focus();
  }, [abierto, conBuscador]);

  const mover = (paso) => {
    setMarcado(i => {
      const n = visibles.length;
      if (!n) return -1;
      let j = i < 0 ? (idxSel >= 0 ? idxSel : 0) : i;
      // Salta deshabilitadas; el tope de intentos evita el bucle infinito si
      // TODAS lo están.
      for (let k = 0; k < n; k++) {
        j = (j + paso + n) % n;
        if (!visibles[j]?.disabled) return j;
      }
      return i;
    });
  };

  // `typeAhead` se apaga cuando el evento viene del buscador: ahí las letras son
  // la consulta, no un atajo para saltar a una fila.
  const manejarTeclas = (e, { typeAhead = true } = {}) => {
    if (disabled) return;
    if (!abierto) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    switch (e.key) {
      case 'Escape':    e.preventDefault(); cerrar(); btnRef.current?.focus(); break;
      case 'ArrowDown': e.preventDefault(); mover(1);  break;
      case 'ArrowUp':   e.preventDefault(); mover(-1); break;
      case 'Home':      e.preventDefault(); setMarcado(visibles.findIndex(o => !o.disabled)); break;
      case 'End':       e.preventDefault(); setMarcado(visibles.length - 1); break;
      case 'Enter':     e.preventDefault(); elegir(visibles[marcado]); break;
      case ' ':
        // En el buscador el espacio separa palabras ("corte barba"); solo actúa
        // como "elegir" cuando el foco está en el botón.
        if (!typeAhead) return;
        e.preventDefault(); elegir(visibles[marcado]); break;
      case 'Tab':       cerrar(); break;
      default: {
        // Type-ahead: el nativo lo tiene y en listas de 12 servicios se echa
        // de menos apenas deja de estar.
        if (!typeAhead || e.key.length !== 1) return;
        const ahora = Date.now();
        buscar.current.txt = ahora - buscar.current.t > 700 ? e.key : buscar.current.txt + e.key;
        buscar.current.t = ahora;
        const pref = buscar.current.txt.toLowerCase();
        const i = visibles.findIndex(o => !o.disabled && String(o.label).toLowerCase().startsWith(pref));
        if (i >= 0) setMarcado(i);
      }
    }
  };

  const onKeyDown = (e) => manejarTeclas(e);

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
        (() => {
          const filas = (
            <>
              {options.length === 0 && (
                <div className="px-3 py-2.5 text-sm text-slate-500">Sin opciones</div>
              )}
              {options.length > 0 && visibles.length === 0 && (
                <div className="px-3 py-2.5 text-sm text-slate-500">Sin resultados para “{q.trim()}”</div>
              )}
              {visibles.map((o, i) => {
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
            </>
          );

          const estilo = {
            left: pos.left, width: pos.width,
            top: pos.top, bottom: pos.bottom,
            maxHeight: pos.alto,
          };

          // Sin buscador: la lista misma scrollea (estructura de siempre).
          if (!conBuscador) {
            return (
              <div ref={listaRef} id={listId} role="listbox" className="app-select-lista" style={estilo}>
                {filas}
              </div>
            );
          }

          // Con buscador: el input queda fijo arriba y solo scrollean las filas.
          return (
            <div ref={listaRef} className="app-select-lista app-select-lista--buscar" style={estilo}>
              <div className="app-select-buscador">
                <Search size={14} className="shrink-0 text-slate-500" strokeWidth={2} />
                <input
                  ref={inputRef}
                  type="text"
                  value={q}
                  autoComplete="off"
                  spellCheck="false"
                  aria-label={ariaLabel ? `Buscar ${ariaLabel.toLowerCase()}` : 'Buscar'}
                  placeholder={searchPlaceholder}
                  onChange={(e) => { setQ(e.target.value); setMarcado(0); }}
                  onKeyDown={(e) => manejarTeclas(e, { typeAhead: false })}
                />
              </div>
              <div id={listId} role="listbox" className="app-select-scroll">
                {filas}
              </div>
            </div>
          );
        })(),
        document.body,
      )}
    </>
  );
}
