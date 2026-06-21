interface Piece {
  x: number; y: number; w: number; h: number; c: string;
  vy: number; vx: number; rot: number; vr: number; sway: number;
}

/** Confeti de celebración con la paleta de bioo. Se autolimpia (~2.9s). */
export function confetti(): void {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const W = (canvas.width = window.innerWidth);
  const H = (canvas.height = window.innerHeight);
  const COL = ['#92c83a', '#a3d94a', '#74b32b', '#2c5a17', '#d2f34c', '#ffffff', '#5a9a1e'];
  const pieces: Piece[] = Array.from({ length: 150 }, (_, i) => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.35,
    w: 6 + Math.random() * 7,
    h: 9 + Math.random() * 8,
    c: COL[i % COL.length],
    vy: 2.6 + Math.random() * 3.6,
    vx: -1.6 + Math.random() * 3.2,
    rot: Math.random() * 6.28,
    vr: -0.22 + Math.random() * 0.44,
    sway: Math.random() * 6.28,
  }));

  const DUR = 2900;
  let start: number | null = null;

  const frame = (ts: number): void => {
    if (start === null) start = ts;
    const t = ts - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.sway += 0.05;
      p.x += p.vx + Math.sin(p.sway) * 0.8;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = t > DUR - 700 ? Math.max(0, (DUR - t) / 700) : 1;
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < DUR && document.body.contains(canvas)) requestAnimationFrame(frame);
    else canvas.remove();
  };

  requestAnimationFrame(frame);
}
