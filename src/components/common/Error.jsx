const Error = ({ error }) => {
  return (
    <div className='flex flex-col items-center justify-center mb-4'>
      <p className='text-red-500'>{error.message}</p>
    </div>
  );
};

export default Error;
