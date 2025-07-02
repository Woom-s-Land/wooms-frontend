import { useState, useEffect } from 'react';
import { Texture } from 'pixi.js';
import { allCharacterImages } from '../utils/loadCharacterImages';

export function useCharacterTextures(costume) {
  const [textures, setTextures] = useState([[], [], [], []]);

  useEffect(() => {
    // 방향별 URL 객체: {0: [...], 1: [...], 2: [...], 3: [...]}
    const dirs = allCharacterImages[String(costume)] || {};

    // 0→DOWN,1→UP,2→RIGHT,3→LEFT 순서로 2중 배열 생성
    const newTextures = [0,1,2,3].map((dir) => {
      const urls = dirs[dir] || [];
      return urls.map((url) => Texture.from(url));
    });

    setTextures(newTextures);
  }, [costume]);

  return textures;
}
