import { type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import './Surface.css';

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  /** Polymorphic element type. Defaults to <div>. */
  as?: ElementType;
  /** Elevation level — 0=canvas, 1=surface, 2=elevated */
  elevation?: 0 | 1 | 2;
  /** Strip outer padding (useful when composing inside another Surface) */
  flush?: boolean;
  children?: ReactNode;
}

/**
 * Surface — a step in the visual layer cake.
 *
 *   elevation=0  → bg-canvas   (root background)
 *   elevation=1  → bg-surface  (topbar, sidebar, configpanel)
 *   elevation=2  → bg-elevated (cards, popovers)
 *
 * Hierarchy comes from lightness, not shadow. Use Surface to express
 * "this is one layer above the surrounding context".
 */
export function Surface({
  as,
  elevation = 1,
  flush,
  className,
  children,
  ...rest
}: SurfaceProps) {
  const Component: ElementType = as ?? 'div';
  const classes = [
    'surface',
    `surface--e${elevation}`,
    flush ? 'surface--flush' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}