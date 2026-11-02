// Shared sketch/mural constants used by the live wall (SketchRoom) and the
// read-only gallery thumbnails (SketchGallery). Must match backend SketchSession.SIZE.

export const SIZE = 32; // logical grid (cells per side)
export const EMPTY = -1; // unpainted cell
export const EMPTY_COLOR = '#fefcf5';

// Fixed, on-tone group palette (kept small so murals stay cohesive).
export const PALETTE = [
  '#1b1a1d', '#5a4a42', '#8b5a3c', '#c19c4d',
  '#eadb74', '#a0b335', '#537c44', '#6bb9b6',
  '#596faf', '#945b28', '#b8aab0', '#fbfaf9',
];

export const createEmptyGrid = () =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));

/** Draw a pixel grid (int[][] of palette indices) onto a canvas 2D context at the given cell size. */
export const renderGrid = (ctx, grid, cell, withGridLines = true) => {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = grid[y]?.[x];
      ctx.fillStyle = idx == null || idx === EMPTY ? EMPTY_COLOR : (PALETTE[idx] ?? EMPTY_COLOR);
      ctx.fillRect(x * cell, y * cell, cell, cell);
      if (withGridLines) {
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell, cell);
      }
    }
  }
};
