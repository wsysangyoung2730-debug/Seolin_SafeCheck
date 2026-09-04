# Seolin SafeCheck

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111111)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-111111?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![nginx](https://img.shields.io/badge/nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![SOLAPI](https://img.shields.io/badge/SOLAPI-SMS-5B5FC7?style=for-the-badge)

Seolin SafeCheck는 서린태권도의 등원 차량 운행과 원생 탑승 출결을 관리하는 웹 시스템입니다.

기사님은 차량별 당일 시간표와 원생 목록을 확인하고 탑승 상태를 저장할 수 있습니다. 관리자는 원생, 차량, 요일별 시간표, 원생 배정과 출결 기록을 한곳에서 관리할 수 있습니다.

## 주요 사용자

### 기사님

- 차량 계정으로 로그인
- 로그인한 차량의 오늘 운행 시간표 확인
- 시간표별 원생을 패드 가로 4열·세로 3열, 휴대폰 1열로 확인
- 이름 아래 최대 20자의 기사님 전달 메모 확인
- 원생 상태를 기본 `미탑승`에서 `탑승`으로 전환
- 원생별 보호자 전화 또는 문자 작성 화면 열기
- `탑승 완료`로 출결 저장 및 수정 잠금
- 전체 시간표 이동, 새로고침, 다음 탑승지 이동

### 관리자

- 관리자 계정으로 로그인
- 원생 메모와 보호자 연락처 등록, 수정, 미이용 전환, 영구 삭제
- 원생별 현재 탑승 정보 확인 및 요일·차량·시간표 배정 관리
- 차량 등록, 수정, 비활성화, 영구 삭제
- 요일과 차량 기준의 등원 시간표 관리
- 시간표 영구 삭제 시 연결된 배정·출결 기록 함께 정리
- 시간표별 원생 배정과 검색
- 날짜, 차량, 시간표 기준 출결 기록 조회
- 출결 기록 Excel 다운로드
- Excel 파일 미리보기와 데이터 검증
- SMS 처리 결과 조회

## 출결 처리 기준

| 내부 상태 | 화면 표시 | 의미 |
| --- | --- | --- |
| `unchecked` | 미탑승으로 변환 | 아직 저장된 출결이 없는 API/DB 상태 |
| `boarded` | 탑승 | 차량 탑승 확인 |
| `not_boarded` | 미탑승 | 해당 운행에 탑승하지 않음 |

- 기사님 화면에서는 저장 전 `unchecked`를 기본 `미탑승`으로 표시합니다.
- 상태 버튼은 `미탑승`과 `탑승`만 전환하며, `탑승 완료` 전에는 서버에 저장하지 않습니다.
- `탑승 완료` 후에는 상태가 잠기며 `수정하기`를 눌러 다시 변경할 수 있습니다.
- 원생 카드의 전화·문자 아이콘은 서버에 저장된 보호자 번호로 기기의 전화 또는 문자 작성 화면만 엽니다.
- 출결 저장에 따른 서버 자동 문자 발송은 이번 버전에서 비활성화되어 있습니다.
- 데이터베이스가 운영 데이터의 기준이며 Excel은 조회, 백업, 가져오기 검증 용도로 사용합니다.

## 시스템 구성

- Frontend: 정적 HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: PostgreSQL
- Web server: nginx
- SMS: provider 모듈 보존, 출결 자동 발송 경로는 현재 비활성화
- Deployment: Docker 기반 로컬 환경 및 Synology NAS 운영 환경

```text
Browser
  |
  v
nginx (static frontend)
  |
  +-- /api/* --> Express backend
                    |
                    +-- PostgreSQL
                    +-- SMS provider (현재 출결 저장과 연결하지 않음)
```

## 주요 접속 경로

- 기사님 로그인: `/driver/login/index.html`
- 관리자 로그인: `/admin/login/index.html`
- 관리자 시간표: `/admin/schedules/index.html`
- 관리자 출결 기록: `/admin/attendance/index.html`
- 서버 상태 확인: `/api/health`

운영 환경에서는 nginx가 정적 파일을 제공하고 같은 도메인의 `/api` 요청을 백엔드로 전달합니다.

## 프로젝트 구조

```text
.
├── admin/                     # 관리자 화면
├── driver/                    # 기사님 화면
├── assets/                    # 이미지 등 정적 자산
├── src/                       # 공통 프론트엔드 스크립트와 스타일
├── server/                    # Express API와 PostgreSQL 연동
│   ├── src/db/schema.sql
│   ├── src/db/seed.sql
│   └── package.json
├── nginx/                     # 운영 nginx 설정
├── docker-compose.yml         # 로컬 개발 환경
├── docker-compose.prod.yml    # NAS 운영 환경 참고 구성
└── docs/                      # 제품 및 개발 문서
```

## 로컬 실행

### Docker로 실행

```bash
docker compose up -d --build
```

기본 접속 주소:

- 전체 웹 화면: `http://localhost:8080`
- 기사님 로그인: `http://localhost:8080/driver/login/`
- 관리자 로그인: `http://localhost:8080/admin/login/`
- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

로컬 Docker 설정에는 개발 전용 예시 계정이 포함되어 있습니다.

- 기사님: `car1` / `1234`
- 관리자: `admin` / `1234`

`server/.env`가 있으면 Docker 백엔드가 해당 파일의 설정을 함께 읽습니다. 현재 출결 저장 서비스는 SMS 환경 변수와 무관하게 자동 문자를 발송하지 않습니다.

종료할 때는 다음 명령을 사용합니다.

```bash
docker compose down
```

`docker compose down`은 컨테이너만 종료하며 개발 DB 볼륨은 유지합니다. 운영 환경에서는 반드시 별도 비밀번호를 사용해야 합니다.

### 백엔드만 실행

```bash
cd server
cp .env.example .env
npm install
npm start
```

프론트엔드는 정적 파일 서버를 사용해 프로젝트 루트를 열면 됩니다. 로컬 개발 CORS 기본값은 `http://localhost:5500`입니다.

## 개발 데이터베이스 초기화

로컬 개발 DB를 스키마와 안전한 예시 데이터로 다시 구성하려면 다음 명령을 사용합니다.

```bash
cd server
export DATABASE_URL=postgres://seolin_user:seolin_password@localhost:5432/seolin_safecheck
npm run db:reset:dev
```

`db:reset:dev`는 대상 DB 데이터를 삭제한 뒤 `schema.sql`과 `seed.sql`을 다시 적용하는 개발 전용 명령입니다. 운영 DB에서는 실행하지 마세요.

Docker 개발 볼륨까지 삭제해야 하는 경우:

```bash
docker compose down -v
docker compose up -d
```

`docker compose down -v`는 로컬 PostgreSQL 데이터를 모두 삭제합니다.

## 문자 기능 정책

현재 기사님 화면의 문자 아이콘은 브라우저에서 `sms:` 링크를 열어 패드나 휴대폰의 문자 작성 앱으로 이동합니다. 수신번호만 채우며 메시지 본문은 자동 작성하거나 서버에서 발송하지 않습니다.

서버에는 향후 사용을 위한 mock/SOLAPI provider 모듈과 아래 환경 변수가 남아 있지만, 출결 저장 서비스에서 해당 모듈을 호출하지 않습니다. 따라서 환경 변수 설정만으로 탑승 정보 문자가 자동 발송되지 않습니다.

```env
SMS_PROVIDER=mock
SMS_REAL_SEND_ENABLED=false
SMS_TEST_MODE=true
SMS_TEST_TO=
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER_NUMBER=
```

- 실제 키와 전화번호는 `server/.env` 또는 NAS 컨테이너 환경 변수에만 입력합니다.
- `.env` 파일과 실제 비밀값은 Git에 커밋하지 않습니다.
- 자동 문자 발송을 다시 도입하려면 별도 기능 변경과 운영 승인이 필요합니다.

## NAS 운영

Synology NAS에서는 다음 컨테이너 구성을 사용합니다.

- PostgreSQL DB
- Node.js 백엔드
- nginx 프론트엔드 및 `/api` 프록시

실제 NAS 설치, 빈 운영 DB 초기화, 리버스 프록시, HTTPS, 백업 절차는 [NAS 배포 문서](docs/NAS_DEPLOYMENT.md)를 따릅니다.

운영 DB 볼륨은 임의로 삭제하지 않으며, `docker compose down -v` 같은 데이터 삭제 명령을 운영 환경에서 사용하지 않습니다.

## 운영 범위

현재 시스템은 서린태권도 등원 차량 탑승 출결을 중심으로 제공합니다.

다음 기능은 포함하지 않습니다.

- 하원 차량 출결
- 학부모 전용 앱
- GPS 실시간 위치 추적
- 결제 관리
- 영구 삭제 기반 원생·시간표 관리
- CloudKit Sharing 또는 Core Data 마이그레이션

## 문서

- [제품 요구사항](docs/PRD.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [코드 규칙](docs/CODE_RULES.md)
- [API 계약](docs/API_CONTRACT.md)
- [NAS 배포](docs/NAS_DEPLOYMENT.md)

## 보안 원칙

- 실제 `.env`, API 키, 비밀번호, 전화번호를 저장소에 커밋하지 않습니다.
- 실제 원생·학부모 개인정보를 seed 데이터나 예제 문서에 넣지 않습니다.
- DB 덤프, 백업, 업로드 Excel, 내보낸 Excel, SMS 로그를 Git으로 관리하지 않습니다.
- 운영 비밀번호와 SOLAPI 설정은 NAS 환경 변수에서 별도로 관리합니다.
