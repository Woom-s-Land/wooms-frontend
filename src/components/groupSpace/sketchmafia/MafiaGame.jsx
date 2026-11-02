import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import client from '../../../libs/socket/client';
import PixelCanvas from '../sketch/PixelCanvas';
import MuralThumb from '../sketch/MuralThumb';

const DRAW_OPTIONS = [10, 20, 30];

export default function MafiaGame() {
  const { woomsId: roomId } = useParams();
  const navigate = useNavigate();
  const nickname = useSelector((s) => s.auth?.userInfo?.nickname) || 'guest';
  const costume = useSelector((s) => s.auth?.userInfo?.costume) ?? 1;

  const connectedRef = useRef(false);
  const offsetRef = useRef(0); // serverNow - clientNow
  const pixelRef = useRef(null);
  const submittedRef = useRef(false);
  const votedRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [voted, setVoted] = useState(false);
  const [phase, setPhase] = useState('LOBBY');
  const [round, setRound] = useState(0);
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);
  const [endsAt, setEndsAt] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [myRole, setMyRole] = useState(null); // {role, word, mafia, note, category}
  const [reveal, setReveal] = useState(null); // {size, drawings:[{nickname,pixels,submitted}]}
  const [result, setResult] = useState(null);
  const [chats, setChats] = useState([]);
  const [drawSeconds, setDrawSeconds] = useState(20);
  const [chatInput, setChatInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [, setTick] = useState(0); // forces countdown re-render

  const isHost = host === nickname;
  const remainingSec = endsAt
    ? Math.max(0, Math.ceil((endsAt - (Date.now() + offsetRef.current)) / 1000))
    : null;

  // ---- publish helpers ----
  const send = useCallback((suffix, body) => {
    if (!connectedRef.current || !client.connected) return;
    client.publish({ destination: `/ws/send/sketchmafia/${suffix}/${roomId}`, body: JSON.stringify(body || {}) });
  }, [roomId]);

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    const grid = pixelRef.current?.getGrid();
    send('submit', { pixels: grid });
  }, [send]);

  // ---- STOMP wiring ----
  useEffect(() => {
    if (!roomId) return;
    const subs = [];

    const subscribeAll = () => {
      // drop any stale subscriptions before re-subscribing (e.g. on auto-reconnect)
      subs.forEach((s) => { try { s.unsubscribe(); } catch (_) {} });
      subs.length = 0;
      connectedRef.current = true;
      setConnected(true);

      subs.push(client.subscribe('/user/queue/sketchmafia/role', (m) => {
        try { setMyRole(JSON.parse(m.body)); } catch (e) { console.error(e); }
      }));
      subs.push(client.subscribe('/user/queue/sketchmafia/error', (m) => {
        try { setStatusMsg(JSON.parse(m.body).message); } catch (e) { console.error(e); }
      }));
      subs.push(client.subscribe(`/ws/wooms/sketchmafia/state/${roomId}`, (m) => {
        try { applyState(JSON.parse(m.body)); } catch (e) { console.error(e); }
      }));
      subs.push(client.subscribe(`/ws/wooms/sketchmafia/reveal/${roomId}`, (m) => {
        try { setReveal(JSON.parse(m.body)); } catch (e) { console.error(e); }
      }));
      subs.push(client.subscribe(`/ws/wooms/sketchmafia/result/${roomId}`, (m) => {
        try { setResult(JSON.parse(m.body)); } catch (e) { console.error(e); }
      }));
      subs.push(client.subscribe(`/ws/wooms/sketchmafia/chat/${roomId}`, (m) => {
        try { const c = JSON.parse(m.body); setChats((prev) => [...prev.slice(-50), c]); } catch (e) { console.error(e); }
      }));

      // join after subscriptions are in place
      send('join', { nickname, costume });
    };

    const handleDisconnect = () => {
      connectedRef.current = false;
      setConnected(false);
      setStatusMsg('연결이 끊겼습니다. 다시 연결을 확인해 주세요.');
    };

    client.onConnect = subscribeAll;
    client.onDisconnect = handleDisconnect;
    if (client.connected) subscribeAll();
    if (!client.active) client.activate();

    return () => {
      subs.forEach((s) => { try { s.unsubscribe(); } catch (_) {} });
      // only clear the connect handler if it's still ours (avoid a stale,
      // unmounted component's subscribeAll firing on a later reconnect)
      if (client.onConnect === subscribeAll) client.onConnect = undefined;
      if (client.onDisconnect === handleDisconnect) client.onDisconnect = undefined;
      if (client.active) client.deactivate();
      connectedRef.current = false;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const applyState = useCallback((st) => {
    if (st.serverNow) offsetRef.current = st.serverNow - Date.now();
    setPhase(st.phase);
    setRound(st.round);
    setPlayers(st.players || []);
    setHost(st.host);
    setEndsAt(st.endsAt ?? null);
    if (st.message) setStatusMsg(st.message);
  }, []);

  // countdown ticker
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // per-phase side effects
  useEffect(() => {
    if (phase === 'LOBBY') { setMyRole(null); setReveal(null); setResult(null); }
    if (phase === 'DRAW') { submittedRef.current = false; setSubmitted(false); pixelRef.current?.reset(); }
    if (phase === 'VOTE') { votedRef.current = false; setVoted(false); }
    if (phase !== 'DISCUSS') { /* keep chats visible into result */ }
  }, [phase, round]);

  // auto-submit drawing shortly before the DRAW deadline
  useEffect(() => {
    if (phase !== 'DRAW' || !endsAt) return;
    const ms = endsAt - (Date.now() + offsetRef.current) - 800;
    const id = setTimeout(doSubmit, Math.max(0, ms));
    return () => clearTimeout(id);
  }, [phase, endsAt, doSubmit]);

  const startGame = () => send('start', { drawSeconds });
  const castVote = (target) => { if (votedRef.current || target === nickname) return; votedRef.current = true; setVoted(true); send('vote', { target }); };
  const sendChat = () => { const msg = chatInput.trim(); if (!msg) return; send('chat', { message: msg }); setChatInput(''); };
  const sendGuess = () => { const w = guessInput.trim(); if (!w) return; send('guess', { word: w }); setGuessInput(''); };

  // ---- render ----
  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>🕵️ 그림 마피아</span>
          <span style={styles.phaseTag}>{PHASE_LABEL[phase] || phase}{round ? ` · R${round}` : ''}</span>
          {remainingSec != null && <span style={styles.timer}>⏱ {remainingSec}s</span>}
          <span style={styles.status}>{connected ? '● 연결됨' : '○ 연결 중…'}</span>
          <button style={styles.exit} onClick={() => navigate(-1)}>나가기</button>
        </div>

        {statusMsg && <div style={styles.banner}>{statusMsg}</div>}
        {myRole && phase !== 'LOBBY' && phase !== 'RESULT' && (
          <div style={{ ...styles.roleCard, background: myRole.mafia ? '#ffe0e0' : '#e6f3e6' }}>
            {myRole.mafia ? '🎭 당신은 마피아' : '🙂 당신은 시민'} —{' '}
            <b>{myRole.mafia ? '참고' : '주제'}: {myRole.word}</b>
            <div style={styles.roleNote}>{myRole.note}</div>
          </div>
        )}

        <div style={styles.body}>
          {phase === 'LOBBY' && (
            <Lobby players={players} host={host} isHost={isHost}
              drawSeconds={drawSeconds} setDrawSeconds={setDrawSeconds} onStart={startGame} />
          )}

          {(phase === 'ASSIGN' || phase === 'DRAW') && (
            <div style={styles.col}>
              {phase === 'ASSIGN' && <p style={styles.hint}>역할을 확인하세요…</p>}
              <PixelCanvas ref={pixelRef} cell={14} disabled={phase !== 'DRAW' || submitted} />
              {phase === 'DRAW' && (
                <button style={styles.primaryBtn} onClick={doSubmit} disabled={submitted}>
                  {submitted ? '제출됨' : '✅ 완료'}
                </button>
              )}
            </div>
          )}

          {phase === 'REVEAL' && <RevealGrid reveal={reveal} cell={6} caption="모두의 그림" />}

          {phase === 'DISCUSS' && (
            <div style={styles.col}>
              <RevealGrid reveal={reveal} cell={4} caption="누가 마피아일까요?" />
              <ChatPane chats={chats} value={chatInput} onChange={setChatInput} onSend={sendChat} />
            </div>
          )}

          {phase === 'VOTE' && (
            <VotePane players={players} me={nickname} voted={voted} onVote={castVote} reveal={reveal} />
          )}

          {phase === 'MAFIA_GUESS' && (
            <div style={styles.col}>
              {myRole?.mafia ? (
                <>
                  <p style={styles.hint}>🎭 들켰어요! 진짜 주제를 맞히면 역전승!</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input style={styles.chatInput} value={guessInput} placeholder="진짜 주제는?"
                      onChange={(e) => setGuessInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendGuess(); }} />
                    <button style={styles.primaryBtn} onClick={sendGuess}>제출</button>
                  </div>
                </>
              ) : (
                <p style={styles.hint}>🎭 마피아가 정답을 추측하는 중…</p>
              )}
            </div>
          )}

          {phase === 'RESULT' && (
            <ResultPane result={result} reveal={reveal} isHost={isHost} onRestart={startGame} />
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== sub views =====================

function Lobby({ players, host, isHost, drawSeconds, setDrawSeconds, onStart }) {
  const count = players.filter((p) => p.connected).length;
  return (
    <div style={styles.col}>
      <PlayerList players={players} host={host} />
      <p style={styles.hint}>{count}명 · 최소 3명부터 시작</p>
      {isHost ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={styles.hint}>그리기 시간</label>
          <select value={drawSeconds} onChange={(e) => setDrawSeconds(Number(e.target.value))}>
            {DRAW_OPTIONS.map((s) => <option key={s} value={s}>{s}초</option>)}
          </select>
          <button style={styles.primaryBtn} onClick={onStart} disabled={count < 3}>게임 시작</button>
        </div>
      ) : (
        <p style={styles.hint}>방장이 게임을 시작하길 기다리는 중…</p>
      )}
    </div>
  );
}

function PlayerList({ players, host }) {
  return (
    <div style={styles.playerList}>
      {players.map((p) => (
        <div key={p.nickname} style={{ ...styles.playerChip, opacity: p.connected ? 1 : 0.4 }}>
          {p.nickname === host ? '👑 ' : ''}{p.nickname} · {p.score ?? 0}점
          {p.submitted ? ' ✏️' : ''}{p.voted ? ' 🗳' : ''}
        </div>
      ))}
    </div>
  );
}

function RevealGrid({ reveal, cell, caption }) {
  if (!reveal?.drawings?.length) return <p style={styles.hint}>그림을 불러오는 중…</p>;
  return (
    <div style={styles.col}>
      {caption && <p style={styles.hint}>{caption}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {reveal.drawings.map((d) => (
          <div key={d.nickname} style={styles.card}>
            <MuralThumb pixels={d.pixels} cell={cell} />
            <span style={styles.caption}>{d.nickname}{d.submitted ? '' : ' (미제출)'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPane({ chats, value, onChange, onSend }) {
  const logRef = useRef(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight; // keep pinned to the latest message
  }, [chats]);
  return (
    <div style={styles.chatBox}>
      <div ref={logRef} style={styles.chatLog}>
        {chats.map((c, i) => (
          <div key={i} style={styles.chatLine}><b>{c.nickname}</b>: {c.message}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input style={styles.chatInput} value={value} placeholder="토론하기…"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }} />
        <button style={styles.toolBtn} onClick={onSend}>전송</button>
      </div>
    </div>
  );
}

function VotePane({ players, me, voted, onVote, reveal }) {
  return (
    <div style={styles.col}>
      <RevealGrid reveal={reveal} cell={4} caption="투표: 마피아로 의심되는 사람은?" />
      <div style={styles.playerList}>
        {players.filter((p) => p.connected && p.nickname !== me).map((p) => (
          <button key={p.nickname} style={styles.voteBtn} disabled={voted} onClick={() => onVote(p.nickname)}>
            {p.nickname}{p.voted ? ' 🗳' : ''}
          </button>
        ))}
      </div>
      {voted && <p style={styles.hint}>투표 완료! 결과를 기다리는 중…</p>}
    </div>
  );
}

function ResultPane({ result, reveal, isHost, onRestart }) {
  if (!result) return <p style={styles.hint}>결과 집계 중…</p>;
  const outcomeLabel = {
    CITIZEN_WIN: '🎉 시민 승리! 마피아를 찾았어요',
    MAFIA_WIN: '🎭 마피아 승리! 들키지 않았어요',
    MAFIA_STEAL_WIN: '🎭 마피아 역전승! 들켰지만 주제를 맞혔어요',
    ABORTED: '게임이 중단되었어요',
  }[result.outcome] || result.outcome;
  return (
    <div style={styles.col}>
      <h3 style={{ margin: '4px 0', color: '#5a4a42' }}>{outcomeLabel}</h3>
      <p style={styles.hint}>
        주제 <b>{result.topic}</b> · 마피아 참고 <b>{result.decoy}</b> · 마피아: <b>{result.mafiaNickname}</b>
        {result.tie ? ' · (동점)' : result.accusedNickname ? ` · 지목: ${result.accusedNickname}` : ''}
      </p>
      <RevealGrid reveal={reveal} cell={4} caption={null} />
      <div style={styles.playerList}>
        {(result.roles || []).map((r) => (
          <div key={r.nickname} style={{ ...styles.playerChip, background: r.role === 'MAFIA' ? '#ffd0d0' : '#dcecdc' }}>
            {r.role === 'MAFIA' ? '🎭' : '🙂'} {r.nickname} · {r.word}
            {result.voteTally?.[r.nickname] ? ` (${result.voteTally[r.nickname]}표)` : ''}
          </div>
        ))}
      </div>
      {result.scores && (
        <div style={styles.col}>
          <p style={styles.hint}>🏆 누적 점수</p>
          <div style={styles.playerList}>
            {Object.entries(result.scores).sort((a, b) => b[1] - a[1]).map(([nick, sc]) => (
              <div key={nick} style={styles.playerChip}>{nick} · {sc}점</div>
            ))}
          </div>
        </div>
      )}
      {isHost && <button style={styles.primaryBtn} onClick={onRestart}>다시 하기</button>}
      {!isHost && <p style={styles.hint}>방장이 다음 게임을 시작할 수 있어요.</p>}
    </div>
  );
}

const PHASE_LABEL = {
  LOBBY: '대기방', ASSIGN: '역할 배정', DRAW: '그리기',
  REVEAL: '공개', DISCUSS: '토론', VOTE: '투표', MAFIA_GUESS: '마피아 찬스', RESULT: '결과',
};

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: "'Pretendard','Noto Sans KR',sans-serif" },
  panel: { background: '#fdf6e3', borderRadius: 12, padding: 16, minWidth: 560, maxWidth: 760, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 700, color: '#5a4a42' },
  phaseTag: { fontSize: 12, padding: '2px 8px', borderRadius: 10, background: '#f0e0c8', color: '#5a4a42' },
  timer: { fontSize: 13, fontWeight: 700, color: '#c0392b' },
  status: { fontSize: 12, color: '#7a6a5a', marginLeft: 'auto' },
  exit: { padding: '6px 12px', border: '2px solid #8b5a3c', borderRadius: 6, background: '#f5e6d0', cursor: 'pointer', color: '#5a4a42' },
  banner: { background: '#fff3cd', border: '1px solid #e8c97a', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#5a4a42', marginBottom: 8 },
  roleCard: { borderRadius: 8, padding: '8px 12px', marginBottom: 10, color: '#5a4a42', fontSize: 15 },
  roleNote: { fontSize: 11, color: '#7a6a5a', marginTop: 2 },
  body: { minHeight: 200 },
  col: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' },
  hint: { fontSize: 12, color: '#a87c50', margin: 0 },
  playerList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  playerChip: { padding: '6px 10px', borderRadius: 16, background: '#f0e6d2', color: '#5a4a42', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  caption: { fontSize: 11, color: '#7a6a5a' },
  chatBox: { width: '100%', display: 'flex', flexDirection: 'column', gap: 6 },
  chatLog: { height: 140, overflowY: 'auto', background: '#fff', border: '1px solid #e0d2b8', borderRadius: 6, padding: 8, fontSize: 13, color: '#5a4a42', width: '100%' },
  chatLine: { marginBottom: 2 },
  chatInput: { flex: 1, padding: '8px 10px', border: '1px solid #d8b894', borderRadius: 6 },
  primaryBtn: { padding: '8px 16px', border: '2px solid #8b5a3c', borderRadius: 6, background: '#ffd0c0', cursor: 'pointer', color: '#5a4a42', fontWeight: 700 },
  toolBtn: { padding: '8px 12px', border: '1px solid #d8b894', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4a42' },
  voteBtn: { padding: '8px 14px', border: '2px solid #c0392b', borderRadius: 16, background: '#fff', cursor: 'pointer', color: '#5a4a42', fontSize: 13 },
};
