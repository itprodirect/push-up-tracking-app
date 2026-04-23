import type { CSSProperties } from 'react';

export type PageHeroVariant = 'default' | 'compact';

export function PageHero({
  image,
  alt = '',
  variant = 'default',
  className,
}: {
  image: string;
  alt?: string;
  variant?: PageHeroVariant;
  className?: string;
}) {
  const style = { '--page-hero-image': `url(${JSON.stringify(image)})` } as CSSProperties;
  const classes = ['page-hero', `page-hero-${variant}`, className].filter(Boolean).join(' ');
  return (
    <div
      className={classes}
      style={style}
      role={alt ? 'img' : 'presentation'}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  );
}
