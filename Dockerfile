# FROM node:20-alpine
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm install
# COPY . ./
# EXPOSE 5173
# CMD ["npm", "start"]
# 빌드 스테이지
FROM node:20-alpine AS build

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . ./

# 앱 실행 (예: npm start)
# RUN npm start

# npm --host 하는 과정이 필요합니다.
CMD ["npm", "start"]
