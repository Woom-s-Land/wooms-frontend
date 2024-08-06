const DetailButton = ({ buttonText, handleClick }) => {
  return (
    <button
      style={{
        backgroundSize: '100% 100%', // 세로 높이를 100%로 고정하고 가로 폭에 맞게 조정
        backgroundColor: 'transparent',
      }}
      className='active:bg-gr-btn-md-active bg-gr-btn-md bg-contain whitespace-nowrap text-sm bg-no-repeat bg-center py-2 px-3 m-3 text-base-color'
    >
      {buttonText}
    </button>
  );
};
export default DetailButton;
