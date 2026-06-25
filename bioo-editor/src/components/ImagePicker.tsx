import { useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { fileToDataUrl } from '../lib/image';

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
  square?: boolean;
  maxW?: number;
  label?: string;
}

export default function ImagePicker({ value, onChange, square, maxW, label = 'Subir imagen' }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file, { square, maxW });
      onChange(url);
    } catch {
      /* archivo no válido */
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100 ${
          square ? 'h-14 w-14 rounded-full' : 'h-14 w-24 rounded-lg'
        }`}
      >
        {value && <img src={value} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-bioo active:bg-neutral-50"
        >
          <Camera size={16} /> {label}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-500 transition-colors hover:text-red-500 active:bg-red-50"
          >
            <Trash2 size={16} /> Quitar
          </button>
        )}
      </div>
      {/* En móvil, accept="image/*" deja al sistema mostrar "tomar foto / elegir
          de la galería". No forzamos capture para no eliminar la opción de galería. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
