import { useState, useEffect, useCallback, useRef } from 'react';
import { Sprite, Container } from '@pixi/react';
import collisions from '../assets/home/home-collisions';
import {
  initializeCollisionMap,
  initializeBoundaries,
} from '../utils/boundaryUtils';
import Nickname from './Nickname';
import { useCharacterTextures } from '../utils/useCharacterTextures';
import InteractionSpeechBubble from './InteractionSpeechBubble';

const Direction = {
  DOWN: 0,
  UP: 1,
  RIGHT: 2,
  LEFT: 3,
};

const MAP_X = 488;
const MAP_Y = 384;
const CHAR_WIDTH = 35; // 캐릭터 사이즈
const CHAR_HEIGHT = 55;
const BoundaryWidth = 8; // 충돌박스의 너비
const BoundaryHeight = 8;
const MOVE_DISTANCE = 11; // 한 프레임별 움직일 거리
const FRAME_INTERVAL = 60; // 프레임이 전환될 간격

// #todo: 추후 캐릭터 코스튬, 닉네임 사용자 정보에 맞게 수정

// todo: 하드 코딩 된 것들 수정
const Character = ({
  handleCharacterMove,
  isActiveBed,
  isActiveDesk,
  isActiveToilet,
  isActiveRug,
  isOpenReadLetter,
  isOpenWriteLetter,
  setIsOpenReadLetter,
  setIsOpenWriteLetter,
  setIsOpenGroup,
  costume,
  nickname,
}) => {
  const [boundaries, setBoundaries] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(Direction.DOWN);
  const [charX, setCharX] = useState(230);
  const [charY, setCharY] = useState(300);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInteractionBed, setIsInteractionBed] = useState(false);
  const [isInteractionToilet, setIsInteractionToilet] = useState(false);

  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const textures = useCharacterTextures(costume);
  
  // 경계 맵 생성
  useEffect(() => {
    const collisionMap = initializeCollisionMap(collisions, 61);
    setBoundaries(
      initializeBoundaries(collisionMap, BoundaryWidth, BoundaryHeight, 15)
    );
  }, []);

  // 충돌 or 상호작용 여부 판정 함수
  const boundaryCollision = useCallback((boundary, x, y) => {
    return boundary.some((col) => {
      return (
        col.position.x + BoundaryWidth >= x + 16 &&
        col.position.y + BoundaryHeight >= y + 35 &&
        x + 40 >= col.position.x &&
        y + 40 >= col.position.y
      );
    });
  }, []);

  // 키 눌렀을 때 실행될 함수
  const handleArrowKeyDown = useCallback(
    (e) => {
      console.log(e.code);
      handleCharacterMove(charX, charY);
      const ArrowKeys = {
        ArrowUp: { dir: Direction.UP, isMoveable: () => charY - 16 > 0 },
        ArrowDown: {
          dir: Direction.DOWN,
          isMoveable: () => charY + 24 < MAP_Y - CHAR_HEIGHT,
        },
        ArrowRight: {
          dir: Direction.RIGHT,
          isMoveable: () => charX + 16 < MAP_X - CHAR_WIDTH,
        },
        ArrowLeft: { dir: Direction.LEFT, isMoveable: () => charX + 16 > 0 },
      };

      const InteractiveKeys = {
        Space: {
          dir: direction,
          isActive: () => isActiveBed || isActiveToilet || isActiveRug,
        },
        KeyE: { dir: direction, isActive: () => isActiveDesk },
        KeyR: { dir: direction, isActive: () => isActiveDesk },
      };

      const key = ArrowKeys[e.code];
      const ikey = InteractiveKeys[e.code];
      if (ikey) {
        if (e.code === 'KeyE' && ikey.isActive()) {
          console.log(e.code, isOpenReadLetter, isOpenWriteLetter);
          if (!isOpenReadLetter) setIsOpenWriteLetter(true);
        } else if (e.code === 'KeyR' && ikey.isActive()) {
          console.log(e.code, isOpenReadLetter, isOpenWriteLetter);
          if (!isOpenWriteLetter) setIsOpenReadLetter(true);
        } else if (e.code === 'Space' && ikey.isActive()) {
          if (isActiveBed) {
            setIsInteractionBed(true);
            setTimeout(() => {
              setIsInteractionBed(false);
            }, 1500);
          } else if (isActiveToilet) {
            setIsInteractionToilet(true);

            setTimeout(() => {
              setIsInteractionToilet(false);
            }, 1500);
          } else if (isActiveRug) {
            setIsOpenGroup(true);
          }
        }
      }
      if (key && !isOpenReadLetter && !isOpenWriteLetter) {
        setIsAnimating(true);
        if (direction !== key.dir) {
          setDirection(key.dir);
          setStepIndex(0);
        }
        if (!key.isMoveable()) {
          setIsAnimating(false);
        } else if (!isAnimating) {
          setStepIndex(0);
          e.preventDefault();
        }
      }
    },
    [charX, charY, direction, isAnimating, isOpenReadLetter, isOpenWriteLetter]
  );

  // 키를 누르다 뗐을 때 실행할 함수
  // => 애니메이션을 중단하고 해당 방향 첫 프레임을 띄움
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

  const animate = (timestamp) => {
    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = timestamp;
    }
    const deltaTime = timestamp - lastFrameTimeRef.current;

    if (deltaTime > FRAME_INTERVAL) {
      setStepIndex((prev) => (prev + 1) % 6);

      let newX = charX;
      let newY = charY;
      let collisionDetected = false;

      switch (direction) {
        case Direction.UP:
          newY = charY - MOVE_DISTANCE;
          collisionDetected = boundaryCollision(boundaries, newX, newY);
          break;
        case Direction.DOWN:
          newY = charY + MOVE_DISTANCE;
          collisionDetected = boundaryCollision(boundaries, newX, newY);
          break;
        case Direction.LEFT:
          newX = charX - MOVE_DISTANCE;
          collisionDetected = boundaryCollision(boundaries, newX, newY);
          break;
        case Direction.RIGHT:
          newX = charX + MOVE_DISTANCE;
          collisionDetected = boundaryCollision(boundaries, newX, newY);
          break;
        default:
          break;
      }
      if (!collisionDetected) {
        setCharX(newX);
        setCharY(newY);
      } else {
        setIsAnimating(false);
      }

      lastFrameTimeRef.current = timestamp;
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <Container x={charX} y={charY}>
      {textures[direction]?.[stepIndex] && (
        <Sprite
          texture={textures[direction][stepIndex]}
          width={CHAR_WIDTH}
          height={CHAR_HEIGHT}
        />
      )}
      {nickname && (
        <Nickname width={CHAR_WIDTH} height={CHAR_HEIGHT} text={nickname} />
      )}
      {isInteractionBed && (
        <InteractionSpeechBubble
          width={CHAR_HEIGHT}
          height={CHAR_HEIGHT}
          text='아직은 잠이 오지 않아'
        />
      )}
      {isInteractionToilet && (
        <InteractionSpeechBubble
          width={CHAR_HEIGHT}
          height={CHAR_HEIGHT}
          text='끄응...'
        />
      )}
    </Container>
  );
};

export default Character;
