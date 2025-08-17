import { useState, useEffect } from 'react';
import basicAxios from '../../libs/axios/basicAxios'

const PasswordReset = ({ onClose }) => {
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(true);

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleChange = (e) => {
    setEmailInput(e.target.value);

    const emailRegex = new RegExp('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
    setIsValidEmail(emailRegex.test(e.target.value));
    setMessage(
      isValidEmail
        ? '임시 비밀번호 발급이 가능합니다.'
        : '이메일 형식에 맞게 작성해주세요.'
    );
  };

  const getTempPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await basicAxios.post(`/auth/password`, {email: emailInput});
      setMessage('임시 비밀번호가 발급되었습니다. 이메일을 확인해주세요.');
    } catch (error) {
      setIsValidEmail(false);
      setMessage('이메일 전송하는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center'
      onClick={handleClickOutside}
    >
      <div className='bg-white p-6 rounded-lg w-[400px] relative flex flex-col'>
        <button
          className='absolute top-3 right-3 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center'
          onClick={onClose}
        >
          x
        </button>
        <h2 className='text-lg font-bold mb-4'>비밀번호 찾기</h2>
        <div className='mb-4'>
          <label
            htmlFor='email'
            className='block text-sm font-medium text-gray-700'
          >
            이메일
          </label>
          <input
            type='email'
            name='email'
            id='email'
            value={emailInput}
            onChange={handleChange}
            required
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm ${
              !isValidEmail ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <p
            className={`text-xs ${!isValidEmail ? 'text-red-600' : 'text-green-400'}`}
          >
            {message}
          </p>
        </div>
        <button
          type='button'
          onClick={getTempPassword}
          className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-400 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
        >
          임시 비밀번호 발급
        </button>
      </div>
    </div>
  );
};

export default PasswordReset;
