import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Stage, Sprite, Container, AnimatedSprite } from '@pixi/react';
import { OutlineFilter } from '@pixi/filter-outline';
import basicAxios from '../libs/axios/basicAxios';
import CharacterInMap from './CharacterInMap';
import mapImages from '../utils/mapImages';
import PhotoModal from '../components/groupSpace/photo/PhotoModal';
import PhotoHeatMap from '../components/groupSpace/photoHeatmap/PhotoHeatMap';
import CommentModal from '../components/groupSpace/comment/CommentModal';
import StoryReadModal from '../components/groupSpace/radio/StoryReadModal';
import StoryWriteModal from '../components/groupSpace/radio/StoryWriteModal';
import ChatBox from '../components/groupSpace/ChatBox';
import client from '../libs/socket/client';
import LoadingBus from '../components/common/LoadingBus';
import { settingActions } from '../store/settingSlice';
import { fountain } from '../assets/animation/fountain/fountain';
import FishShadow from './FishShadow';
import RandomWaterDrops from './RandomWaterDrops';
import WaterLeaf from './WaterLeaf';
import { seagullPeck } from '../assets/animation/seagullpeck/seagullPeck';
import { seagullTakeoff } from '../assets/animation/seagulltakeoff/seagullTakeoff';
import { sql } from '../assets/animation/sql/sql';
import { sqr } from '../assets/animation/sqr/sqr';

const outlineStyle = new OutlineFilter(4, 0xbcff89);

