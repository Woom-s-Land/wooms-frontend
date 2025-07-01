import React, { useState, useRef, useCallback, useEffect } from 'react';
import pixelit from '../../../libs/pixelit';
import html2canvas from 'html2canvas';
import Cropper from 'react-easy-crop';
import getCroppedImg from './cropImage';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import ColorPaletteEditor from './custom/ColorPaletteEditor';
import checkPixelNumber from '../../groupSpace/photoHeatmap/checkPixelNumber';
import { GroupPhotoApi } from '../../../apis/GroupSpaceApi';
import exifr from 'exifr';
import { alertActions } from '../../../store/alertSlice';
import { useDispatch } from 'react-redux';

const UploadModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const pathname = window.location.pathname;
  const woomsId = pathname.split('/')[2];
  const [files, setFiles] = useState([]);
  const [pixelCanvas, setPixelCanvas] = useState(null);
  const [pixelScale, setPixelScale] = useState(13);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [isCropped, setIsCropped] = useState(false);
  const [palette, setPalette] = useState([
    [46, 34, 47],
    [62, 53, 70],
    [98, 85, 101],
    [150, 108, 108],
    [171, 148, 122],
    [255, 255, 255],
  ]);
  const [showPaletteEditor, setShowPaletteEditor] = useState(false);
  const [showPixelCanvas, setShowPixelCanvas] = useState(true);
  const [showButtons, setShowButtons] = useState(true);
  const [mapId, setMapId] = useState(null);

  const canvasRef = useRef(null);
  const polaroidRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);

    const file = droppedFiles[0];
    const reader = new FileReader();

    reader.onload = async () => {
      setImageSrc(reader.result);

      try {
        const metadata = await exifr.gps(file);

        const latitude = metadata.latitude;
        const longitude = metadata.longitude;

        const id = await checkPixelNumber(longitude, latitude);
        setMapId(id);
      } catch (err) {
        dispatch(
          alertActions.showAlert({message: '사진 메타데이터 읽기에 실패하였습니다.', type: 'ERROR',})
        )
      }
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);

    const file = selectedFiles[0];
    const reader = new FileReader();

    reader.onload = async () => {
      setImageSrc(reader.result);

      try {
        const metadata = await exifr.gps(file);
        
        const latitude = metadata?.latitude;
        const longitude = metadata?.longitude;

        const id = await checkPixelNumber(longitude, latitude);
        setMapId(id);
      } catch (err) {
        alertActions.showAlert({
          message: '메타데이터가 없는 사진은 채움에 채워지지 않아요!',
          type: 'ERROR',
        });
      }
    };

    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    console.log("업로드 실행!");
    if (files.length === 0) {
      dispatch(
        alertActions.showAlert({ message: '업로드할 사진이 없습니다.', type: 'ERROR' })
      );
      return;
    }
    setLoading(true);

    try {
      const canvas = await html2canvas(polaroidRef.current);
      const dataURL = canvas.toDataURL('image/png');
      console.log("dataURL : " + dataURL);
      
      const blob = await fetch(dataURL).then((res) => res.blob());
      console.log("blob : " + blob);
      const file = new File([blob], 'captured_image.png', {
        type: 'image/png',
      });
      console.log("file : " + file);
      await GroupPhotoApi.postPhoto(woomsId, mapId, file);
      console.log("돌아왔나?");
      dispatch(
        alertActions.showAlert({
          message: '사진이 성공적으로 업로드되었습니다.',
          type: 'SUCCESS',
        })
      );
      setFiles([]);
      setCaption('');

      // 모달 창 닫기
      onClose(); // 모든 모달 창 닫기
    } catch (error) {
      alertActions.showAlert({
        message: '사진 업로드 중 오류가 발생하였습니다. 다시 시도해주세요.',
        type: 'ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleTransform = async (scale) => {
    if (croppedArea && imageSrc) {
      setLoading(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedArea);
      if (scale === 26) {
        setPixelCanvas(croppedImage);
      } else {
        const canvas = canvasRef.current;
        const img = new Image();
        img.src = croppedImage;
        img.onload = () => {
          const px = new pixelit({
            to: canvas,
            scale: scale || pixelScale,
            palette: palette,
          });
          px.setFromImgSource(img.src).draw().pixelate().convertPalette();
          setPixelCanvas(canvas.toDataURL());
        };
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCropped) {
      handleTransform(pixelScale);
    }
  }, [pixelScale, isCropped, palette]);

  const handleCrop = async () => {
    if (croppedArea && imageSrc) {
      setIsCropped(true);
    }
  };

  const handleDownload = () => {
    html2canvas(polaroidRef.current).then((canvas) => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'polaroid_image.png';
      link.click();
    });
  };

  const handleNewTransform = () => {
    setPixelCanvas(null);
    setIsCropped(false);
    setPixelScale(13);
  };

  const handlePaletteEdit = () => {
    setShowPixelCanvas(false);
    setShowButtons(false);
    setShowPaletteEditor(true);
  };

  const handlePaletteUpdate = (newPalette) => {
    setPalette(newPalette);
    setShowPixelCanvas(true);
    setShowButtons(true);
  };

  return (
    <Modal onClose={onClose}>
      {showPaletteEditor && (
        <ColorPaletteEditor
          onClose={() => {
            setShowPaletteEditor(false);
            setShowPixelCanvas(true);
            setShowButtons(true);
          }}
          onUpdatePalette={handlePaletteUpdate}
        />
      )}
      {!pixelCanvas && !loading ? (
        imageSrc ? (
          <div>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
            />
            <div className='absolute bottom-3 left-1/2 transform -translate-x-1/2'>
              <Button label='자르기' onClick={handleCrop} />
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className='w-[300px] h-[200px] border-2 border-dashed p-4 mb-4 text-center mx-auto'
            style={{ borderColor: '#aa7959' }}
          >
            <p style={{ color: '#aa7959' }}>
              여기 파일을 드래그 앤 드롭하세요!
            </p>
            <label className='cursor-pointer flex flex-col items-center justify-center'>
              <input
                type='file'
                accept='image/*'
                onChange={handleFileChange}
                multiple
                className='hidden'
              />
              <img
                src='../src/assets/button/file-bt.png'
                alt='파일 업로드 버튼'
                className='h-[150px]'
              />
            </label>
          </div>
        )
      ) : (
        showPixelCanvas && (
          <div
            className='flex flex-col items-center space-x-4 mb-4'
            style={{ marginTop: '15px' }}
          >
            <div
              ref={polaroidRef}
              className='bg-white p-4 shadow-lg w-[240px] h-[280px] flex flex-col items-center relative rounded-lg'
            >
              {loading ? (
                <p className='text-red-500 absolute inset-0 flex justify-center items-center'>
                  변환 중...
                </p>
              ) : (
                pixelCanvas && (
                  <img
                    src={pixelCanvas}
                    alt='Pixelated'
                    className='w-[200px] h-[200px] object-cover'
                  />
                )
              )}
              <input
                type='text'
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 11))}
                placeholder='캡션 작성 (최대 11자)'
                className='mt-2 p-2 rounded w-full text-center absolute bottom-4 focus:outline-none'
              />
            </div>
          </div>
        )
      )}
      <canvas id='pixelitcanvas' ref={canvasRef} className='hidden'></canvas>
      {isCropped && (
        <div className='flex flex-col items-center justify-center'>
          <div className='w-full max-w-xs'>
            <label
              htmlFor='pixel-range'
              className='block mb-2 text-sm font-medium text-white'
            >
              픽셀화 정도: {pixelScale}
            </label>
            <input
              id='pixel-range'
              type='range'
              min='2'
              max='26'
              value={pixelScale}
              onChange={(e) => setPixelScale(parseInt(e.target.value))}
              className='w-full h-2 bg-base-color rounded-lg appearance-none cursor-pointer'
            />
          </div>
        </div>
      )}
      <div
        className='flex justify-end space-x-2'
        style={{ marginRight: '20px' }}
      >
        {showButtons && pixelCanvas && (
          <>
            <Button label='팔레트 편집' onClick={handlePaletteEdit} />
            <Button label='다시 자르기' onClick={handleNewTransform} />
            <Button label='다운로드' onClick={handleDownload} />
            <Button label='업로드' onClick={handleUpload} />
          </>
        )}
      </div>
    </Modal>
  );
};

export default UploadModal;
