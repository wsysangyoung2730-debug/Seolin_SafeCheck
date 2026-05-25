# Seolin SafeCheck NAS Deployment Guide

## 1. 목적

이 문서는 Seolin SafeCheck를 Synology NAS의 Docker UI 또는 Docker Compose로 실행하기 위한 배포 준비 가이드입니다. 실제 NAS 배포, 도메인 등록, 인증서 발급, 운영 계정 생성은 이 작업에 포함하지 않습니다.

목표 운영 구조:

- PostgreSQL: NAS Docker volume에 데이터 저장
- Backend: Node.js Express API 서버
- Frontend: nginx가 정적 파일을 서빙하고 `/api`를 backend로 프록시
- 사용자는 하나의 도메인으로 접근
  - `https://YOUR_DOMAIN/driver/login/index.html`
  - `https://YOUR_DOMAIN/admin/schedules/index.html`
  - `https://YOUR_DOMAIN/api/health`

## 2. 포함된 배포 파일

```txt
docker-compose.prod.yml
Dockerfile.frontend
nginx/default.conf
.env.production.example
server/Dockerfile
server/.dockerignore
```

`docker-compose.yml`은 로컬 개발용입니다. NAS 운영 준비에는 `docker-compose.prod.yml`을 사용합니다.

## 3. NAS 사전 준비

- Synology DSM
- Docker 패키지 설치
- DSM 7.1.1 또는 구형 모델에서 Container Manager Project 기능이 없으면 Synology Docker UI로 수동 컨테이너를 생성합니다.
- 프로젝트를 둘 공유 폴더
- Docker volume을 저장할 충분한 공간
- 도메인 또는 DDNS
- Reverse Proxy 및 HTTPS 인증서 적용 가능 여부
- 운영용 PostgreSQL 계정/비밀번호
- 운영용 SOLAPI 계정과 발신번호

## 4. NAS 폴더 구조 예시

```txt
/volume1/docker/seolin-safecheck/
  docker-compose.prod.yml
  .env
  Dockerfile.frontend
  nginx/
  server/
  driver/
  admin/
  src/
  assets/
  index.html
```

`.env`는 NAS에서 직접 만들고 Git에 커밋하지 않습니다.

## 5. 운영 환경변수

`.env.production.example`을 참고해 NAS 프로젝트 폴더에 `.env`를 생성합니다.

```txt
NODE_ENV=production
PORT=3000
FRONTEND_PORT=8080
CORS_ORIGIN=https://YOUR_DOMAIN
POSTGRES_DB=CHANGE_ME_DB
POSTGRES_USER=CHANGE_ME_USER
POSTGRES_PASSWORD=CHANGE_ME_PASSWORD
DATABASE_URL=postgres://CHANGE_ME_USER:CHANGE_ME_PASSWORD@db:5432/CHANGE_ME_DB
SMS_PROVIDER=mock
SMS_REAL_SEND_ENABLED=false
SMS_TEST_MODE=true
SMS_TEST_TO=
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER_NUMBER=
```

주의:

- 실제 `.env`는 커밋하지 않습니다.
- 실제 API Key, API Secret, 전화번호, NAS 주소를 문서나 Git에 남기지 않습니다.
- 운영 전까지 `SMS_PROVIDER=mock`, `SMS_REAL_SEND_ENABLED=false`를 권장합니다.
- SOLAPI 테스트는 `SMS_TEST_MODE=true`와 `SMS_TEST_TO`로 1건씩만 확인합니다.

## 6. Container Manager 실행 개념

Synology Container Manager의 Project 기능에서 `docker-compose.prod.yml`을 사용할 수 있습니다.

CLI 사용 시 예:

```sh
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

상태 확인:

```sh
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs db
```

## 6-1. Synology Docker UI 수동 생성 개념

SSH나 Container Manager Project를 쓰기 어렵다면 Docker UI에서 컨테이너를 수동으로 만듭니다.

권장 생성 순서:

1. PostgreSQL 컨테이너
2. backend 컨테이너
3. frontend nginx 컨테이너

PostgreSQL 컨테이너 첫 생성 시:

- PostgreSQL 데이터 폴더를 NAS 공유 폴더 또는 Docker volume에 영구 저장합니다.
- `server/src/db/schema.sql`만 `/docker-entrypoint-initdb.d/01-schema.sql`로 읽기 전용 마운트합니다.
- `server/src/db/seed.sql`은 운영 DB에 마운트하지 않습니다.

이렇게 시작하면 운영 DB는 테이블만 만들어진 빈 DB로 시작합니다. 원생, 시간표, 출결 seed 데이터는 들어가지 않습니다.

backend 컨테이너:

- `DATABASE_URL`의 host는 PostgreSQL 컨테이너 이름 또는 Docker 네트워크 별칭을 사용합니다.
- `CORS_ORIGIN=https://YOUR_DOMAIN`으로 설정합니다.
- SOLAPI 값은 NAS Docker UI 환경변수에 직접 입력하고 Git에 남기지 않습니다.

frontend 컨테이너:

- 외부 포트는 예를 들어 `8080:80`으로 연결합니다.
- Synology Reverse Proxy는 `https://YOUR_DOMAIN`을 frontend 컨테이너 포트로 연결합니다.

## 7. 서비스 구조

`docker-compose.prod.yml` 서비스:

