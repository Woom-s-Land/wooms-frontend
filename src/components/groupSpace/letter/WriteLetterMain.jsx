import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { alertActions } from '../../../store/alertSlice';
import { AnimatePresence } from 'framer-motion';
import baseUrl from '../../../libs/axios/basicAxios';

import ChooseUser from './ChooseUser';
import WriteLetter from './WriteLetter';
import ChooseDate from './ChooseDate';

const WriteLetterMain = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();

  const [selectedUser, setSelectedUser] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [content, setContent] = useState('');
  const [sendDateTime, setSendDateTime] = useState('');

  const [isUserModalOpen, setUserModalOpen] = useState(true);
  const [isLetterModalOpen, setLetterModalOpen] = useState(false);
  const [isDateModalOpen, setDateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false); // loading 상태 추가

  useEffect(() => {
    setSendDateTime(new Date().toISOString());
    console.log(isUserModalOpen, isLetterModalOpen, isDateModalOpen);
  }, []);

  const handleContentChange = (content) => {
    setContent(content);
  };

  const handleSelectedUser = (userInfo) => {
    setSelectedUser(userInfo);
  };

  const handleSelectedDate = (date) => {
    setSelectedDate(date);
  };

  const openWriteLetter = () => {
    setUserModalOpen(false);
    setLetterModalOpen(true);
  };

  const openDate = () => {
    setLetterModalOpen(false);
    setDateModalOpen(true);
  };

  const sendLetter = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await baseUrl.post(
        '/letters',
        {
          targetUserUuid: selectedUser.uuid,
          content: content,
          receiveDateTime: selectedDate,
        },
        {
          withCredentials: true,
        }
      );
      console.log(response.data);
      dispatch(
        alertActions.showAlert({
          message: '편지가 성공적으로 전달되었습니다!',
          type: 'SUCCESS',
        })
      );
    } catch (error) {
      console.error(error);
      dispatch(
        alertActions.showAlert({
          message: '편지가 전달되지 않았습니다. 다시 시도해주세요.',
          type: 'ERROR',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {isOpen && (
        <AnimatePresence>
          <>
            {isUserModalOpen && (
              <ChooseUser
                key='choose-user'
                onClose={onClose}
                onChange={handleSelectedUser}
                onNext={openWriteLetter}
              />
            )}
            {isLetterModalOpen && (
              <WriteLetter
                key='write-letter'
                onClose={onClose}
                onChange={handleContentChange}
                userNickname={selectedUser.nickname}
                sendDateTime={sendDateTime}
                onNext={openDate}
              />
            )}
            {isDateModalOpen && (
              <ChooseDate
                key='choose-date'
                onClose={onClose}
                sendDateTime={sendDateTime}
                onChange={handleSelectedDate}
                onSubmit={sendLetter}
                loading={loading}
              />
            )}
          </>
        </AnimatePresence>
      )}
    </div>
  );
};

export default WriteLetterMain;
