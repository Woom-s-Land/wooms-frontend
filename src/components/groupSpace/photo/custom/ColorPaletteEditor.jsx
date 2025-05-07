import React, { useState, useEffect } from 'react';
import Modal from '../../../common/Modal';
import Button from '../../../common/Button';
import ColorButton from './ColorButton';
import paletteData from '../../../../assets/photo/palette.json';

const ColorPaletteEditor = ({ onClose, onUpdatePalette }) => {
  const [palettes, setPalettes] = useState([]);
  const [currentPalette, setCurrentPalette] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setPalettes(paletteData);
    if (paletteData.length > 0) {
      setCurrentPalette(paletteData[0]);
    }
  }, []);

  const handlePaletteSelect = (index) => {
    setCurrentPalette(palettes[index]);
    setIsDropdownOpen(false);
  };
  // 여기서 ColorButton 클릭 시 호출될 핸들러
  const handleColorClick = (color) => {
    // 예: 클릭된 색 하나만 따로 저장하거나…
    console.log('clicked color:', color);
    // 또는 currentPalette 자체를 수정하고 싶으면
    // setCurrentPalette(prev => prev.map(c => c === color ? newColor : c));
  };

  
  const chunkArray = (array, chunkSize) => {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  };

  const paletteChunks = chunkArray(currentPalette, 8);

  return (
    <Modal onClose={onClose}>
      <div className='flex flex-col items-center p-4'>
        <div className='relative mb-4'>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className='py-2 px-4 bg-teal-500 text-white rounded'
          >
            {` 팔레트를 선택해주세요. `}
          </button>

          {isDropdownOpen && (
            <div
              className='absolute top-full mt-2 w-full bg-white border border-gray-300 shadow-lg z-10'
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              {palettes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handlePaletteSelect(index)}
                  className='block py-2 px-4 hover:bg-gray-200 w-full text-left'
                >
                  팔레트 {index + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className='flex flex-col gap-2 mb-4'>
          {paletteChunks.map((chunk, rowIndex) =>
            rowIndex < 4 ? (
              <div key={rowIndex} className='flex flex-wrap gap-2'>
                {chunk.map((color, colorIndex) => (
                  <ColorButton
                    key={colorIndex}
                    color={color}
                    onClick={handleColorClick}
                  />
                ))}
              </div>
            ) : null
          )}
        </div>
        {/* <div className='flex flex-col gap-2 mb-4'>
          {paletteChunks.map((chunk, rowIndex) =>
            rowIndex < 4 ? (
              <div key={rowIndex} className='flex flex-wrap gap-2'>
                {chunk.map((color, colorIndex) => (
                  <ColorButton key={colorIndex} color={color} />
                ))}
              </div>
            ) : (
              void 0
            )
          )}
        </div> */}

        <Button
          label='확인'
          onClick={() => {
            onUpdatePalette(currentPalette);
            onClose();
          }}
        />
      </div>
    </Modal>
  );
};

export default ColorPaletteEditor;