- `db`: PostgreSQL 16, volume `seolin_safecheck_pgdata`
- `backend`: Express API, 내부 포트 3000
- `frontend`: nginx, 외부 포트 `${FRONTEND_PORT:-8080}`

운영에서는 PostgreSQL 포트를 외부로 공개하지 않습니다. backend도 직접 공개하지 않고 frontend/nginx를 공개 진입점으로 사용합니다.

## 8. nginx 라우팅

`nginx/default.conf`는 다음을 처리합니다.

- `/driver/...`: 정적 기사님 화면
- `/admin/...`: 정적 관리자 화면
- `/assets/...`, `/src/...`: 정적 리소스
- `/api/...`: `backend:3000/api/...`로 프록시

프론트엔드는 운영 도메인에서 열리면 기본적으로 same-origin `/api`를 사용합니다. 로컬 `localhost`나 `file://`에서는 기존처럼 `http://localhost:3000`을 기본값으로 사용합니다.

## 9. DB 초기화

운영 DB는 자동 reset하지 않습니다.

`docker-compose.prod.yml`은 PostgreSQL volume이 완전히 비어 있는 첫 실행 시 `schema.sql`만 자동 적용합니다. 운영에서는 `seed.sql`을 자동 적용하지 않습니다.

운영 초기 로그인에는 최소 계정만 별도로 생성합니다.

- 관리자 계정 1개
- 기사님 계정 `car1`, `car2`
- 각 기사님 계정에 연결된 차량 `1호차`, `2호차`

운영 비밀번호/PIN은 실제 운영자가 NAS에서 직접 설정합니다. 문서나 Git에는 남기지 않습니다.

참고 템플릿:

```txt
server/src/db/production-initial-accounts.example.sql
```

이 파일은 예시입니다. NAS에서 복사한 뒤 `CHANGE_ME_*` 값을 실제 운영 PIN으로 바꿔 1회만 실행합니다. 수정된 실제 운영 SQL 파일은 Git에 커밋하지 않습니다.

개발용 명령:

```sh
cd server
npm run db:reset:dev
```

운영에서는 `docker compose down -v`를 함부로 실행하지 않습니다. 이 명령은 PostgreSQL volume을 삭제해 운영 DB 데이터를 잃을 수 있습니다.

## 10. Reverse Proxy / HTTPS

권장 개념:

```txt
https://YOUR_DOMAIN
  -> Synology Reverse Proxy
  -> http://NAS_INTERNAL_IP:8080
  -> frontend nginx
  -> /api/* proxy to backend
```

체크리스트:

- 도메인/DDNS가 NAS를 가리키는지 확인
- DSM Reverse Proxy 대상이 frontend 포트인지 확인
- HTTPS 인증서 적용
- HTTP에서 HTTPS 리다이렉트
- `https://YOUR_DOMAIN/api/health` 응답 확인
- `CORS_ORIGIN=https://YOUR_DOMAIN` 설정

## 11. 모바일 접근 테스트

확인 URL:

```txt
https://YOUR_DOMAIN/driver/login/index.html
https://YOUR_DOMAIN/admin/login/index.html
https://YOUR_DOMAIN/api/health
```

확인 항목:

- 모바일 브라우저에서 기사님 로그인 화면 표시
- 관리자 화면 접근
- API health 응답
- 로그인 후 API 호출이 `/api`로 정상 프록시되는지 확인

## 12. SMS 운영 주의

기본은 mock입니다.

실제 SOLAPI 발송을 켜려면 운영자가 아래 값을 명시적으로 설정해야 합니다.

```txt
SMS_PROVIDER=solapi
SMS_REAL_SEND_ENABLED=true
SMS_TEST_MODE=true
SMS_TEST_TO=테스트_수신번호
```

운영 발송 전:

- 발신번호 등록 확인
- API Key 권한/IP 제한 확인
- test mode로 1건 발송 확인
- `SMS_TEST_MODE=false` 전환은 실제 학부모 번호 발송 전 최종 승인 후 진행

## 13. 백업 권장

- PostgreSQL volume 정기 백업
- 운영 `.env` 별도 보관
- NAS Container Manager compose 설정 백업
- 배포 버전 Git commit 기록
- Excel export 파일은 운영 백업과 별도 정책 수립
- SMS 로그는 개인정보 최소화 원칙으로 관리

## 14. 문제 해결

컨테이너가 시작되지 않을 때:

- `.env` 존재 여부
- `DATABASE_URL`의 host가 `db`인지 확인
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` 확인
- `docker compose -f docker-compose.prod.yml logs backend`

화면은 열리지만 API가 실패할 때:

- `https://YOUR_DOMAIN/api/health` 확인
- frontend nginx 로그 확인
- backend 컨테이너가 실행 중인지 확인
- Reverse Proxy가 frontend 포트로 연결되는지 확인

SMS가 발송되지 않을 때:

- `SMS_PROVIDER`
- `SMS_REAL_SEND_ENABLED`
- `SMS_TEST_MODE`
- `SMS_TEST_TO`
- SOLAPI Key/Secret/Sender Number
- sms log의 `status`, `provider`, `errorMessage`

## 15. 운영 금지/주의 명령

운영에서 아래 명령은 DB 삭제 위험이 있으므로 신중히 사용합니다.

```sh
docker compose down -v
```

운영 DB를 초기화하는 reset 스크립트는 제공하지 않습니다.
