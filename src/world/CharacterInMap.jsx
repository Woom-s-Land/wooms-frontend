import { useState, useEffect, useCallback, useRef } from 'react';
import { Sprite, Container } from '@pixi/react';
import { useCharacterTextures } from '../utils/useCharacterTextures';
import collisions from '../assets/map/map_collisions';
import OtherCharacter from './Characters';
import Nickname from './Nickname';
import SpeechBubble from './SpeechBubble';
import { initializeCollisionMap, initializeBoundaries } from '../utils/boundaryUtils';
import { flushSync } from 'react-dom';

const Direction = { DOWN: 0, UP: 1, RIGHT: 2, LEFT: 3 };
const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1536;
const CHAR_WIDTH = 40;
const CHAR_HEIGHT = 60;
const MOVE_DISTANCE = 22;
const FRAME_INTERVAL = 60;
const STEP_COUNT = 6;
const BoundaryWidth = 32;
const BoundaryHeight = 32;

const CharacterInMap = ({
  width,
  height,
  costume,
  nickname,
  // 카메라/위치
  backgroundX,
  backgroundY,
  setBackgroundX,
  setBackgroundY,
  setCharacterX,
  setCharacterY,
  // 인터랙션 상태
  isOpenPhoto,
  isOpenPhotomap,
  isOpenGuestbook,
  isOpenRadioRead,
  isOpenRadioWrite,
  setIsInteractive,
  setRadioWriteInteractive,
  setRadioReadInteractive,
  isChatting,
  // WS
  connected,
  sendMove,         // 부모가 내려주는 발행 콜백
  others = [],      // 부모가 내려주는 타인 목록
  // 채팅 말풍선(내 것만 여기서 처리)
  messageObj,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(Direction.DOWN);
  const [charX, setCharX] = useState(width / 2);
  const [charY, setCharY] = useState(height / 2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [collision, setCollision] = useState([]);

  const [myChat, setMyChat] = useState('');

  const textures = useCharacterTextures(costume);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // 내 채팅 말풍선만 여기서 반영
  useEffect(() => {
    if (messageObj && messageObj.nickname === nickname && messageObj.content) {
      setMyChat(messageObj.content);
    }
  }, [messageObj, nickname]);

  // 충돌 맵 초기화
  useEffect(() => {
    const collisionMap = initializeCollisionMap(collisions, 64);
    const c1 = initializeBoundaries(collisionMap, BoundaryWidth, BoundaryHeight, 29870);
    const c2 = initializeBoundaries(collisionMap, BoundaryWidth, BoundaryHeight, 93988);
    setCollision([...c1, ...c2]);
  }, []);

  // 충돌 판정
  const boundaryCollision = useCallback(
    (collisions, cx, cy, bx, by) => {
      return collisions.some((col) => {
        return (
          col.position.x + BoundaryWidth + bx >= cx + 16 &&
          col.position.y + BoundaryHeight + by >= cy + 35 &&
          cx + 40 >= col.position.x + bx &&
          cy + 40 >= col.position.y + by
        );
      });
    },
    [collision]
  );

  // 키 입력 처리
  const handleArrowKeyDown = useCallback(
    (e) => {
      if (isChatting) return;
      setIsInteractive(false);
      setRadioReadInteractive(false);
      setRadioWriteInteractive(false);
      const ArrowKeys = {
        ArrowUp: { dir: Direction.UP },
        ArrowDown: { dir: Direction.DOWN },
        ArrowRight: { dir: Direction.RIGHT },
        ArrowLeft: { dir: Direction.LEFT },
      };
      if (e.code === 'Space') {
        if (!isOpenRadioRead && !isOpenRadioWrite) setIsInteractive(true);
      } else if (e.code === 'KeyE') {
        if (!isOpenRadioRead) setRadioWriteInteractive(true);
      } else if (e.code === 'KeyR') {
        if (!isOpenRadioWrite) setRadioReadInteractive(true);
      }
      const key = ArrowKeys[e.code];

      if (
        key &&
        !isOpenPhoto &&
        !isOpenPhotomap &&
        !isOpenGuestbook &&
        !isOpenRadioRead &&
        !isOpenRadioWrite
      ) {
        setIsAnimating(true);
        if (direction !== key.dir) {
          setDirection(key.dir);
          setStepIndex(0);
        }
        if (!isAnimating) {
          setStepIndex(0);
          e.preventDefault();
        }
      }
    },
    [
      direction,
      isAnimating,
      isOpenPhoto,
      isOpenPhotomap,
      isOpenGuestbook,
      isOpenRadioRead,
      isOpenRadioWrite,
      isChatting,
      setIsInteractive,
      setRadioReadInteractive,
      setRadioWriteInteractive,
    ]
  );

  const handleArrowKeyUp = useCallback(() => {
    setIsAnimating(false);
    setStepIndex(0);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleArrowKeyDown);
    document.addEventListener('keyup', handleArrowKeyUp);
    return () => {
      document.removeEventListener('keydown', handleArrowKeyDown);
      document.removeEventListener('keyup', handleArrowKeyUp);
    };
  }, [handleArrowKeyDown, handleArrowKeyUp]);

  // 애니메이션 루프
  const animate = (timestamp) => {
    if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
    const deltaTime = timestamp - lastFrameTimeRef.current;

    if (deltaTime > FRAME_INTERVAL) {
      setStepIndex((prev) => (prev + 1) % STEP_COUNT);

      let newX = charX;
      let newY = charY;
      let newBackgroundX = backgroundX;
      let newBackgroundY = backgroundY;

      const isCenterX = () => charX === width / 2;
      const isCenterY = () => charY === height / 2;

      switch (direction) {
        case Direction.UP:
          if (newBackgroundY + MOVE_DISTANCE <= 0 && isCenterY()) {
            newBackgroundY += MOVE_DISTANCE;
          } else {
            newY -= MOVE_DISTANCE;
          }
          break;
        case Direction.DOWN:
          if (newBackgroundY - MOVE_DISTANCE >= -MAP_HEIGHT + height && isCenterY()) {
            newBackgroundY -= MOVE_DISTANCE;
          } else {
            newY += MOVE_DISTANCE;
          }
          break;
        case Direction.LEFT:
          if (newBackgroundX + MOVE_DISTANCE <= 0 && isCenterX()) {
            newBackgroundX += MOVE_DISTANCE;
          } else {
            newX -= MOVE_DISTANCE;
          }
          break;
        case Direction.RIGHT:
          if (newBackgroundX - MOVE_DISTANCE >= -MAP_WIDTH + width && isCenterX()) {
            newBackgroundX -= MOVE_DISTANCE;
          } else {
            newX += MOVE_DISTANCE;
          }
          break;
        default:
          break;
      }

      // 카메라 경계
      if (newBackgroundX > 0) newBackgroundX = 0;
      if (newBackgroundX < -MAP_WIDTH + width) newBackgroundX = -MAP_WIDTH + width;
      if (newBackgroundY > 0) newBackgroundY = 0;
      if (newBackgroundY < -MAP_HEIGHT + height) newBackgroundY = -MAP_HEIGHT + height;

      if (!boundaryCollision(collision, newX, newY, newBackgroundX, newBackgroundY)) {
        flushSync(() => {
          setCharX(newX);
          setCharY(newY);
          setCharacterX(newX);
          setCharacterY(newY);
          setBackgroundX(newBackgroundX);
          setBackgroundY(newBackgroundY);

          if (connected && sendMove) {
            // 서버는 월드 좌표 기준(x - mapX, y - mapY)
            sendMove({
              x: newX - newBackgroundX,
              y: newY - newBackgroundY,
              direction,
              stepId: stepIndex,
              nickname,
              costume,
            });
          }
        });
      } else {
        setIsAnimating(false);
      }

      lastFrameTimeRef.current = timestamp;
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isAnimating) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isAnimating, stepIndex, direction, connected, backgroundX, backgroundY, charX, charY]);

  // 다른 캐릭터들의 말풍선: messageObj를 여기서 합성해서 내려보냄
  const derivedOthers = others.map((c) =>
    messageObj?.nickname === c.nickname && messageObj?.content
      ? { ...c, message: messageObj.content }
      : c
  );

  return (
    <>
      {/* 나 */}
      <Container x={charX} y={charY}>
        {textures[direction]?.[stepIndex] && (
          <Sprite texture={textures[direction][stepIndex]} width={CHAR_WIDTH} height={CHAR_HEIGHT} />
        )}
        {myChat && <SpeechBubble width={CHAR_WIDTH} height={CHAR_HEIGHT} text={myChat} />}
        <Nickname width={CHAR_WIDTH} height={CHAR_HEIGHT} text={nickname} />
      </Container>

      {/* 타인 */}
      {derivedOthers.map((character) => (
        <OtherCharacter
          key={character.nickname} // 안정 키
          x={character.x}
          y={character.y}
          direction={character.direction}
          stepIndex={character.stepId}
          costume={character.costume}
          nickname={character.nickname}
          character={character}
          backgroundX={backgroundX}
          backgroundY={backgroundY}
        />
      ))}
    </>
  );
};

export default CharacterInMap;
