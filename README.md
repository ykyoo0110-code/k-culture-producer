# K-CULTURE PRODUCER

한국 문화 체험을 기획하는 9단계 웹 서비스입니다. 참가자가 프로그램과 상황별 대응을 선택하면 결과 기사, 기념사진, 확인증을 확인할 수 있습니다.

## 주요 기능

- 9단계 체험과 선택에 따른 결과
- 기본 캐릭터 선택 및 AI 캐릭터 생성
- 기념사진 합성과 가상 전광판 표시
- 확인증 발급 기록 및 PDF 다운로드
- CONNECT WALL 메시지 등록과 관리자 검수
- 관리자 페이지에서 이미지, 영상, BGM, 언어별 음성 등록
- KO / JA / EN 음성 선택, STEP별 BGM 및 공통 BGM
- 음성 재생 시 BGM 볼륨을 0.35에서 0.12로 낮추고 종료 후 복귀 (400ms 페이드)

## 사용 기술

| 구분 | 기술 |
|---|---|
| 사용자·관리자 화면 | React, Vite |
| 서버 | Python, FastAPI |
| 데이터베이스 | Supabase PostgreSQL |
| 미디어 저장 | Supabase Storage |
| AI | OpenAI API |
| BGM 변환 | FFmpeg |

## 로컬 실행

프론트엔드:

```powershell
npm ci
npm run dev
```

백엔드 (별도 터미널):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

`backend/.env`에 Supabase 연결 정보, OpenAI API 키, 관리자 암호와 서명 키를 입력한 뒤 실행합니다. 이미 `.env`가 있으면 덮어쓰지 않습니다.

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- 사용자 화면: http://localhost:5173
- 관리자 화면: http://localhost:5173/admin
- 서버 상태: http://localhost:8000/health
- Supabase 연결 정보가 없으면 임시 메모리로 실행되며 서버 재시작 시 기록이 사라집니다.
- 로컬 MP4 BGM 변환에는 FFmpeg 설치 또는 `FFMPEG_PATH` 설정이 필요합니다.

## 배포 구성 및 상태

사용자 화면은 Vercel, 서버는 Render, 데이터와 미디어는 Supabase를 사용하는 구성입니다. 2026년 10월 6일 Vercel 사용자 화면과 Render 서버를 배포했습니다. 관리자 로그인·데이터 조회·9단계 체험 진행·설정의 클라우드 저장을 확인했습니다.

서비스: https://k-culture-producer.vercel.app

관리자: https://k-culture-producer.vercel.app/admin

- Render: `backend` 폴더의 Dockerfile 사용 (Python 3.13, FFmpeg, 한글 폰트 포함)
- Vercel: Vite 빌드, 출력 폴더 `dist`, `VITE_API_BASE_URL`에 Render 서버 주소 입력
- Render의 `FRONTEND_ORIGIN`에 Vercel 주소, `BACKEND_PUBLIC_URL`에 Render 주소 입력
- Render의 `SITE_CONTENT_STORAGE_PATH=settings/site-content.json` 설정 시 관리자 설정을 기존 Supabase Storage에 보존
- 최초 관리자 설정은 `backend/site_content.initial.json` 사용

비밀키는 서버 환경변수에만 입력하며 GitHub나 프론트엔드에는 포함하지 않습니다.

[배포 진행 기록](docs/배포진행_20261006.md)

## 폴더 구성

- `src/`: 사용자 및 관리자 화면
- `public/`: 기본 이미지, 영상, 음성, BGM
- `backend/app/`: 서버 API
- `backend/assets/`: 기념사진 합성용 원본
- `backend/sql/`: 데이터베이스 설정 스크립트

실물 전광판 연결은 포함되지 않으며 웹 화면에서 가상 전광판으로 표시합니다.