const Map = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.setting.isMoving);

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => dispatch(settingActions.stopMove()), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, dispatch]);

  const width = window.screen.width;
  const height = window.innerHeight;
  const pathname = window.location.pathname;

  // 방 식별자: 그룹 정보에 있으면 그걸 우선, 없으면 URL에서 추출
  const groupInfo = useSelector((state) => state.group.groupInfo);
  const roomId = useMemo(
    () => groupInfo?.woomsInviteCode ?? pathname.split('/')[2],
    [groupInfo?.woomsInviteCode, pathname]
  );

  const userInfo = useSelector((state) => state.auth.userInfo);
  const [nickname, setNickname] = useState(userInfo.nickname);
  const [costume, setCostume] = useState(userInfo.costume);
  useEffect(() => {
    setNickname(userInfo.nickname);
    setCostume(userInfo.costume);
  }, [userInfo]);

  const [backgroundX, setBackgroundX] = useState(-300);
  const [backgroundY, setBackgroundY] = useState(-300);

  const [characterX, setCharacterX] = useState(width / 2);
  const [characterY, setCharacterY] = useState(height / 2);

  const [isNearPhoto, setIsNearPhoto] = useState(false);
  const [isNearPhotomap, setIsNearPhotomap] = useState(false);
  const [isNearGuestbook, setIsNearGuestbook] = useState(false);
  const [isNearRadio, setIsNearRadio] = useState(false);

  const [isInteractive, setIsInteractive] = useState(false);
  const [radioReadInteractive, setRadioReadInteractive] = useState(false);
  const [radioWriteInteractive, setRadioWriteInteractive] = useState(false);
  const [isOpenPhoto, setIsOpenPhoto] = useState(false);
  const [isOpenPhotomap, setIsOpenPhotomap] = useState(false);
  const [isOpenGuestbook, setIsOpenGuestbook] = useState(false);
  const [isOpenRadioRead, setIsOpenRadioRead] = useState(false);
  const [isOpenRadioWrite, setIsOpenRadioWrite] = useState(false);

  const [isChatting, setIsChatting] = useState(false);
  const [messageObj, setMessageObj] = useState({});

  // 정적 리소스 좌표
  const photoX = 1417, photoY = 227, photoWidth = 266, photoHeight = 220;
  const photomapX = 1260, photomapY = 515, photomapWidth = 98, photomapHeight = 90;
  const guestbookX = 347, guestbookY = 620, guestbookWidth = 116, guestbookHeight = 116;
  const radioX = 490, radioY = 450, radioWidth = 80, radioHeight = 63;
  const fountainX = 1337, fountainY = 880, fountainWidth = 239, fountainHeight = 176;
  const getRandomDelay = () => Math.random() * 10000;

  const fishs = [{x:960,y:975},{x:1600,y:1450},{x:800,y:670}];
  const waterLeafs = [{x:900,y:833},{x:770,y:670},{x:750,y:1020}];

  // 좌표 변환 헬퍼
  const calculateStaticElementPosition = useCallback(() => {
    return {
      px: photoX + backgroundX,
      py: photoY + backgroundY,
      pmx: photomapX + backgroundX,
      pmy: photomapY + backgroundY,
      gx: guestbookX + backgroundX,
      gy: guestbookY + backgroundY,
      rx: radioX + backgroundX,
      ry: radioY + backgroundY,
      fx: fountainX + backgroundX,
      fy: fountainY + backgroundY,
    };
  }, [backgroundX, backgroundY]);

  // --- WebSocket (STOMP) 상태 ---
  const [connected, setConnected] = useState(false);
  // others: 타인만 별도 관리 (nickname을 key로 관리하면 중복 방지 쉬움)
  const [othersDict, setOthersDict] = useState({});

  // upsert & remove
  const upsertOther = useCallback((p) => {
    if (!p?.nickname || p.nickname === nickname) return;
    setOthersDict((prev) => ({ ...prev, [p.nickname]: p }));
  }, [nickname]);

  const removeOther = useCallback((nick) => {
    if (!nick) return;
    setOthersDict((prev) => {
      const c = { ...prev };
      delete c[nick];
      return c;
    });
  }, []);

  const others = useMemo(() => Object.values(othersDict), [othersDict]);

  // STOMP 연결/구독 + 초기 스냅샷 처리
  useEffect(() => {
    if (!roomId) return;

    client.onConnect = () => {
      setConnected(true);

      // 1) 초기 스냅샷: 개인 큐
      const initSub = client.subscribe('/user/queue/init', (msg) => {
        try {
          const data = JSON.parse(msg.body);
          console.log(data);
          upsertOther(data);
        } catch (e) {
          console.error('init parse error', e);
        }
      });

      // 2) MOVE 브로드캐스트
      const moveSub = client.subscribe(`/ws/wooms/move/${roomId}`, (msg) => {
        try {
          const data = JSON.parse(msg.body);
          upsertOther(data);
        } catch (e) {
          console.error('move parse error', e);
        }
      });

      // 3) DISCONNECT 브로드캐스트
      const discSub = client.subscribe(`/ws/wooms/disconnect/${roomId}`, (msg) => {
        try {
          const { nickname: who } = JSON.parse(msg.body);
          removeOther(who);
        } catch (e) {
          console.error('disc parse error', e);
        }
      });

      // // 4) Fallback: 개인 큐를 못 받는 이슈 대비해서 HTTP 초기화
      // const timer = setTimeout(async () => {
      //   try {
      //     // 백엔드 @PostMapping("/api/join/{woomsId}") 맞춤
      //     const res = await basicAxios.post(`/api/join/${roomId}`);
      //     const list = res?.data?.characters || [];
      //     list.forEach(upsertOther);
      //   } catch (e) {
      //     console.warn('HTTP init fallback failed', e);
      //   }
      // }, 600);

      client.onDisconnect = () => setConnected(false);

      return () => {
        try {
          initSub.unsubscribe();
          moveSub.unsubscribe();
          discSub.unsubscribe();
        } catch (_) {}
        clearTimeout(timer);
      };
    };

    if (!client.active) client.activate();
    return () => {
      if (client.active) client.deactivate();
    };
  }, [roomId, upsertOther, removeOther]);

  // 자식으로 내려줄 발행 콜백
  const sendMove = useCallback((payload) => {
    if (!connected) return;
    try {
      client.publish({
        destination: `/ws/send/move/${roomId}`,
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('publish move failed', e);
    }
  }, [connected, roomId]);

  // 인터랙션 열기/닫기
  useEffect(() => {
    if (isInteractive) {
      setIsOpenPhoto(false);
      setIsOpenPhotomap(false);
      setIsOpenGuestbook(false);
      setIsOpenRadioRead(false);
      setIsOpenRadioWrite(false);
      if (isNearPhoto) setIsOpenPhoto(true);
      else if (isNearPhotomap) setIsOpenPhotomap(true);
      else if (isNearGuestbook) setIsOpenGuestbook(true);
    } else if (radioReadInteractive) {
      if (isNearRadio) setIsOpenRadioRead(true);
    } else if (radioWriteInteractive) {
      if (isNearRadio) setIsOpenRadioWrite(true);
    }
  }, [isInteractive, radioReadInteractive, radioWriteInteractive, isNearPhoto, isNearPhotomap, isNearGuestbook, isNearRadio]);

  const handleClosePhoto = () => setIsOpenPhoto(false);
  const handleClosePhotomap = () => setIsOpenPhotomap(false);
  const handleCloseGuestbook = () => setIsOpenGuestbook(false);
  const handleCloseRadioRead = () => setIsOpenRadioRead(false);
  const handleCloseRadioWrite = () => setIsOpenRadioWrite(false);

  const isNear = (charX, charY, elementX, elementY, elementWidth, elementHeight) => {
    const rect1Right = charX + 40;
    const rect1Bottom = charY + 60;
    const rect2Right = elementX + elementWidth + 30;
    const rect2Bottom = elementY + elementHeight + 30;
    return !(
      rect1Right < elementX ||
      rect1Bottom < elementY ||
      charX > rect2Right ||
      charY > rect2Bottom
    );
  };

  useEffect(() => {
    const cx = characterX - backgroundX;
    const cy = characterY - backgroundY;

    setIsNearPhoto(isNear(cx, cy, photoX, photoY, photoWidth, photoHeight));
    setIsNearPhotomap(isNear(cx, cy, photomapX, photomapY, photomapWidth, photomapHeight));
    setIsNearGuestbook(isNear(cx, cy, guestbookX, guestbookY, guestbookWidth, guestbookHeight));
    setIsNearRadio(isNear(cx, cy, radioX, radioY, radioWidth, radioHeight));
  }, [characterX, characterY, backgroundX, backgroundY]);

  const handleArrowKeyDown = (e) => {
    if (e.key === 'Enter' && !isChatting) setIsChatting(true);
    if (e.key === 'Escape' && isChatting) setIsChatting(false);
  };
  useEffect(() => {
    document.addEventListener('keydown', handleArrowKeyDown);
    return () => document.removeEventListener('keydown', handleArrowKeyDown);
  }, [isChatting]);

  // messageObj는 ChatBox에서 setMessageObj로 갱신됨

  return (
    <>
      {loading ? (
        <LoadingBus />
      ) : (
        <div className="w-full h-full overflow-hidden">
          <Stage width={width} height={height}>
            {/* 배경 */}
            <Container>
              <Sprite image={mapImages.map} x={backgroundX} y={backgroundY} />
            </Container>

            {/* 정적 요소 */}
            <Container>
              <Sprite image={mapImages.photo} width={photoWidth} height={photoHeight}
                x={calculateStaticElementPosition().px} y={calculateStaticElementPosition().py}
                filters={isNearPhoto ? [outlineStyle] : []}
              />
              <Sprite image={mapImages.photomap} width={photomapWidth} height={photomapHeight}
                x={calculateStaticElementPosition().pmx} y={calculateStaticElementPosition().pmy}
                filters={isNearPhotomap ? [outlineStyle] : []}
              />
              <Sprite image={mapImages.guestbook} width={guestbookWidth} height={guestbookHeight}
                x={calculateStaticElementPosition().gx} y={calculateStaticElementPosition().gy}
                filters={isNearGuestbook ? [outlineStyle] : []}
              />
              <Sprite image={mapImages.radio} width={radioWidth} height={radioHeight}
                x={calculateStaticElementPosition().rx} y={calculateStaticElementPosition().ry}
                filters={isNearRadio ? [outlineStyle] : []}
              />
              {isNearRadio && (
                <Sprite image={mapImages.keyRadio} width={120} height={60}
                  x={calculateStaticElementPosition().rx - 20}
                  y={calculateStaticElementPosition().ry - radioHeight}
                />
              )}
              <AnimatedSprite textures={fountain} isPlaying animationSpeed={0.1}
                x={fountainX + backgroundX} y={fountainY + backgroundY}
                width={fountainWidth} height={fountainHeight}
              />
              <AnimatedSprite textures={seagullPeck} isPlaying animationSpeed={0.08}
                x={280 + backgroundX} y={525 + backgroundY} width={27} height={24}
              />
              <AnimatedSprite textures={seagullTakeoff} isPlaying animationSpeed={0.1}
                x={255 + backgroundX} y={525 + backgroundY} width={27} height={24}
              />
              <AnimatedSprite textures={sql} isPlaying animationSpeed={0.1}
                x={400 + backgroundX} y={600 + backgroundY} width={32} height={32}
              />
              <AnimatedSprite textures={sqr} isPlaying animationSpeed={0.1}
                x={360 + backgroundX} y={593 + backgroundY} width={40} height={40}
              />
              {fishs.map((fish, i) => (
                <FishShadow key={i} x={fish.x + backgroundX} y={fish.y + backgroundY} delay={getRandomDelay()} />
              ))}
              {waterLeafs.map((leaf, i) => (
                <WaterLeaf key={i} x={leaf.x + backgroundX} y={leaf.y + backgroundY} delay={getRandomDelay()} />
              ))}
              <RandomWaterDrops backgroundX={backgroundX} backgroundY={backgroundY} />
            </Container>

            {/* 캐릭터 */}
            <Container>
              <CharacterInMap
                width={width}
                height={height}
                nickname={nickname}
                costume={costume}
                // 렌더/입력
                backgroundX={backgroundX}
                backgroundY={backgroundY}
                setBackgroundX={setBackgroundX}
                setBackgroundY={setBackgroundY}
                setCharacterX={setCharacterX}
                setCharacterY={setCharacterY}
                isOpenPhoto={isOpenPhoto}
                isOpenPhotomap={isOpenPhotomap}
                isOpenGuestbook={isOpenGuestbook}
                isOpenRadioRead={isOpenRadioRead}
                isOpenRadioWrite={isOpenRadioWrite}
                setIsInteractive={setIsInteractive}
                setRadioReadInteractive={setRadioReadInteractive}
                setRadioWriteInteractive={setRadioWriteInteractive}
                isChatting={isChatting}
                // WS
                connected={connected}
                sendMove={sendMove}
                others={others}
                // 채팅 말풍선용
                messageObj={messageObj}
              />
            </Container>
          </Stage>

          {/* 모달들 */}
          {isOpenPhoto && <PhotoModal onClose={handleClosePhoto} woomsId={roomId} />}
          {isOpenPhotomap && <PhotoHeatMap onClose={handleClosePhotomap} woomsId={roomId} />}
          {isOpenGuestbook && <CommentModal onClose={handleCloseGuestbook} woomsId={roomId} />}
          {isOpenRadioRead && <StoryReadModal onClose={handleCloseRadioRead} woomsId={roomId} />}
          {isOpenRadioWrite && <StoryWriteModal onClose={handleCloseRadioWrite} woomsId={roomId} />}

          {/* 채팅 박스 (기존 그대로) */}
          <ChatBox
            stompClient={client}
            connected={connected}
            nickname={nickname}
            token={roomId}               // 방 식별자 통일
            setIsChatting={setIsChatting}
            isChatting={isChatting}
            setMessageObj={setMessageObj}
          />
        </div>
      )}
    </>
  );
};

export default Map;
