import { useEffect, useState } from 'react';
import basicAxios from '../../../libs/axios/basicAxios';
import MuralThumb from './MuralThumb';

const fmt = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return ''; }
};

export default function SketchGallery({ roomId, onClose }) {
  const [murals, setMurals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null); // enlarged mural

  useEffect(() => {
    let alive = true;
    setLoading(true);
    basicAxios
      .get(`/sketch/${roomId}/murals`)
      .then((res) => { if (alive) { setMurals(res.data || []); setError(false); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [roomId]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>📚 우리 벽화 보관함</span>
          <button style={styles.exit} onClick={onClose}>닫기</button>
        </div>

        {loading && <p style={styles.msg}>불러오는 중…</p>}
        {error && <p style={styles.msg}>보관함을 불러오지 못했어요.</p>}
        {!loading && !error && murals.length === 0 && (
          <p style={styles.msg}>아직 보관된 벽화가 없어요. 벽화를 완성하고 "보관하기"를 눌러보세요.</p>
        )}

        {!loading && !error && murals.length > 0 && (
          <div style={styles.grid}>
            {murals.map((m) => (
              <button key={m.id} style={styles.card} onClick={() => setSelected(m)}>
                <MuralThumb pixels={m.pixels} cell={4} />
                <span style={styles.caption}>
                  {fmt(m.savedAt)}{m.savedBy ? ` · ${m.savedBy}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={styles.enlargeOverlay} onClick={() => setSelected(null)}>
          <div style={styles.enlargePanel} onClick={(e) => e.stopPropagation()}>
            <MuralThumb pixels={selected.pixels} cell={12} />
            <span style={styles.caption}>
              {fmt(selected.savedAt)}{selected.savedBy ? ` · ${selected.savedBy}` : ''}
            </span>
            <button style={styles.exit} onClick={() => setSelected(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
  },
  panel: {
    background: '#fdf6e3', borderRadius: 12, padding: 16, maxWidth: 640, maxHeight: '80vh',
    overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: 700, color: '#5a4a42' },
  exit: { marginLeft: 'auto', padding: '6px 12px', border: '2px solid #8b5a3c', borderRadius: 6, background: '#f5e6d0', cursor: 'pointer', color: '#5a4a42' },
  msg: { fontSize: 13, color: '#7a6a5a', padding: '24px 8px', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 },
  caption: { fontSize: 11, color: '#7a6a5a' },
  enlargeOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
  },
  enlargePanel: {
    background: '#fdf6e3', borderRadius: 12, padding: 16,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
  },
};
