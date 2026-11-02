import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import client from '../../../libs/socket/client';
import SketchGallery from './SketchGallery';
import { SIZE, EMPTY, EMPTY_COLOR, PALETTE, createEmptyGrid } from './sketchConstants';

const CELL = 16; // px per cell on screen

export default function SketchRoom() {
  const { woomsId } = useParams();
  const navigate = useNavigate();
  const nickname = useSelector((s) => s.auth?.userInfo?.nickname) || 'guest';

  const canvasRef = useRef(null);
  const gridRef = useRef(createEmptyGrid());
  const drawingRef = useRef(false);
  const connectedRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [tool, setTool] = useState('PEN'); // 'PEN' | 'ERASE'
  const [showGallery, setShowGallery] = useState(false);

  // --- rendering ---------------------------------------------------------
  const paintCell = useCallback((ctx, cx, cy) => {
    const idx = gridRef.current[cy][cx];
    ctx.fillStyle = idx === EMPTY ? EMPTY_COLOR : PALETTE[idx] ?? EMPTY_COLOR;
    ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.strokeRect(cx * CELL + 0.5, cy * CELL + 0.5, CELL, CELL);
  }, []);

  const renderAll = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) paintCell(ctx, x, y);
    }
  }, [paintCell]);

  // apply a stroke (local or remote) to the grid + canvas
  const applyStroke = useCallback((m) => {
    const grid = gridRef.current;
    if (m.tool === 'CLEAR' || m.tool === 'RESET') {
      // RESET arrives after someone archives the wall — start the new blank mural.
      gridRef.current = createEmptyGrid();
      renderAll();
      return;
    }
    const { x, y } = m;
    if (x == null || y == null || x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
    grid[y][x] = m.tool === 'ERASE' ? EMPTY : m.colorIndex;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintCell(ctx, x, y);
  }, [paintCell, renderAll]);

  // initial paint
  useEffect(() => { renderAll(); }, [renderAll]);

  // --- STOMP wiring ------------------------------------------------------
  useEffect(() => {
    if (!woomsId) return;
    const subs = [];

    const subscribeAll = () => {
      // drop any stale subscriptions before re-subscribing (e.g. on auto-reconnect)
      subs.forEach((s) => { try { s.unsubscribe(); } catch (_) {} });
      subs.length = 0;
      connectedRef.current = true;
      setConnected(true);
      // init queue MUST be subscribed before the draw topic, because the
      // server pushes the snapshot in reaction to the draw-topic subscribe.
      subs.push(
        client.subscribe('/user/queue/sketch/init', (msg) => {
          try {
            const snap = JSON.parse(msg.body); // { size, pixels }
            if (Array.isArray(snap.pixels)) {
              gridRef.current = snap.pixels.map((row) => row.slice());
              renderAll();
            }
          } catch (e) {
            console.error('sketch init parse error', e);
          }
        })
      );
      subs.push(
        client.subscribe(`/ws/wooms/sketch/draw/${woomsId}`, (msg) => {
          try {
            applyStroke(JSON.parse(msg.body));
          } catch (e) {
            console.error('sketch draw parse error', e);
          }
        })
      );
    };

    client.onConnect = subscribeAll;
    if (client.connected) subscribeAll(); // already connected from a prior route
    if (!client.active) client.activate();

    return () => {
      subs.forEach((s) => { try { s.unsubscribe(); } catch (_) {} });
      if (client.onConnect === subscribeAll) client.onConnect = undefined;
      if (client.active) client.deactivate();
      connectedRef.current = false;
      setConnected(false);
    };
  }, [woomsId, applyStroke, renderAll]);

  const publishStroke = useCallback((stroke) => {
    if (!connectedRef.current) return;
    client.publish({
      destination: `/ws/send/sketch/draw/${woomsId}`,
      body: JSON.stringify(stroke),
    });
  }, [woomsId]);

  // --- pointer handling --------------------------------------------------
  const cellFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL);
    const y = Math.floor((e.clientY - rect.top) / CELL);
    return { x, y };
  };

  const paintAt = (e) => {
    const { x, y } = cellFromEvent(e);
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
    const stroke = { nickname, tool, x, y, colorIndex };
    applyStroke(stroke);   // optimistic local paint
    publishStroke(stroke); // broadcast
  };

  const handlePointerDown = (e) => { drawingRef.current = true; paintAt(e); };
  const handlePointerMove = (e) => { if (drawingRef.current) paintAt(e); };
  const stopDrawing = () => { drawingRef.current = false; };

  // archive the current mural into the gallery and start a fresh blank wall
  const archiveWall = () => {
    if (!connectedRef.current) return;
    if (!window.confirm('현재 벽화를 보관함에 저장하고 새 벽화를 시작할까요?')) return;
    client.publish({
      destination: `/ws/send/sketch/save/${woomsId}`,
      body: JSON.stringify({ nickname, tool: 'SAVE' }),
    });
  };

  // --- UI ----------------------------------------------------------------
  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>🧱 우리 벽화</span>
          <span style={styles.status}>{connected ? '● 연결됨' : '○ 연결 중…'}</span>
          <button style={styles.exit} onClick={() => navigate(-1)}>나가기</button>
        </div>

        <div style={styles.body}>
          <canvas
            ref={canvasRef}
            width={SIZE * CELL}
            height={SIZE * CELL}
            style={styles.canvas}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
          />

          <div style={styles.tools}>
            <div style={styles.swatches}>
              {PALETTE.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setColorIndex(i); setTool('PEN'); }}
                  style={{
                    ...styles.swatch,
                    background: c,
                    outline: tool === 'PEN' && colorIndex === i ? '3px solid #5a4a42' : '1px solid #ccc',
                  }}
                  aria-label={`color ${i}`}
                />
              ))}
            </div>

            <div style={styles.toolRow}>
              <button
                style={{ ...styles.toolBtn, fontWeight: tool === 'PEN' ? 700 : 400 }}
                onClick={() => setTool('PEN')}
              >✏️ 펜</button>
              <button
                style={{ ...styles.toolBtn, fontWeight: tool === 'ERASE' ? 700 : 400 }}
                onClick={() => setTool('ERASE')}
              >🧽 지우개</button>
            </div>

            <div style={styles.toolRow}>
              <button style={styles.saveBtn} onClick={archiveWall}>🖼 보관하기</button>
              <button style={styles.toolBtn} onClick={() => setShowGallery(true)}>📚 보관함</button>
            </div>

            <p style={styles.hint}>{SIZE} × {SIZE} · 우리가 함께 쌓아가는 벽화</p>
          </div>
        </div>
      </div>

      {showGallery && (
        <SketchGallery roomId={woomsId} onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  panel: {
    background: '#fdf6e3', borderRadius: 12, padding: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)', fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 700, color: '#5a4a42' },
  status: { fontSize: 12, color: '#7a6a5a', marginLeft: 'auto' },
  exit: { padding: '6px 12px', border: '2px solid #8b5a3c', borderRadius: 6, background: '#f5e6d0', cursor: 'pointer', color: '#5a4a42' },
  body: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  canvas: { border: '3px solid #8b5a3c', borderRadius: 6, background: EMPTY_COLOR, cursor: 'crosshair', touchAction: 'none' },
  tools: { width: 180, display: 'flex', flexDirection: 'column', gap: 12 },
  swatches: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 },
  swatch: { width: 36, height: 28, borderRadius: 4, cursor: 'pointer', padding: 0 },
  toolRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  toolBtn: { padding: '8px 10px', border: '1px solid #d8b894', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4a42', textAlign: 'left' },
  saveBtn: { padding: '8px 10px', border: '2px solid #8b5a3c', borderRadius: 6, background: '#ffd0c0', cursor: 'pointer', color: '#5a4a42', fontWeight: 700, textAlign: 'left' },
  hint: { fontSize: 11, color: '#a87c50', margin: 0 },
};
