/* ═══════════════════════════════════════════════════════════════
 *  ayudaMarkdown.jsx — parser mínimo Markdown → JSX
 *  ─────────────────────────────────────────────────────────────
 *  Sin dependencias externas (no traigo react-markdown/remark)
 *  para mantener el bundle limpio. Soporta el subset que necesita
 *  el mockup:
 *
 *    # / ## / ###       — headings (con IDs auto para el TOC)
 *    **texto**          — bold
 *    *texto*            — italic (usado con moderación)
 *    _texto_            — serif italic inline (el device del mockup)
 *    `code`             — inline code
 *    [texto](url)       — link
 *    - item             — listas
 *    ---                — hr
 *    (línea vacía)      — párrafo
 *
 *  Extensiones custom:
 *    :::callout Título
 *    contenido…
 *    :::
 *
 *    :::mechanism
 *    label: Entrada
 *    title: Cita marcada Completada
 *    desc:  Barbero confirma…
 *    ---
 *    label: Salida
 *    title: Saldo actualizado
 *    desc:  −1 sesión al pack…
 *    :::
 *
 *  Devuelve JSX + una lista `toc` con las h2 para el sidebar.
 * ═══════════════════════════════════════════════════════════════ */

/* Slug ASCII para IDs de encabezado (mismo que el editor y anchors) */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* Escapa HTML crudo antes de re-interpretar inlines controlados */
function esc(s) {
  return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/* Formatea inlines: **b**, *i*, _serif_, `code`, [txt](url) — orden importa */
function renderInline(text, keyPrefix = 'i') {
  const parts = [];
  const src = String(text || '');
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0; let m; let k = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push(src.slice(last, m.index));
    if (m[2] !== undefined)      parts.push(<strong key={`${keyPrefix}-${k++}`}>{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={`${keyPrefix}-${k++}`}>{m[3]}</em>);
    else if (m[4] !== undefined) parts.push(<span key={`${keyPrefix}-${k++}`} className="serif">{m[4]}</span>);
    else if (m[5] !== undefined) parts.push(<code key={`${keyPrefix}-${k++}`}>{m[5]}</code>);
    else if (m[6] !== undefined) parts.push(<a key={`${keyPrefix}-${k++}`} href={m[7]} target="_blank" rel="noopener noreferrer">{m[6]}</a>);
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push(src.slice(last));
  return parts;
}

export function renderAyudaMd(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const toc = [];
  let i = 0; let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Callout block ────────────────────────────────────────
    const mCall = /^:::callout(?:\s+(.+))?$/.exec(line);
    if (mCall) {
      const label = mCall[1] || 'Nota';
      const buf = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') { buf.push(lines[i]); i++; }
      i++; // saltar el cierre
      out.push(
        <div key={`c-${k++}`} className="ay-callout">
          <div className="ay-callout-label">{label}</div>
          <p>{renderInline(buf.join(' ').trim(), `c-${k}`)}</p>
        </div>
      );
      continue;
    }

    // ── Mechanism block ─────────────────────────────────────
    if (/^:::mechanism\s*$/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') { buf.push(lines[i]); i++; }
      i++;
      // Separar por --- en sub-bloques
      const cards = [[]];
      for (const l of buf) {
        if (/^---\s*$/.test(l)) cards.push([]);
        else cards[cards.length - 1].push(l);
      }
      const parsed = cards.map(sub => {
        const obj = {};
        for (const l of sub) {
          const mm = /^([a-z]+):\s*(.+)$/i.exec(l.trim());
          if (mm) obj[mm[1].toLowerCase()] = mm[2];
        }
        return obj;
      }).filter(c => c.title || c.desc);
      out.push(
        <div key={`m-${k++}`} className="ay-mechanism" role="list">
          {parsed.map((c, ix) => (
            <div key={ix} className="ay-mech-card" role="listitem">
              {c.label && <div className="ay-mech-label">{c.label}</div>}
              {c.title && <h3 className="ay-mech-title">{c.title}</h3>}
              {c.desc  && <p className="ay-mech-desc">{c.desc}</p>}
            </div>
          ))}
        </div>
      );
      continue;
    }

    // ── H2 / H3 (H1 se maneja aparte en el header) ──────────
    const mH2 = /^##\s+(.+)$/.exec(line);
    if (mH2) {
      const raw = mH2[1].trim();
      const id  = slugify(raw.replace(/[_*`]/g, ''));
      toc.push({ id, texto: raw.replace(/[_*`]/g, '') });
      out.push(<h2 key={`h-${k++}`} id={id}>{renderInline(raw, `h-${k}`)}</h2>);
      i++; continue;
    }
    const mH3 = /^###\s+(.+)$/.exec(line);
    if (mH3) {
      const raw = mH3[1].trim();
      const id  = slugify(raw.replace(/[_*`]/g, ''));
      out.push(<h3 key={`h-${k++}`} id={id} style={{ fontFamily: 'var(--ay-font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', margin: '32px 0 12px' }}>{renderInline(raw, `h-${k}`)}</h3>);
      i++; continue;
    }

    // ── Listas ──────────────────────────────────────────────
    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ''));
        i++;
      }
      out.push(
        <ul key={`u-${k++}`}>
          {items.map((it, ix) => <li key={ix}>{renderInline(it, `u-${k}-${ix}`)}</li>)}
        </ul>
      );
      continue;
    }

    // ── Separador ───────────────────────────────────────────
    if (/^---\s*$/.test(line)) {
      out.push(<hr key={`hr-${k++}`} style={{ border: 0, borderTop: '1px solid var(--ay-line)', margin: '32px 0' }} />);
      i++; continue;
    }

    // ── Párrafo (agrupa hasta línea en blanco) ──────────────
    if (line.trim() === '') { i++; continue; }
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^(##|###|:::|-\s|---\s*$)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(<p key={`p-${k++}`}>{renderInline(buf.join(' '), `p-${k}`)}</p>);
  }

  return { body: out, toc };
}

export { slugify };
