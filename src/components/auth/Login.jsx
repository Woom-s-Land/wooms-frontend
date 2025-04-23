import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { authActions } from '../../store/authSlice';
import { alertActions } from '../../store/alertSlice';
import { settingActions } from '../../store/settingSlice';
import axios from 'axios';
import PasswordReset from './PasswordReset';
import GitHubLogo from '../../assets/logo/github.svg';
import GoogleLogo from '../../assets/logo/google.svg';
import LoadingBus from '../common/LoadingBus';
import imgLogo from '../../assets/logo/imgLogo.png';

const baseUrl = 'https://localhost';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector((state) => state.setting.isMoving);

  const [values, setValues] = useState({
    email: '',
    password: '',
  });
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleChange = (e) => {
    setValues({
      ...values,
      [e.target.name]: e.target.value,
    });
  };

  const isEmailValid = () => {
    const emailRegex = new RegExp('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
    setIsValidEmail(emailRegex.test(values.email));
  };

  // 일반 로그인 요청을 보내는 함수
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(settingActions.startMove());
    try {
      await axios.post(`${baseUrl}/api/auth`, {
        email: values.email,
        password: values.password,
      });

      await getUserInfo();
      dispatch(authActions.login());
      dispatch(settingActions.stopMove());

      navigate('/home');
    } catch (error) {
      dispatch(
        alertActions.showAlert({
          message: error.response.data.message,
          type: 'ERROR',
        })
      );
      dispatch(settingActions.stopMove());
    }
  };

  // 소셜 로그인 요청을 보내는 함수
  const socialLogin = async (provider) => {
    try {
      window.location.href = `${baseUrl}/api/oauth2/authorization/${provider}`;
    } catch (error) {
      dispatch(
        alertActions.showAlert({
          message: '소셜 로그인 실패',
          type: 'ERROR',
        })
      );
    }
  };

  const getUserInfo = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/users/info`, {
        withCredentials: true,
      });

      dispatch(authActions.setUserInfo(response.data));
    } catch (error) {
      dispatch(
        alertActions.showAlert({
          message:
            '사용자 정보를 불러오는 데 실패하였습니다. 다시 시도해주세요.',
          type: 'ERROR',
        })
      );
    }
  };

  return (
    <>
      {loading ? (
        <LoadingBus />
      ) : (
        <div className='flex flex-col items-center justify-center min-h-screen'>
          <div className='mb-20 mt-2'>
            <Link to='/'>
              <img
                src={imgLogo}
                alt='imgLogo'
                className='mx-auto cursor-pointer w-56'
              />
            </Link>
          </div>
          <section className='bg-white p-8 rounded shadow-md w-full max-w-md'>
            <form onSubmit={handleSubmit} className='space-y-4'>
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
                  onBlur={isEmailValid}
                  required
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm ${
                    !isValidEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
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
                  className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm'
                />
              </div>
              <button
                type='submit'
                disabled={!isValidEmail || !values.password}
                className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-green-400 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              >
                로그인
              </button>
              <section className='flex justify-evenly'>
                <span className='text-xs'>
                  <Link to='/signup' className='cursor-pointer'>
                    회원가입
                  </Link>
                </span>
                <span onClick={handleModal} className='text-xs cursor-pointer'>
                  비밀번호 찾기
                </span>
                {isModalOpen && <PasswordReset onClose={handleModal} />}
              </section>
            </form>
            <section className='mt-4 space-y-2 w-full max-w-sm'>
              <button
                className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-700 flex items-center justify-center space-x-5'
                onClick={() => socialLogin('google')}
              >
                <img src={GoogleLogo} alt='GoogleLogo' className='w-6 h-6' />
                <span>Google</span>
              </button>
              <div className='group relative'>
                <button
                  className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center justify-center space-x-5'
                  onClick={() => socialLogin('github')}
                >
                  <img src={GitHubLogo} alt='GitHubLogo' className='w-6 h-6' />
                  <span>GitHub</span>
                </button>
                <small className='text-gray-600 absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-100 p-2 rounded shadow-md w-max'>
                  github 프로필 설정에서 이메일을 public으로 설정해주세요.
                </small>
              </div>
            </section>
          </section>
        </div>
      )}
    </>
  );
};

export default Login;
