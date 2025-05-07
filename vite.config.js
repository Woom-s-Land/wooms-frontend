import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // 프로젝트 루트 밖 절대 경로 요청을 모두 차단
      strict: true,
      // 이 배열에 명시된 경로(여기서는 현재 프로젝트 폴더)만 허용
      allow: ['.'],
    },
  },
});
