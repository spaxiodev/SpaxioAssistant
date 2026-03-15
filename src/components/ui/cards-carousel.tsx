'use client';

import { cn } from '@/lib/utils';

type CardsCarouselProps = {
  children: React.ReactNode;
  className?: string;
  /** Grid cols on desktop: default 'md:grid-cols-3'. Use 'md:grid-cols-2 lg:grid-cols-4' for 4-column layout. */
  gridClass?: string;
};

/**
 * On mobile: horizontal scroll carousel with snap. On desktop: grid.
 * Wrap card items so they get proper carousel width on small screens.
 */
export function CardsCarousel({
  children,
  className,
  gridClass = 'md:grid-cols-3',
}: CardsCarouselProps) {
  return (
    <div
      className={cn(
        'flex gap-4 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth',
        'snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible [scrollbar-width:thin]',
        'md:grid md:overflow-visible',
        gridClass,
        className
      )}
      style={{ scrollbarGutter: 'stable' }}
    >
      {children}
    </div>
  );
}

/**
 * Wrap each card in the carousel so it has a fixed width on mobile and snaps.
 */
export function CardsCarouselItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-[min(85vw,280px)] shrink-0 snap-start sm:min-w-0 md:min-w-0',
        className
      )}
    >
      {children}
    </div>
  );
}
