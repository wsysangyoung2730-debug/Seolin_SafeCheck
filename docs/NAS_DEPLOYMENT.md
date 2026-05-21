# Seolin SafeCheck NAS Deployment Guide

## 1. 문서 목적

이 문서는 Seolin SafeCheck를 Synology NAS 환경에 배포하기 위한 준비 수준의 가이드입니다. 현재 단계에서는 PostgreSQL 기반 백엔드 API 서버와 Docker 실행 기반을 준비하며, 실제 NAS 배포 작업은 수행하지 않습니다.

현재 로컬 개발용 DB 스키마와 seed 파일은 포함되어 있습니다. 운영용 DB 계정, 백업, 보안 설정, SMS 제공업체 연동은 이후 작업에서 확정합니다.

## 2. 현재 배포 범위

현재 준비된 범위:

- Node.js + Express 기반 API 서버
- PostgreSQL 컨테이너 구성
- 개발용 schema/seed SQL
- Dockerfile
- app-only `docker-compose.yml`
- 안전한 예시 환경변수 파일
- Health API
- 기사님 로그인/시간대/원생/출결 저장 API
- 관리자 개발용 로그인과 read-only admin API 기반

현재 포함하지 않는 범위:

- ORM
- SMS provider 연동
- Excel import/export
- 관리자 대시보드
- 관리자 CRUD UI/API
- 실제 NAS 배포 실행

## 3. Synology NAS 가정

운영 환경은 다음을 전제로 합니다.

- Synology DSM 사용
- Container Manager 또는 Docker 사용 가능
- NAS가 내부망에서 접근 가능
- 필요 시 외부 접속용 도메인 또는 DDNS 설정 가능
- Reverse Proxy와 HTTPS 인증서 설정 가능

## 4. DSM / Container Manager 확인 항목

배포 전 확인합니다.

- DSM 버전
- Container Manager 설치 여부
- Docker Compose 사용 가능 여부
- 외부 포트 개방 정책
- NAS 방화벽 정책
- 저장소 여유 공간
- 백업 대상 공유 폴더
- HTTPS 인증서 발급 또는 적용 가능 여부

## 5. 프로젝트 업로드 전략

권장 방식:

1. GitHub 저장소를 NAS에 clone합니다.
2. NAS의 프로젝트 경로를 정합니다.
3. `server/.env.example`을 참고해 `server/.env`를 NAS에서 직접 생성합니다.
4. `docker-compose.yml`로 backend와 db 컨테이너를 실행합니다.

주의:

- `.env` 파일은 Git에 커밋하지 않습니다.
- 실제 SMS API Key나 DB 비밀번호는 저장소에 올리지 않습니다.
- 운영용 설정값은 NAS 내부에서만 관리합니다.

## 6. 환경변수 설정

예시 파일:

```txt
server/.env.example
```

NAS에서 생성할 실제 파일:

```txt
server/.env
```

현재 예시 값:

```txt
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5500
DATABASE_URL=postgres://seolin_user:seolin_password@localhost:5432/seolin_safecheck
POSTGRES_DB=seolin_safecheck
POSTGRES_USER=seolin_user
POSTGRES_PASSWORD=seolin_password
```

운영 시에는 `CORS_ORIGIN`, `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`를 실제 NAS 운영 값으로 변경합니다. 예시 비밀번호는 개발용이며 운영에 사용하지 않습니다.

## 7. Docker / Container Manager 실행 개념

개발 또는 NAS 환경에서 예상 실행 흐름:

```sh
docker compose up -d --build
```

상태 확인:

```sh
docker compose logs backend
docker compose logs db
```

Health check:

```sh
curl http://NAS_IP:3000/api/health
```

현재 `docker-compose.yml`은 backend와 PostgreSQL db 서비스를 포함합니다. DB 초기화에는 `server/src/db/schema.sql`, `server/src/db/seed.sql`을 사용합니다.

## 8. 포트 전략

현재 backend 기본 포트:

```txt
3000
```

권장:

- 내부 컨테이너 포트: `3000`
- PostgreSQL 개발 포트: `5432`
- NAS 내부 접근: `http://NAS_IP:3000`
- 외부 접근: Reverse Proxy를 통해 HTTPS 도메인 사용

외부에 직접 `3000` 또는 `5432` 포트를 노출하는 방식은 운영 환경에서는 권장하지 않습니다.

## 9. Reverse Proxy / HTTPS 메모

운영 시 권장 구조:

```txt
https://safecheck.example.com
        |
        v
Synology Reverse Proxy
        |
        v
backend:3000
```

확인 항목:

- HTTPS 인증서 적용
- HTTP에서 HTTPS로 리다이렉트
- `/api` 요청이 backend로 전달되는지 확인
- CORS origin과 실제 도메인 일치 여부 확인

## 10. 백업 메모

현재 백업 후보:

- GitHub 저장소
- NAS의 `.env` 파일
- 배포 설정 메모
- DB 데이터 볼륨
- DB dump 파일

후속 기능 추가 후 백업 후보:

- Excel export 저장 폴더
- SMS 발송 로그

## 11. 보안 메모

- 실제 `.env` 파일은 Git에 커밋하지 않습니다.
- 관리자 계정과 기사님 계정은 권한을 분리합니다.
- 외부 접속 시 HTTPS를 사용합니다.
- SMS API Key는 환경변수로 관리합니다.
- 서버 로그에 학부모 연락처 등 개인정보를 과도하게 남기지 않습니다.
- NAS 관리자 계정과 컨테이너 접근 권한을 최소화합니다.

## 12. PostgreSQL DB 컨테이너 메모

현재 기본 DB는 PostgreSQL입니다.

- PostgreSQL

현재 포함된 항목:

- DB 컨테이너
- DB 볼륨
- DB 계정/비밀번호 환경변수
- DB 연결 모듈
- schema SQL
- development seed SQL

후속 작업에서 확정할 항목:

- 운영 백업 정책
- 운영 계정/비밀번호
- 마이그레이션 운영 방식
- NAS 장애 복구 절차

## 13. 향후 SMS Provider 메모

SMS provider는 추후 확정 필요입니다.

운영 전 확인 항목:

- 발신번호 등록
- 과금 방식
- API Key 보관 방식
- 실패 재시도 정책
- 문자 템플릿
- not_boarded 문자 발송 옵션

현재 작업에서는 실제 SMS 발송을 구현하지 않습니다.

## 14. 문제 해결 체크리스트

컨테이너가 시작되지 않을 때:

- `server/.env` 파일 존재 여부 확인
- `PORT` 값 확인
- NAS 포트 충돌 확인
- `docker compose logs backend` 확인

Health API가 응답하지 않을 때:

- 컨테이너 상태 확인
- `3000:3000` 포트 매핑 확인
- NAS 방화벽 확인
- Reverse Proxy 대상 포트 확인

CORS 오류가 날 때:

- `CORS_ORIGIN` 값 확인
- 프론트엔드 실제 origin 확인
- 운영 도메인과 HTTPS 설정 확인

## 15. 후속 작업

권장 순서:

1. NAS 배포 환경의 API base URL 확정
2. PostgreSQL schema/seed 적용 절차 검증
3. 운영용 인증 방식 보강
4. 관리자 최소 CRUD API 구현
5. 관리자 화면 구현
6. SMS mock provider 서버 측 분리
7. 실제 SMS provider 연동
