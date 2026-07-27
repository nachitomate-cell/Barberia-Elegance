'use strict';

// functions/lib/wallet-render.js
// ─────────────────────────────────────────────────────────────────
//  RENDERER DE ESTAMPAS (Google heroImage + Apple strip)
//
//  Dibuja la "tarjeta de sellos" como PNG. Diseño v2 (2026-07-26):
//  estampas con degradado + glow (efecto moneda), vacíos como sockets
//  con profundidad, premio = estrella con brillo, fondo con gradiente
//  sutil, y una barra de progreso que conecta las estampas por fila.
//
//  El estado es finito (filled/target/color) y se codifica en la URL
//  del endpoint HTTP walletStampImg, así Google Wallet la cachea por
//  URL — costo de cómputo equivalente a pre-renderizar.
//
//  Sin dependencias de fuentes: todo se dibuja con paths (arcos,
//  strokes, gradientes) para que el render sea 100% determinista.
// ─────────────────────────────────────────────────────────────────

const { createCanvas } = require('@napi-rs/canvas');

// heroImage recomendado por Google: ratio ~3:1. 1032×336 es el tamaño guía.
const W = 1032;
const H = 336;
const TAU = Math.PI * 2;

function normHex(c, fallback) {
  const s = String(c || '').replace(/[^0-9a-fA-F]/g, '');
  if (s.length === 3) return '#' + s.split('').map(x => x + x).join('');
  if (s.length === 6) return '#' + s;
  return fallback;
}

