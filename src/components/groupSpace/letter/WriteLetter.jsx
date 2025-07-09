import { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

import letter from '../../../assets/letter/letter.png';
import smileEmoji from '../../../assets/common/smileEmoji.png';
import sadEmoji from '../../../assets/common/sadEmoji.png';

import ReactDOM from 'react-dom';

const letterVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

const buttonVariants = {
  hover: { scale: 1.1 },
  tap: { scale: 0.9 },
};

const WriteLetter = ({
  onClose,
  onChange,
  userNickname,
  sendDateTime,
  onNext,
}) => {
  const [content, setContent] = useState('');
  const userInfo = useSelector((state) => state.auth.userInfo);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    const lines = newContent.split('\n');

    if (lines.length <= 14) {
      setContent(newContent);
      onChange(newContent);
    }
  };

  const portalRoot = document.getElementById('portal-root');

  return ReactDOM.createPortal(
    <div className='letter fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <motion.div
        initial='hidden'
        animate='visible'
        exit='exit'
        variants={letterVariants}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className='relative w-2/6 flex flex-col items-center'
      >
        <img src={letter} alt='letter' className='w-full' />
        <div className='absolute top-0 w-full h-full flex flex-col items-center'>
          <div className='absolute top-6 left-[34px]'>
            <span className='text-xl font-bold'>{userNickname}</span>
            <span className='text-xl xf'>에게</span>
          </div>
          <textarea
            value={content}
            onChange={handleContentChange}
            className='absolute top-14 w-11/12 h-2/3 p-4 rounded resize-none bg-transparent overflow-hidden focus:outline-none leading-relaxed font-semibold'
            placeholder='편지 내용을 입력하세요!'
            maxLength={500}
          />
          <div className='absolute bottom-36 right-2 p-4 flex flex-col items-end'>
            <p className='text-lg font-bold'>
              {new Date(sendDateTime).toLocaleDateString()}
            </p>
            <p className='text-lg font-bold'>{userInfo.nickname} 올림</p>
          </div>
          <motion.div
            className='flex text-lg py-2 px-4 bg-transparent rounded mb-0 absolute bottom-14 right-2 font-bold hover:underline decoration-wavy text-yellow-600'
            variants={buttonVariants}
            whileHover='hover'
            whileTap='tap'
          >
            <img src={smileEmoji} alt='smileEmoji' className='w-6 mr-1' />
            <button onClick={onNext} disabled={content.trim() === ''}>
              편지 도착 날짜 선택
            </button>
          </motion.div>
          <motion.div
            className='flex text-lg py-2 px-4 bg-transparent rounded mb-0 absolute bottom-4 right-2 font-bold hover:underline decoration-wavy text-red-600'
            variants={buttonVariants}
            whileHover='hover'
            whileTap='tap'
          >
            <img src={sadEmoji} alt='sadEmoji' className='w-6 mr-1' />
            <button onClick={onClose}>편지 다음에 쓰기</button>
          </motion.div>
        </div>
      </motion.div>
    </div>,
    portalRoot
  );
};

export default WriteLetter;
