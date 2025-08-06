import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import basicAxios from '../../libs/axios/basicAxios'
import { authActions } from '../../store/authSlice';
import Loading from '../common/Loading';


const OauthHandler = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const response = await basicAxios.get(`/users/info`);

        dispatch(authActions.setUserInfo(response.data));
        dispatch(authActions.login());
        navigate('/home');
        console.log('유저 정보 요청 성공', response);
      } catch (error) {
        console.error('유저 정보 요청 실패', error);
        navigate('/login');
      }
    };

    getUserInfo();
  }, [navigate, dispatch]);

  return <Loading />;
};

export default OauthHandler;
