'use strict';

// functions/lib/wallet-render.js
// ─────────────────────────────────────────────────────────────────
//  RENDERER DE ESTAMPAS PARA GOOGLE WALLET
//
//  Dibuja la "tarjeta de sellos" (circulitos que se llenan) como PNG
//  para usarla de heroImage del LoyaltyObject. El estado es finito
//  (filled/target/color) y se codifica en la URL del endpoint HTTP
//  walletStampImg, así Google Wallet la cachea por URL — costo de
//  cómputo equivalente a pre-renderizar, sin plomería de Storage.
//
//  Sin dependencias de fuentes: todo se dibuja con paths (arcos +
//  strokes), para que el render sea 100% determinista en Cloud Functions.
// ─────────────────────────────────────────────────────────────────

const { createCanvas } = require('@napi-rs/canvas');

// heroImage recomendado por Google: ratio ~3:1. 1032×336 es el tamaño guía.
const W = 1032;
const H = 336;

function normHex(c, fallback) {
  const s = String(c || '').replace(/[^0-9a-fA-F]/g, '');
  if (s.length === 3) return '#' + s.split('').map(x => x + x).join('');
  if (s.length === 6) return '#' + s;
  return fallback;
}

// Dibuja el tick (✓) dentro de un sello lleno, con strokes (sin fuente).
function drawCheck(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.18);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.08, cy + r * 0.36);
  ctx.lineTo(cx + r * 0.46, cy - r * 0.34);
  ctx.stroke();
}

// Estrella de 5 puntas (celda del premio cuando aún no se llena).
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

/**
 * Renderiza la tira de estampas y devuelve un Buffer PNG.
 * width/height permiten otros lienzos (Apple strip); por defecto
 * mantiene EXACTAMENTE las dimensiones Google (heroImage 1032×336).
 * @param {{filled:number, target:number, accent?:string, bg?:string, width?:number, height?:number}} opts
 */
function renderStampStrip({ filled = 0, target = 10, accent, bg, width, height } = {}) {
  const w = Math.max(100, Math.round(Number(width) || W));
  const h = Math.max(40, Math.round(Number(height) || H));
  const n = Math.max(1, Math.min(40, Math.round(Number(target) || 10)));
  const done = Math.max(0, Math.min(n, Math.round(Number(filled) || 0)));
  const accentHex = normHex(accent, '#c9a84c');
  const bgHex = normHex(bg, '#0a0a0a');

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  // Layout en grilla: hasta 5 por fila; con target grande usamos 2 filas.
  // Padding proporcional (70/1032 y 60/336) → idéntico al histórico en Google.
  const cols = n <= 5 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / cols);
  const padX = Math.round(w * (70 / 1032));
  const padY = Math.round(h * (60 / 336));
  const cellW = (w - padX * 2) / cols;
  const cellH = (h - padY * 2) / rows;
  const r = Math.max(14, Math.min(cellW, cellH) * 0.34);

  for (let i = 0; i < n; i++) {
    const rowI = Math.floor(i / cols);
    const colI = i % cols;
    // Centrado horizontal de la última fila si queda incompleta.
    const itemsThisRow = rowI === rows - 1 ? n - cols * (rows - 1) : cols;
    const rowOffset = ((cols - itemsThisRow) * cellW) / 2;
    const cx = padX + rowOffset + cellW * colI + cellW / 2;
    const cy = padY + cellH * rowI + cellH / 2;

    const isFilled = i < done;
    const isPrize = i === n - 1;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);

    if (isFilled) {
      ctx.fillStyle = accentHex;
      ctx.fill();
      drawCheck(ctx, cx, cy, r, bgHex);
    } else if (isPrize) {
      // Premio pendiente: aro punteado + estrella tenue del color de marca.
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = Math.max(2, r * 0.13);
      ctx.setLineDash([r * 0.5, r * 0.34]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.55;
      drawStar(ctx, cx, cy, r * 0.5, accentHex);
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.26)';
      ctx.lineWidth = Math.max(2, r * 0.11);
      ctx.stroke();
    }
  }

  return canvas.toBuffer('image/png');
}

/**
 * Ícono cuadrado para Apple Wallet (obligatorio en el .pkpass): un sello
 * lleno con su tick, sobre el color de fondo del tenant. Sin fuentes,
 * mismo criterio determinista que la tira.
 * @param {{size?:number, accent?:string, bg?:string}} opts
 */
function renderIcon({ size = 87, accent, bg } = {}) {
  const s = Math.max(29, Math.round(Number(size) || 87));
  const accentHex = normHex(accent, '#c9a84c');
  const bgHex = normHex(bg, '#0a0a0a');

  const canvas = createCanvas(s, s);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, s, s);

  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.36;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = accentHex;
  ctx.fill();
  drawCheck(ctx, cx, cy, r, bgHex);

  return canvas.toBuffer('image/png');
}

module.exports = { renderStampStrip, renderIcon, W, H };
