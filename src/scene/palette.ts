/* PALETA DE LAS ESCENAS 3D — debe acompañar a los colores CSS (src/styles/global.css) */
export type PaletteKey = 'body' | 'db' | 'edge' | 'ui' | 'accent' | 'line' | 'dim' | 'sky' | 'ground';
export type Palette = Record<PaletteKey, number> & { hemiI: number; keyI: number };

export const PALETTE: Record<'light' | 'dark', Palette> = {
  light: { body: 0xffffff, db: 0xe9ecf2, edge: 0x1a1d23, ui: 0xc6ccd6, accent: 0x2447d8, line: 0x1a1d23, dim: 0xaab0bb, sky: 0xffffff, ground: 0xcdd2db, hemiI: 0.9, keyI: 0.5 },
  dark: { body: 0x252a33, db: 0x2d333e, edge: 0xc4cad6, ui: 0x3d4450, accent: 0x8ea8ff, line: 0xc4cad6, dim: 0x4d5461, sky: 0xa0acc6, ground: 0x0e1014, hemiI: 0.8, keyI: 0.45 },
};
export const CK: PaletteKey[] = ['body', 'db', 'edge', 'ui', 'accent', 'line', 'dim', 'sky', 'ground'];
