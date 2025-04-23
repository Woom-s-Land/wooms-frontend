import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

import imgLogo from '../../assets/logo/imgLogo.png';

const baseUrl = 'https://localhost';

const Signup = () => {
  const navigate = useNavigate();

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    passwordCheck: '',
    code: '',
  });
  const [isValidName, setIsValidName] = useState(true);
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [isValidPassword, setIsValidPassword] = useState(true);
  const [isPasswordMatch, setIsPasswordMatch] = useState(true);
  const [isCheckEmail, setIsCheckEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [codeAbled, setCodeAbled] = useState(true);

  // input 값이 변경될 때마다 회원가입 정보를 업데이트하는 함수
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'name') {
      const nameRegex = new RegExp('^[가-힣]{2,4}$');

      setIsValidName(nameRegex.test(value));
    } else if (name === 'email') {
      const emailRegex = new RegExp('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');

      setIsValidEmail(emailRegex.test(value));
      if (isValidEmail && !isCheckEmail) {
        setEmailMessage('이메일 인증이 필요합니다.');
      } else if (!isValidEmail) {
        setEmailMessage('이메일 형식에 맞게 작성해주세요.');
      }
    } else if (name === 'password') {
      const passwordRegex = new RegExp(
        '^(?=.*[a-zA-Z])(?=.*[!@#$%^*+=-])(?=.*[0-9]).{8,16}$'
      );

      setIsValidPassword(passwordRegex.test(value));
    } else if (name === 'passwordCheck') {
      setIsPasswordMatch(value === values.password);
    }

    setValues({
      ...values,
      [name]: value,
    });
  };

  // 회원가입 요청을 보내는 함수
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${baseUrl}/api/auth/users`, {
        name: values.name,
        email: values.email,
        password: values.password,
      });
      console.log(response.data);
      navigate('/login');
    } catch (error) {
      console.error(error);
      alert(error.response.data.message);
    }
  };

  // 이메일 인증 코드 요청을 보내는 함수
  const checkEmail = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${baseUrl}/api/auth/email`, {
        email: values.email,
      });
      // 인증 코드 요청 버튼 활성화
      setCodeAbled(true);

      setEmailMessage('인증 코드가 발송되었습니다.');
      console.log(response.data);
    } catch (error) {
      setCodeAbled(false);
      // 10초 후 인증 코드 요청 버튼 활성화
      setTimeout(() => {
        setCodeAbled(true);
      }, 10000);

      setEmailMessage(
        '인증 코드 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
      console.error(error);
    }
  };

  // 이메일 인증 코드 확인을 요청하는 함수
  const checkEmailCode = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${baseUrl}/api/auth/email/code`, {
        email: values.email,
        code: values.code,
      });
      setIsCheckEmail(true);
      setEmailMessage('인증에 성공했습니다.');
      console.log(response.data);
    } catch (error) {
      setEmailMessage('인증에 실패했습니다. 인증 코드를 확인해주세요.');
      setIsCheckEmail(false);
      console.error(error);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-scren'>
      <div className='mb-20 mt-12'>
        <Link to='/'>
          <img
            src={imgLogo}
            alt='imgLogo'
            className='mx-auto cursor-pointer w-56'
          />
        </Link>
      </div>
      <section className='w-full max-w-md p-8 bg-white rounded shadow-md '>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label
              htmlFor='name'
              className='block text-sm font-medium text-gray-700'
            >
              이름
            </label>
            <input
              type='text'
              name='name'
              id='name'
              value={values.name}
              onChange={handleChange}
              required
              className={`w-full mt-1 block px-3 py-2 border rounded-md shadow-sm ${isValidName ? 'border-gray-300' : 'border-red-500'} focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
            />
            {!isValidName && (
              <p className='mt-2 text-xs text-red-600'>
                2~4자 사이의 한글로 입력해주세요.
              </p>
            )}
          </div>
          <div>
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
              value={values.email}
              onChange={handleChange}
              required
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm ${isValidEmail ? 'border-gray-300' : 'border-red-500'} focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
            />
            <button
              type='button'
              onClick={checkEmail}
              disabled={!isValidEmail || !codeAbled}
              className='mt-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50'
            >
              인증 코드 요청
            </button>
            <p className='mt-2 text-xs text-gray-600'>{emailMessage}</p>
            <div className='mt-4'>
              <input
                type='text'
                name='code'
                value={values.code}
                onChange={handleChange}
                placeholder='인증 코드'
                className='w-full px-3 py-2 border rounded-md shadow-sm border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm'
              />
              <button
                type='button'
                onClick={checkEmailCode}
                className='mt-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700'
              >
                인증번호 확인
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-gray-700'
            >
              비밀번호
            </label>
            <input
              type='password'
              name='password'
              id='password'
              value={values.password}
              onChange={handleChange}
              required
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm ${isValidPassword ? 'border-gray-300' : 'border-red-500'} focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
            />
            {!isValidPassword && (
              <p className='mt-2 text-xs text-red-600'>
                8~16자 사이여야 하며, 영문자, 숫자, 특수문자를 포함해야 합니다.
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor='passwordCheck'
              className='block text-sm font-medium text-gray-700'
            >
              비밀번호 확인
            </label>
            <input
              type='password'
              name='passwordCheck'
              id='passwordCheck'
              value={values.passwordCheck}
              onChange={handleChange}
              required
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm ${isPasswordMatch ? 'border-gray-300' : 'border-red-500'} focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
            />
            {!isPasswordMatch && (
              <p className='mt-2 text-xs text-red-600'>
                비밀번호가 일치하지 않습니다.
              </p>
            )}
          </div>
          <button
            type='submit'
            disabled={
              !isValidName ||
              !isValidEmail ||
              !isValidPassword ||
              !isPasswordMatch ||
              !isCheckEmail
            }
            className='w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50'
          >
            회원가입
          </button>
        </form>
      </section>
    </div>
  );
};

export default Signup;
