import { useEffect, useRef } from 'react';
import { SIZE, EMPTY_COLOR, renderGrid } from './sketchConstants';

/** Renders one pixel grid (int[][] of palette indices) onto a small canvas. */
export default function MuralThumb({ pixels, cell }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx && Array.isArray(pixels)) renderGrid(ctx, pixels, cell, false);
  }, [pixels, cell]);
  return (
    <canvas
      ref={ref}
      width={SIZE * cell}
      height={SIZE * cell}
      style={{ border: '2px solid #8b5a3c', borderRadius: 4, background: EMPTY_COLOR, imageRendering: 'pixelated' }}
    />
  );
}