// ── Utilidades de color (mezcla hacia blanco/negro, contraste) ────
function toRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function toHex(a) { return '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mix(hex, target, amt) { const a = toRgb(hex); return toHex(a.map((v, i) => v + (target[i] - v) * amt)); }
const lighten = (hex, amt) => mix(hex, [255, 255, 255], amt);
const darken  = (hex, amt) => mix(hex, [0, 0, 0], amt);
function lum(hex) { const [r, g, b] = toRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
const contrastOn = (hex) => (lum(hex) > 0.6 ? '#0b0b0b' : '#ffffff');

// Tick (✓) dentro de un sello lleno, con strokes (sin fuente).
function drawCheck(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.08, cy + r * 0.36);
  ctx.lineTo(cx + r * 0.46, cy - r * 0.34);
  ctx.stroke();
}

// Estrella de 5 puntas (celda del premio).
function drawStar(ctx, cx, cy, rOut, color) {
  const rIn = rOut * 0.45;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? rOut : rIn;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Íconos de estampa (glyphs) — todos con paths, sin fuentes ─────
function drawHeart(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  const r = s * 0.5;
  ctx.beginPath();
  ctx.arc(cx - r * 0.55, cy - r * 0.32, r * 0.62, 0, TAU);
  ctx.arc(cx + r * 0.55, cy - r * 0.32, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.08, cy - r * 0.05);
  ctx.lineTo(cx + r * 1.08, cy - r * 0.05);
  ctx.lineTo(cx, cy + r * 1.08);
  ctx.closePath();
  ctx.fill();
}
function drawCoffee(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const w = r * 0.92, h = r * 0.82, left = cx - w / 2, top = cy - h / 2 + r * 0.06;
  ctx.beginPath();
  ctx.moveTo(left, top); ctx.lineTo(left + w, top);
  ctx.lineTo(left + w * 0.85, top + h); ctx.lineTo(left + w * 0.15, top + h);
  ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.arc(left + w + r * 0.03, top + h * 0.42, r * 0.23, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.16, top - r * 0.3); ctx.quadraticCurveTo(cx, top - r * 0.14, cx - r * 0.16, top - r * 0.02);
  ctx.moveTo(cx + r * 0.18, top - r * 0.3); ctx.quadraticCurveTo(cx + r * 0.34, top - r * 0.14, cx + r * 0.18, top - r * 0.02);
  ctx.stroke();
}
function drawFork(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, r * 0.11);
  const topY = cy - r * 0.6, botY = cy + r * 0.64, fx = cx - r * 0.4;
  for (const dx of [-r * 0.15, 0, r * 0.15]) { ctx.beginPath(); ctx.moveTo(fx + dx, topY); ctx.lineTo(fx + dx, cy - r * 0.14); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(fx - r * 0.15, cy - r * 0.14); ctx.lineTo(fx + r * 0.15, cy - r * 0.14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx, cy - r * 0.14); ctx.lineTo(fx, botY); ctx.stroke();
  const kx = cx + r * 0.42;
  ctx.beginPath(); ctx.moveTo(kx, cy - r * 0.05); ctx.lineTo(kx, botY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(kx, topY); ctx.quadraticCurveTo(kx + r * 0.2, topY + r * 0.2, kx, cy - r * 0.05); ctx.quadraticCurveTo(kx - r * 0.06, cy - r * 0.3, kx, topY); ctx.closePath(); ctx.fill();
}
function drawWine(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const topY = cy - r * 0.58;
  ctx.beginPath(); ctx.moveTo(cx - r * 0.4, topY); ctx.lineTo(cx + r * 0.4, topY); ctx.arc(cx, topY, r * 0.4, 0, Math.PI); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, topY + r * 0.4); ctx.lineTo(cx, cy + r * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.32, cy + r * 0.5); ctx.lineTo(cx + r * 0.32, cy + r * 0.5); ctx.stroke();
}

// Despacha el ícono de la estampa llena (default: check).
function drawGlyph(ctx, cx, cy, r, id, color) {
  switch (id) {
    case 'star':   return drawStar(ctx, cx, cy, r * 0.62, color);
    case 'heart':  return drawHeart(ctx, cx, cy, r * 0.72, color);
    case 'coffee': return drawCoffee(ctx, cx, cy, r, color);
    case 'fork':   return drawFork(ctx, cx, cy, r, color);
    case 'wine':   return drawWine(ctx, cx, cy, r, color);
    case 'check':
    default:       return drawCheck(ctx, cx, cy, r, color);
  }
}

// Sello lleno: degradado radial (efecto moneda) + glow del color de marca.
function fillStamp(ctx, cx, cy, r, accentHex) {
  ctx.save();
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = r * 0.55;
  ctx.shadowOffsetY = r * 0.05;
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, lighten(accentHex, 0.32));
  g.addColorStop(0.55, accentHex);
  g.addColorStop(1, darken(accentHex, 0.14));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Brillo superior tenue (reflejo).
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = lighten(accentHex, 0.6);
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renderiza la tira de estampas y devuelve un Buffer PNG.
 * width/height permiten otros lienzos (Apple strip); por defecto
 * mantiene las dimensiones Google (heroImage 1032×336). track=true
 * dibuja la barra de progreso (Opción A elegida 2026-07-26).
 *
 * hitos: array 1-indexed de casillas que son "premio intermedio" (⭐ en
 * vez del glyph normal). No incluye el `target` (esa siempre es ⭐).
 * Sirve para el modelo "sello 3 → 10% dcto, sello 5 → café gratis…":
 * el cliente ve dónde están las recompensas sin tener que ir al reverso.
 *
 * @param {{filled:number, target:number, accent?:string, bg?:string, width?:number, height?:number, track?:boolean, icon?:string, hitos?:number[]}} opts
 */
function renderStampStrip({ filled = 0, target = 10, accent, bg, width, height, track = true, icon = 'check', hitos = [] } = {}) {
  const w = Math.max(100, Math.round(Number(width) || W));
  const h = Math.max(40, Math.round(Number(height) || H));
  const n = Math.max(1, Math.min(40, Math.round(Number(target) || 10)));
  const done = Math.max(0, Math.min(n, Math.round(Number(filled) || 0)));
  const accentHex = normHex(accent, '#c9a84c');
  const bgHex = normHex(bg, '#0a0a0a');
  // Set de hitos válidos (1-indexed, dentro de rango, excluye el target).
  const hitosSet = new Set(
    (Array.isArray(hitos) ? hitos : [])
      .map((x) => Math.round(Number(x)))
      .filter((x) => Number.isFinite(x) && x >= 1 && x < n),
  );

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Fondo: gradiente vertical sutil (profundidad, no negro plano).
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, lighten(bgHex, 0.07));
  bgGrad.addColorStop(1, darken(bgHex, 0.12));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Grilla: hasta 5 por fila; con target grande, 2 filas. Padding
  // proporcional (70/1032 y 52/336) para no romper el look en Google.
  const cols = n <= 5 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / cols);
  const padX = Math.round(w * (70 / 1032));
  const padY = Math.round(h * (52 / 336));
  const cellW = (w - padX * 2) / cols;
  const cellH = (h - padY * 2) / rows;
  const r = Math.max(14, Math.min(cellW, cellH) * 0.36);

  const center = (i) => {
    const rowI = Math.floor(i / cols);
    const colI = i % cols;
    const itemsThisRow = rowI === rows - 1 ? n - cols * (rows - 1) : cols;
    const rowOffset = ((cols - itemsThisRow) * cellW) / 2;
    return { cx: padX + rowOffset + cellW * colI + cellW / 2, cy: padY + cellH * rowI + cellH / 2 };
  };

  // Barra de progreso (detrás de los círculos), por fila: track tenue
  // completo + tramo de acento hasta la última estampa llena de la fila.
  if (track) {
    ctx.lineCap = 'round';
    for (let rowI = 0; rowI < rows; rowI++) {
      const first = rowI * cols;
      const last = Math.min(n - 1, first + cols - 1);
      const a = center(first);
      const b = center(last);
      ctx.strokeStyle = lighten(bgHex, 0.16);
      ctx.lineWidth = Math.max(3, r * 0.18);
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke();
      const lastFilledInRow = Math.min(last, done - 1);
      if (lastFilledInRow >= first) {
        const c = center(lastFilledInRow);
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = Math.max(3, r * 0.18);
        ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(c.cx, c.cy); ctx.stroke();
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const { cx, cy } = center(i);
    const isFilled = i < done;
    const isPrize = i === n - 1;
    const isHito = hitosSet.has(i + 1);

    if (isFilled) {
      fillStamp(ctx, cx, cy, r, accentHex);
      if (isPrize || isHito) drawStar(ctx, cx, cy, r * 0.5, contrastOn(accentHex));
      else drawGlyph(ctx, cx, cy, r, icon, contrastOn(accentHex));
    } else if (isPrize) {
      // Premio pendiente: aro punteado + estrella con brillo.
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.setLineDash([r * 0.55, r * 0.36]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = r * 0.55;
      drawStar(ctx, cx, cy, r * 0.55, accentHex);
      ctx.restore();
    } else if (isHito) {
      // Hito pendiente: aro punteado + estrella un poco más chica que el prize
      // final (para diferenciarlo del premio grande). Mismo lenguaje visual.
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.setLineDash([r * 0.4, r * 0.28]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = r * 0.4;
      drawStar(ctx, cx, cy, r * 0.42, accentHex);
      ctx.restore();
    } else {
      // Vacío = "socket": disco un pelo más claro que el fondo + aro
      // sutil + punto tenue del color de marca (hint de que falta llenar).
      ctx.fillStyle = lighten(bgHex, 0.09);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = lighten(bgHex, 0.2);
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.97, 0, TAU); ctx.stroke();
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = accentHex;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.13, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  return canvas.toBuffer('image/png');
}

/**
 * Ícono cuadrado para Apple Wallet (obligatorio en el .pkpass): un sello
 * lleno con su tick, con el mismo tratamiento de la tira.
 * @param {{size?:number, accent?:string, bg?:string}} opts
 */
function renderIcon({ size = 87, accent, bg, icon = 'check' } = {}) {
  const s = Math.max(29, Math.round(Number(size) || 87));
  const accentHex = normHex(accent, '#c9a84c');
  const bgHex = normHex(bg, '#0a0a0a');

  const canvas = createCanvas(s, s);
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, 0, s);
  bgGrad.addColorStop(0, lighten(bgHex, 0.07));
  bgGrad.addColorStop(1, darken(bgHex, 0.12));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, s, s);

  fillStamp(ctx, s / 2, s / 2, s * 0.34, accentHex);
  drawGlyph(ctx, s / 2, s / 2, s * 0.34, icon, contrastOn(accentHex));

  return canvas.toBuffer('image/png');
}

module.exports = { renderStampStrip, renderIcon, W, H };
