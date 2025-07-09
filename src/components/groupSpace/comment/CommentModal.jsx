import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import ButtonDetail from '../../group/ButtonDetail';
import { GroupCommentApi } from '../../../apis/GroupSpaceApi';
import { useDispatch } from 'react-redux';
import { alertActions } from '../../../store/alertSlice';
// throttle import 제거

const Comment = ({ onClose }) => {
  const dispatch = useDispatch();

  const pathname = window.location.pathname;
  const woomsId = pathname.split('/')[2];
  const [comments, setComments] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false); // loading 상태 추가

  // 댓글을 가져오는 함수
  const getComments = async () => {
    try {
      const data = await GroupCommentApi.getComment(woomsId, page);
      setComments(data); // 한 페이지의 댓글만 설정
    } catch (error) {
      alertActions.showAlert({
        message: '방명록을 불러오는 데 실패하였습니다. 다시 시도해주세요.',
        type: 'ERROR',
      });
    }
  };

  // 컴포넌트가 처음 로드될 때 및 페이지 변경 시 댓글을 가져옴
  useEffect(() => {
    getComments();
  }, [woomsId, page]);

  // 댓글 작성 함수
  const doSubmit = async (event) => {
    event.preventDefault();
    if (!inputValue.trim() || loading) return; // 중복 방지
    setLoading(true);
    try {
      const response = await GroupCommentApi.postComment(woomsId, inputValue);
      setInputValue('');
      getComments();
      dispatch(
        alertActions.showAlert({
          message: response.result,
          type: 'SUCCESS',
        })
      );
    } catch (error) {
      dispatch(
        alertActions.showAlert({
          message: error.response.data.message,
          type: 'ERROR',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // 다음 페이지로 넘어갈 수 있는지 확인
  const hasMoreComments = comments.length === 4; // 다음 페이지가 있는지 확인

  return (
    <Modal onClose={onClose}>
      <div className='px-4'>
        <h2 className='absolute top-5 left-1/2 transform -translate-x-1/2 text-2xl mt-4 mb-4 text-point-color'>
          방명록
        </h2>
        <div className='pr-8'>
          <form
            onSubmit={doSubmit}
            className='absolute left-1/2 pl-10 ml-4 transform -translate-x-1/2 top-20 flex items-center justify-center'
            style={{ width: '600px', height: '60px' }}
          >
            <div className='relative bg-inputbox-comment bg-center bg-no-repeat bg-contain h-[52px] w-[520px] flex items-center justify-center ml-3'>
              <input
                type='text'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='댓글을 입력하세요'
                className='pl-8 w-[440px] h-[44px] text-sm placeholder-white outline-none text-white'
                style={{
                  fontSize: '12px',
                  border: 'none',
                  background: 'transparent',
                }}
                disabled={loading}
              />
              <ButtonDetail
                buttonText={loading ? '작성 중...' : '작성'}
                onClick={doSubmit}
                disabled={loading || !inputValue.trim()}
              />
            </div>
          </form>
          <div className='mt-32'>
            <ul className='list-none'>
              {comments.map((comment, index) => (
                <li
                  key={index}
                  className='flex items-center mb-2'
                  style={{ height: '60px' }}
                >
                  <div className='flex justify-center items-center basis-1/5'>
                    <div className='flex flex-col items-center'>
                      <img
                        src={`/src/assets/${comment.costume}/h1.png`}
                        alt='프로필 이미지'
                        className='w-9 h-9 rounded-full'
                      />
                      <span className='text-xs mt-1 text-point-color'>
                        {comment.nickname}
                      </span>
                    </div>
                  </div>
                  <div className='relative bg-dialoguebox-comment bg-center bg-no-repeat bg-contain w-[600px] h-[60px] rounded overflow-hidden'>
                    <div className='flex flex-col ml-1 pl-3'>
                      <div className='text-point-color text-[14px] text-left ml-5 mt-5'>
                        {comment.content}
                      </div>
                      <div className='text-xs text-base-color text-right mr-3 absolute right-2 bottom-3'>
                        {new Date(comment.createdDate)
                          .toLocaleDateString()
                          .slice(0, -1)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className='absolute left-2 right-2 flex justify-between items-center transform -translate-y-1/2 top-1/2'>
          <button
            className={`w-8 h-8 bg-left-bt bg-cover ${page === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          />
          <button
            className={`w-8 h-8 bg-right-bt bg-cover ${!hasMoreComments ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setPage(page + 1)}
            disabled={!hasMoreComments}
          />
        </div>
      </div>
    </Modal>
  );
};

export default Comment;
