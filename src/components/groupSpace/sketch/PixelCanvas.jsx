import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SIZE, EMPTY, EMPTY_COLOR, PALETTE, createEmptyGrid } from './sketchConstants';

/**
 * Local-only pixel drawing surface (no STOMP). Used by the mafia DRAW phase
 * where each player draws privately. Exposes getGrid()/reset() via ref so the
 * parent can read the final grid at submit time.
 */
const PixelCanvas = forwardRef(function PixelCanvas({ cell = 14, disabled = false }, ref) {
  const canvasRef = useRef(null);
  const gridRef = useRef(createEmptyGrid());
  const drawingRef = useRef(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [tool, setTool] = useState('PEN');

  const paintCell = useCallback((ctx, cx, cy) => {
    const idx = gridRef.current[cy][cx];
    ctx.fillStyle = idx === EMPTY ? EMPTY_COLOR : (PALETTE[idx] ?? EMPTY_COLOR);
    ctx.fillRect(cx * cell, cy * cell, cell, cell);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.strokeRect(cx * cell + 0.5, cy * cell + 0.5, cell, cell);
  }, [cell]);

  const renderAll = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) paintCell(ctx, x, y);
  }, [paintCell]);

  useEffect(() => { renderAll(); }, [renderAll]);

  useImperativeHandle(ref, () => ({
    getGrid: () => gridRef.current.map((r) => r.slice()),
    reset: () => { gridRef.current = createEmptyGrid(); renderAll(); },
  }), [renderAll]);

  const cellFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / cell),
      y: Math.floor((e.clientY - rect.top) / cell),
    };
  };

  const paintAt = (e) => {
    if (disabled) return;
    const { x, y } = cellFromEvent(e);
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
    gridRef.current[y][x] = tool === 'ERASE' ? EMPTY : colorIndex;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintCell(ctx, x, y);
  };

  const down = (e) => { if (disabled) return; drawingRef.current = true; paintAt(e); };
  const move = (e) => { if (drawingRef.current) paintAt(e); };
  const up = () => { drawingRef.current = false; };

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <canvas
        ref={canvasRef}
        width={SIZE * cell}
        height={SIZE * cell}
        style={{
          border: '3px solid #8b5a3c', borderRadius: 6, background: EMPTY_COLOR,
          cursor: disabled ? 'not-allowed' : 'crosshair', touchAction: 'none', opacity: disabled ? 0.6 : 1,
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 150 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {PALETTE.map((c, i) => (
            <button
              key={i}
              disabled={disabled}
              onClick={() => { setColorIndex(i); setTool('PEN'); }}
              aria-label={`color ${i}`}
              style={{
                width: 30, height: 24, borderRadius: 4, padding: 0, cursor: 'pointer', background: c,
                outline: tool === 'PEN' && colorIndex === i ? '3px solid #5a4a42' : '1px solid #ccc',
              }}
            />
          ))}
        </div>
        <button disabled={disabled} onClick={() => setTool('PEN')}
          style={{ ...btn, fontWeight: tool === 'PEN' ? 700 : 400 }}>✏️ 펜</button>
        <button disabled={disabled} onClick={() => setTool('ERASE')}
          style={{ ...btn, fontWeight: tool === 'ERASE' ? 700 : 400 }}>🧽 지우개</button>
      </div>
    </div>
  );
});

const btn = { padding: '8px 10px', border: '1px solid #d8b894', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4a42', textAlign: 'left' };

export default PixelCanvas;
