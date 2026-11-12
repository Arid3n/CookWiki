import { sizes } from './theme';

/** Height of the orange header below the status bar, per route. Screens must use the same value for their spacer. */
export function heroHeightFor(pathname: string): number {
  if (pathname.startsWith('/food/') || pathname === '/scan') return 270;
  if (pathname === '/login') return sizes.loginHero;
  // Between the library header (150) and the scan / food header (270).
  if (pathname === '/settings' || pathname === '/chat') return 210;
  return 150;
}

/** The tallest header; the contour pattern is drawn once at this height so it never rescales. */
export const HERO_MAX_HEIGHT = 270;
