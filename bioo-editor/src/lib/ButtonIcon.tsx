// Componente que renderiza un icono del set BUTTON_ICONS por su key.
// Usa `dangerouslySetInnerHTML` porque el SVG interior viene como string
// generado por scripts/extract-icons.mjs (data estática, no input externo).
import type { CSSProperties } from 'react';
import { BUTTON_ICON_MAP } from './buttonIcons';

interface Props {
  iconKey: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ButtonIcon({ iconKey, size = 18, className, style }: Props): JSX.Element | null {
  const def = BUTTON_ICON_MAP[iconKey];
  if (!def) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: def.svg }}
    />
  );
}
