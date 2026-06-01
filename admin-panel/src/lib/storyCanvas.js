// Utilidades compartidas para generar imágenes (historias de Instagram) en canvas.
// Usadas por los generadores de Productos y Marketing.

export const STORY_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const STORY_BG_PRESETS = ['#0F172A', '#000000', '#FFFFFF', '#1C1917', '#0A2540', '#3B0764', '#064E3B', '#7C2D12'];

// Luminancia relativa (0..1) de un color hex (#rgb o #rrggbb).
export function lum(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return ((0.299 * ((n >> 16) & 255)) + (0.587 * ((n >> 8) & 255)) + (0.114 * (n & 255))) / 255;
}

// Carga una imagen con CORS anónimo. Resuelve a la imagen o null si falla.
export function loadImg(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload  = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = url + (url.includes('?') ? '&' : '?') + '_cb=1';
  });
}

// Dibuja una imagen recortada tipo object-fit:cover dentro de un rect redondeado.
export function drawCover(ctx, img, x, y, w, h, r) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.clip();
  const ir = img.width / img.height, tr = w / h;
  let sw, sh, sx, sy;
  if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
  else         { sw = img.width;  sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

// Recorta un texto a una sola línea con elipsis si excede maxW (ctx.font ya seteado).
export function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

// Divide un texto en hasta maxLines líneas que caben en maxW (ctx.font ya seteado).
export function wrapLines(ctx, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const test = cur ? cur + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width <= maxW) cur = test;
    else { if (cur) lines.push(cur); cur = words[i]; if (lines.length === maxLines) break; }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (lines.length === maxLines && used < words.length) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(last + '…').width > maxW) last = last.replace(/\s*\S+$/, '');
    lines[maxLines - 1] = (last || '') + '…';
  }
  return lines;
}
