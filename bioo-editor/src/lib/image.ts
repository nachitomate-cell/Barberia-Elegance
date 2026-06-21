interface Opts {
  square?: boolean;
  maxW?: number;
  quality?: number;
}

/** Lee un File de imagen, lo recorta/escala y devuelve un data URL JPEG. */
export function fileToDataUrl(file: File, opts: Opts = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('not-image'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('no-canvas'));
          return;
        }
        const quality = opts.quality ?? 0.82;
        if (opts.square) {
          const size = opts.maxW ?? 320;
          const s = Math.min(img.width, img.height);
          const sx = (img.width - s) / 2;
          const sy = (img.height - s) / 2;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        } else {
          const maxW = opts.maxW ?? 1200;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('img-load'));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}
