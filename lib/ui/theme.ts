export const colors = {
  // Pistachio, the calculator's operator colour. Text on it is `onHero` (dark ink, ~8.9:1); cream would be ~1.8:1.
  hero: '#cab356',
  onHero: '#20120A',
  onHeroScrim: 'rgba(32,18,10,0.12)',
  // Accent: a paler, whiter take on the header pistachio.
  accent: '#ddd09a',
  gold: '#cab356',
  sage: '#b7c2a9',
  bg: '#1A110B',
  surface: '#261A12',
  surface2: '#352619',
  text: '#FBEFE3',
  sub: '#B39A86',
  ink: '#20120A',
  ringFill: '#120B07',
  accentLine: '#c4b878',
  danger: '#B5524A',
  dangerText: '#E8837A',
  accentContainer: '#3d3820',
  sageContainer: '#2E3829',
  outline: 'rgba(179,154,134,0.6)',
  shadow: '#000000',
  backdrop: 'rgba(0,0,0,0.5)',
  ringEdge: 'rgba(202,179,86,0.3)',
} as const;

export const fonts = {
  display: 'Harmera',
  heading: 'Rubik_700Bold',
  name: 'Rubik_500Medium',
  body: 'Geist_400Regular',
  bodyBold: 'Geist_600SemiBold',
} as const;

export const space = { gutter: 16 } as const;

/** Text size roles (sp). Nothing below `caption`; inputs and body copy use `body`. */
export const type = { caption: 12, label: 13, small: 14, body: 16 } as const;

/** Material You style corner radii. */
export const shape = { sm: 8, md: 12, lg: 16, card: 24, bar: 20, xl: 28 } as const;

export const sizes = {
  card: 56,
  fab: 50,
  send: 50,
  dock: 56,
  loginHero: 232,
} as const;
