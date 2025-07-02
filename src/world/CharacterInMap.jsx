import { useState, useEffect, useCallback, useRef } from 'react';
import { useCharacterTextures } from '../utils/useCharacterTextures';
import collisions from '../assets/map/map_collisions';
import OtherCharacter from './Characters';
import Nickname from './Nickname';
import {
  initializeCollisionMap,
  initializeBoundaries,
} from '../utils/boundaryUtils';
import { flushSync } from 'react-dom';
import { Sprite, Container } from '@pixi/react';
import SpeechBubble from './SpeechBubble';
const Direction = {
  DOWN: 0,
  UP: 1,
  RIGHT: 2,
  LEFT: 3,
};



const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1536;
const CHAR_WIDTH = 40; // 캐릭터 사이즈
const CHAR_HEIGHT = 60;
const MOVE_DISTANCE = 22; // 한 프레임별 움직일 거리
const FRAME_INTERVAL = 60; // 프레임이 전환될 간격
const STEP_COUNT = 6;

// #todo: 추후 캐릭터 코스튬, 닉네임 사용자 정보에 맞게 수정
const Character = ({
  width,
  height,
  costume,
  nickname,
  stompClient,
  connected,
  token,
  messageObj,
  setBackgroundX,
  setBackgroundY,
  backgroundX,
  backgroundY,
  isOpenPhoto,
  isOpenPhotomap,
  isOpenGuestbook,
  isOpenRadioRead,
  isOpenRadioWrite,
  setCharacterX,
  setCharacterY,
  setIsInteractive,
  setRadioWriteInteractive,
  setRadioReadInteractive,
  isChatting,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(Direction.DOWN);
  const [charX, setCharX] = useState(width / 2);
  const [charY, setCharY] = useState(height / 2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [collision, setCollision] = useState([]);
  const [characters, setCharacters] = useState([]); // 캐릭터 목록 상태


  const textures = useCharacterTextures(costume);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  const BoundaryWidth = 32;
  const BoundaryHeight = 32;
  
  // #stomp
  const [myChat, setMyChat] = useState('');
  useEffect(() => {
    // messageObj가 정의되어 있고 nickname과 content가 있는지 확인
    if (messageObj && messageObj.nickname && messageObj.content) {
      if (messageObj.nickname === nickname) setMyChat(messageObj.content);
      else
        setCharacters((prevCharacters) =>
          prevCharacters.map((char) =>
            char.nickname === messageObj.nickname
              ? { ...char, message: messageObj.content }
              : char
          )
        );
    }
  }, [messageObj]);
  const updateCharacterPosition = (newData) => {
    setCharacters((prevCharacters) => {
      if (nickname === newData.nickname) return prevCharacters;
      if (!prevCharacters) return [newData];
      const existingCharacterIndex = prevCharacters.findIndex(
        (character) => character.nickname === newData.nickname
      );

      if (existingCharacterIndex !== -1) {
        const updatedCharacters = [...prevCharacters];
        updatedCharacters[existingCharacterIndex] = newData;
        return updatedCharacters;
      } else {
        return [...prevCharacters, newData];
      }
    });
  };

  useEffect(() => {
    if (!stompClient || !connected) return;

    // 움직임 구독 설정
    const moveSubscription = stompClient.subscribe(
      '/ws/wooms/move/' + token,
      (message) => {
        try {
          const parseMessage = JSON.parse(message.body);
          // console.log(parseMessage);
          // 움직임 처리
          const { nickname, x, y, direction, stepId, costume } = parseMessage;

          // 캐릭터 위치 업데이트
          updateCharacterPosition({
            nickname,
            x,
            y,
            direction,
            stepId,
            costume,
          });
        } catch (err) {
          console.log('Failed to parse move message:', err);
        }
      }
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      moveSubscription.unsubscribe();
    };
  }, [stompClient, connected, token]);

  const sendMove = (characterInfo) => {
    // console.log('send', characterInfo, backgroundX, backgroundY);
    if (stompClient && connected) {
      stompClient.publish({
        destination: '/ws/send/move/' + token,
        body: JSON.stringify(characterInfo),
      });
    }
  };

  useEffect(() => {
    const collisionMap = initializeCollisionMap(collisions, 64);
    const coll = initializeBoundaries(
      collisionMap,
      BoundaryWidth,
      BoundaryHeight,
      29870
    );
    const coll2 = initializeBoundaries(
      collisionMap,
      BoundaryWidth,
      BoundaryHeight,
      93988
    );
    coll.push(...coll2);
    setCollision(coll);
  }, []);

  // 충돌 여부 판정 함수
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

  // 키 눌렀을 때 실행될 함수
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
      charX,
      charY,
      stepIndex,
      direction,
      isAnimating,
      isOpenPhoto,
      isOpenPhotomap,
      isOpenGuestbook,
      isOpenRadioRead,
      isOpenRadioWrite,
      isChatting,
    ]
  );

  // 키를 누르다 뗐을 때 실행할 함수
  const handleArrowKeyUp = useCallback(() => {
    setIsAnimating(false);
    setStepIndex(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleArrowKeyDown);
    document.addEventListener('keyup', handleArrowKeyUp);
    return () => {
      document.removeEventListener('keydown', handleArrowKeyDown);
      document.removeEventListener('keyup', handleArrowKeyUp);
    };
  }, [handleArrowKeyDown, handleArrowKeyUp]);

  // 애니메이션을 시작하거나 중단하는 함수
  useEffect(() => {
    if (isAnimating) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, stepIndex, direction]);

  // // 실제로 캐릭터가 맵의 어느 위치에 있는지 계산해주는 함수
  // const getCharPos = (charX, charY, mapX, mapY) => {
  //   console.log(charX, charY, mapX, mapY);
  //   return [charX - mapX, charY - mapY];
  // };

  const animate = (timestamp) => {
    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = timestamp;
    }
    const deltaTime = timestamp - lastFrameTimeRef.current;

    if (deltaTime > FRAME_INTERVAL) {
      setStepIndex((prev) => (prev + 1) % STEP_COUNT);

      let newX = charX;
      let newY = charY;
      let newBackgroundX = backgroundX;
      let newBackgroundY = backgroundY;
      // Center인지 확인하는 함수
      const isCenterX = () => charX == width / 2;
      const isCenterY = () => charY == height / 2;
      switch (direction) {
        case Direction.UP:
          if (newBackgroundY + MOVE_DISTANCE <= 0 && isCenterY()) {
            newBackgroundY += MOVE_DISTANCE;
          } else {
            newY -= MOVE_DISTANCE;
          }
          break;
        case Direction.DOWN:
          if (
            newBackgroundY - MOVE_DISTANCE >= -MAP_HEIGHT + height &&
            isCenterY()
          ) {
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
          if (
            newBackgroundX - MOVE_DISTANCE >= -MAP_WIDTH + width &&
            isCenterX()
          ) {
            newBackgroundX -= MOVE_DISTANCE;
          } else {
            newX += MOVE_DISTANCE;
          }
          break;
        default:
          break;
      }
      // 경계에 왔을 경우 카메라 고정
      if (newBackgroundX > 0) newBackgroundX = 0;
      if (newBackgroundX < -MAP_WIDTH + width)
        newBackgroundX = -MAP_WIDTH + width;
      if (newBackgroundY > 0) newBackgroundY = 0;
      if (newBackgroundY < -MAP_HEIGHT + height)
        newBackgroundY = -MAP_HEIGHT + height;

      if (
        !boundaryCollision(
          collision,
          newX,
          newY,
          newBackgroundX,
          newBackgroundY
        )
      ) {
        flushSync(() => {
          setCharX(newX);
          setCharY(newY);
          setCharacterX(newX);
          setCharacterY(newY);
          setBackgroundX(newBackgroundX);
          setBackgroundY(newBackgroundY);
          // const pos = getCharPos(newX, newY, newBackgroundX, newBackgroundY);
          sendMove({
            x: newX - newBackgroundX,
            y: newY - newBackgroundY,
            direction: direction,
            stepId: stepIndex,
            nickname: nickname,
            costume: costume,
          });
        });
      } else {
        setIsAnimating(false);
      }

      lastFrameTimeRef.current = timestamp;
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  

  return (
    <>
      <Container x={charX} y={charY}>
        {textures[direction]?.[stepIndex] && (
          <Sprite
            texture={textures[direction][stepIndex]}
            width={CHAR_WIDTH}
            height={CHAR_HEIGHT}
          />
        )}
        {myChat && (
          <SpeechBubble width={CHAR_WIDTH} height={CHAR_HEIGHT} text={myChat} />
        )}
        <Nickname width={CHAR_WIDTH} height={CHAR_HEIGHT} text={nickname} />
      </Container>
      {characters &&
        characters.map((character) => (
          <OtherCharacter
            key={`${character.nickname}-${character.stepId}`}
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

export default Character;
