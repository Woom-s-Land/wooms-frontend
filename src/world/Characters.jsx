import { Sprite, Container } from '@pixi/react';
import Nickname from './Nickname';
import { useCharacterTextures } from '../utils/useCharacterTextures';
import SpeechBubble from './SpeechBubble';

const CHAR_WIDTH = 40; // 캐릭터 사이즈
const CHAR_HEIGHT = 60;

const OtherCharacter = ({
  x,
  y,
  direction,
  stepIndex,
  costume,
  nickname,
  character,
  backgroundX,
  backgroundY,
}) => {
  const textures = useCharacterTextures(costume);
  
  return (
    <Container x={Number(x) + backgroundX} y={Number(y) + backgroundY}>
      {textures[direction]?.[stepIndex] && (
        <Sprite
          texture={textures[direction][stepIndex]}
          width={CHAR_WIDTH}
          height={CHAR_HEIGHT}
        />
      )}
      {character.message && (
        <SpeechBubble
          width={CHAR_WIDTH}
          height={CHAR_HEIGHT}
          text={character.message}
        />
      )}
      <Nickname width={CHAR_WIDTH} height={CHAR_HEIGHT} text={nickname} />
    </Container>
  );
};

export default OtherCharacter;
