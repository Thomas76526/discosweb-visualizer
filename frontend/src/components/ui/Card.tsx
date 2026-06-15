import { type HTMLAttributes, type ReactNode } from 'react';
import './Card.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  // title 在 HTMLAttributes 是 string,但 Card 想接受 ReactNode(可塞 <span> 等)
  // 用 Omit 排除原生 title,自己定义
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** When true, the card uses bg-elevated (above surface) */
  elevated?: boolean;
}

export function Card({
  title,
  subtitle,
  actions,
  elevated,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = ['card', elevated ? 'card--elevated' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} {...rest}>
      {(title || subtitle || actions) && (
        <header className="card__head">
          <div className="card__heading">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}