const context = import.meta.glob('../assets/{0..11}/*.png', { eager: true });

// 2) 방향·프레임 맵
const directionMap = { d:0, u:1, r:2, l:3 };
const frameMap = new Map([1,2,4,5,6,8].map((frame, idx) => [frame, idx]));

// 3) 최종 매핑 객체
export const allCharacterImages = {};

// 4) glob 결과를 순회하며 URL 문자열만 저장
Object.entries(context).forEach(([filePath, mod]) => {
  // '../assets/5/u4.png'  →  ['5', 'u4']
  const [charNo, fileName] = filePath
    .replace('../assets/', '')
    .replace('.png','')
    .split('/');

  const dirChar  = fileName[0];           // 'u'
  const frameNum = parseInt(fileName[1],10); // 4

  const dIdx = directionMap[dirChar];
  const fIdx = frameMap.get(frameNum);
  if (dIdx == null || fIdx == null) return;

  allCharacterImages[charNo] ??= {};
  allCharacterImages[charNo][dIdx] ??= [];

  // mod.default 에는 “/src/assets/5/u4.png” 같은 URL 문자열
  allCharacterImages[charNo][dIdx][fIdx] = mod.default;
});
