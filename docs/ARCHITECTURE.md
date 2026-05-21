# Seolin SafeCheck Architecture

## 1. 아키텍처 개요

Seolin SafeCheck는 기사님용 모바일 웹앱/PWA, 관리자용 PC 웹 대시보드, Synology NAS 기반 백엔드 서버, 데이터베이스, SMS API 연동 모듈로 구성됩니다.

핵심 설계 원칙은 다음과 같습니다.

1. 기사님 앱은 최대한 단순하게 유지합니다.
2. 관리자 기능은 PC 웹 대시보드로 분리합니다.
3. 실제 원본 데이터는 엑셀 파일이 아니라 DB에 저장합니다.
4. 엑셀은 가져오기/내보내기 용도로만 사용합니다.
5. 문자 발송은 출결 저장 이후 별도 모듈에서 처리합니다.
6. 개발 환경에서는 실제 문자 발송 대신 mock provider를 사용합니다.
7. Synology NAS를 초기 운영 인프라로 고려합니다.

## 2. 전체 시스템 구조

```txt
[Driver Mobile Web App / PWA]
          |
          | HTTPS API
          v
[Backend Server on Synology NAS]
          |
          |----------------------|
          |                      |
          v                      v
[Database]              [SMS Provider API]
          ^
          |
[Admin Web Dashboard]
          |
          v
[Excel Import / Export]
```

## 3. 애플리케이션 구성

### 3.1 Driver App

기사님이 사용하는 모바일 웹앱/PWA입니다.

역할:

- 로그인
- 로그인 상태 유지
- 본인 호차 정보 조회
- 시간대별 원생 목록 조회
- 원생별 탑승 장소 확인
- 원생별 탑승 상태 변경
- 전체 저장
- 임시 탑승 원생 추가

특징:

- 모바일 세로 화면 최적화
- 큰 버튼 중심 UI
- 복잡한 편집 기능 최소화
- 40~50대 사용자도 쉽게 사용할 수 있는 단순 구조
- PWA 설치 지원 가능
- 관리자 전용 데이터 편집 기능 미제공

### 3.2 Admin Dashboard

관리자가 사용하는 PC 웹 대시보드입니다.

역할:

- 차량 관리
- 기사님 계정 관리
- 시간대 및 운행 일정 관리
- 원생 관리
- 탑승 장소 관리
- 학부모 연락처 관리
- 출결 기록 조회
- 문자 발송 기록 조회
- 문자 발송 설정 관리
- 엑셀 가져오기
- 엑셀 내보내기

특징:

- 엑셀과 유사한 표 기반 UI 제공
- 실제 저장은 DB에 수행
- 기존 엑셀 명단을 가져올 수 있음
- 날짜별 기록을 엑셀로 내보낼 수 있음
- 현재 정적 admin MVP는 `/admin/login/`, `/admin/home/`, `/admin/students/`, `/admin/vehicles/`, `/admin/schedules/`에서 관리자 로그인, 원생/차량/시간표 관리, 시간표별 원생 배정을 제공합니다.

### 3.3 Backend Server

Synology NAS에서 실행되는 백엔드 서버입니다.

역할:

- 인증 처리
- 기사님 계정과 차량 매핑
- 권한 확인
- 원생 목록 API 제공
- 출결 기록 저장
- 문자 발송 요청 생성
- 문자 발송 결과 저장
- 관리자 데이터 CRUD 처리
- 엑셀 import/export 처리
- 시스템 설정 관리

### 3.4 Database

시스템의 원본 데이터를 저장합니다.

저장 대상:

- 사용자 계정
- 차량 정보
- 기사님 계정과 차량 매핑
- 시간대 및 운행 일정
- 원생 정보
- 학부모 연락처
- 탑승 장소
- 출결 기록
- 문자 발송 기록
- 시스템 설정

### 3.5 SMS Module

외부 SMS API와 연결되는 모듈입니다.

역할:

- 문자 발송 요청 생성
- 문자 템플릿 구성
- SMS API 호출
- 발송 성공/실패 기록 저장
- 개발용 mock provider 제공
- 추후 실제 provider 교체 지원

주의 사항:

- 특정 SMS 업체에 강하게 종속되지 않도록 provider interface를 분리합니다.
- 실제 업체는 추후 확정 필요입니다.
- 발신번호 등록 및 과금 방식은 운영 전에 별도 확인합니다.

## 4. 추천 기술 스택

### 4.1 Frontend

권장:

- Next.js 또는 React
- TypeScript
- PWA 지원
- Tailwind CSS 또는 CSS Modules

선택 이유:

- 기사님용 모바일 화면과 관리자용 PC 화면을 하나의 웹 프로젝트에서 관리할 수 있습니다.
- 반응형 UI 구현이 쉽습니다.
- 추후 PWA 설치 지원이 가능합니다.
- Codex 기반 개발에 적합합니다.

### 4.2 Backend

권장:

- Next.js API Routes
- 또는 Node.js/Express

선택 이유:

- 프론트엔드와 백엔드 개발 흐름을 단순화할 수 있습니다.
- Synology NAS의 Container Manager 또는 Docker 환경에서 실행할 수 있습니다.
- SMS API, DB, 엑셀 처리 연동이 비교적 쉽습니다.

### 4.3 Database

권장 후보:

- PostgreSQL
- MariaDB
- SQLite

운영 기준 추천:

- 매우 작은 MVP 테스트: SQLite 가능
- 실제 운영 및 확장 고려: PostgreSQL 또는 MariaDB 권장

기본 추천은 PostgreSQL 또는 MariaDB입니다. 최종 선택은 Synology NAS 지원 환경과 운영 편의성을 기준으로 추후 확정 필요입니다.

### 4.4 Hosting

권장:

- Synology NAS
- Container Manager 또는 Docker 기반 배포
- Reverse Proxy 또는 Web Station
- HTTPS 도메인 연결
- 내부망/외부망 접속 설정

### 4.5 Excel

권장:

- `xlsx` 라이브러리 기반 import/export

원칙:

- 엑셀 파일은 원본 데이터 저장소로 사용하지 않습니다.
- 엑셀은 기존 자료 업로드, 다운로드, 백업, 오프라인 검토용으로 사용합니다.

## 5. 데이터 흐름

### 5.1 기사님 출결 저장 흐름

```txt
1. 기사님이 모바일 웹앱 접속
2. 로그인 상태 확인
3. 서버에서 기사님 계정에 연결된 호차 정보 조회
4. 오늘 날짜와 선택된 시간대 기준 원생 목록 조회
5. 기사님이 원생 상태 변경
6. 전체 저장 버튼 클릭
7. 저장 확인 모달 표시
8. 서버에 출결 기록 저장 요청
9. DB에 날짜별 출결 기록 저장
10. 탑승 상태인 원생의 문자 발송 요청 생성
11. SMS 모듈이 문자 API 호출 또는 mock 처리
12. 문자 발송 결과 DB 저장
13. 기사님 앱에 저장 완료 메시지 표시
```

### 5.2 관리자 명단 관리 흐름

```txt
1. 관리자가 PC 웹 대시보드 접속
2. 관리자 로그인
3. 호차 및 시간대 선택
4. 원생 목록 조회
5. 원생 추가/수정/삭제 또는 비활성화
6. 저장 버튼 클릭
7. 서버 API 요청
8. 입력값 검증
9. DB 업데이트
10. 기사님 앱에서 다음 조회 시 변경된 정보 반영
```

### 5.3 엑셀 내보내기 흐름

```txt
1. 관리자가 날짜 또는 기간 선택
2. 호차 또는 전체 차량 선택
3. 출결 기록 조회
4. 엑셀 다운로드 요청
5. 서버가 DB 데이터를 기준으로 xlsx 파일 생성
6. 관리자 브라우저에서 다운로드
```

## 6. 주요 도메인 모델

### 6.1 User

```ts
type UserRole = "admin" | "driver";

interface User {
  id: string;
  name: string;
  role: UserRole;
  loginId: string;
  passwordHash: string;
  pinHash?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 Vehicle

```ts
interface Vehicle {
  id: string;
  name: string;
  driverUserId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 Student

```ts
interface Student {
  id: string;
  name: string;
  parentName?: string;
  parentPhone: string;
  defaultPickupPlace: string;
  memo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.4 RouteSchedule

```ts
interface RouteSchedule {
  id: string;
  vehicleId: string;
  name: string;
  startTime: string;
  dayOfWeek?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.5 RouteScheduleStudent

```ts
interface RouteScheduleStudent {
  id: string;
  routeScheduleId: string;
  studentId: string;
  pickupOrder?: number;
  pickupPlaceOverride?: string;
  memo?: string;
}
```

### 6.6 AttendanceRecord

```ts
type AttendanceStatus = "unchecked" | "boarded" | "not_boarded";

interface AttendanceRecord {
  id: string;
  date: string;
  vehicleId: string;
  routeScheduleId: string;
  studentId: string;
  status: AttendanceStatus;
  checkedAt?: string;
  checkedByUserId: string;
  pickupPlace: string;
  memo?: string;
  isTemporaryStudent: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.7 SmsLog

```ts
type SmsStatus = "pending" | "sent" | "failed" | "skipped";

interface SmsLog {
  id: string;
  attendanceRecordId: string;
  studentId: string;
  parentPhone: string;
  message: string;
  status: SmsStatus;
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}
```

## 7. 인증 구조

### 7.1 기사님 로그인

- 호차 계정 ID와 비밀번호 또는 PIN 사용
- 예시: `car1` / `1234`
- 로그인 후 토큰 또는 세션을 저장하여 자동 로그인 유지
- 기사님 계정은 하나의 차량 또는 허용된 차량에 매핑
- 기사님은 본인 호차 데이터만 조회 가능
- 관리자가 기사님 계정을 비활성화할 수 있음

### 7.2 관리자 로그인

- 관리자 ID/PW 사용
- 현재 로컬 개발 환경은 `POST /api/auth/admin/login` 개발용 mock 토큰을 사용합니다.
- 전체 데이터 접근 가능
- 관리자 권한이 없는 사용자는 관리자 API 접근 불가
- 관리자 작업은 가능하면 감사 로그 또는 변경 이력을 남기는 방향을 권장합니다.

## 8. API 설계 초안

```txt
Auth
POST /api/auth/driver/login
POST /api/auth/admin/login
POST /api/auth/logout
GET  /api/auth/me

Driver
GET  /api/driver/schedules/today
GET  /api/driver/schedules/:scheduleId/students
POST /api/driver/attendance/save

Admin - Foundation
GET    /api/admin/overview

Admin - Vehicles
GET    /api/admin/vehicles
POST   /api/admin/vehicles
PATCH  /api/admin/vehicles/:id
PATCH  /api/admin/vehicles/:id/deactivate
DELETE /api/admin/vehicles/:id      (planned)

Admin - Students
GET    /api/admin/students
POST   /api/admin/students
PATCH  /api/admin/students/:id
PATCH  /api/admin/students/:id/deactivate
DELETE /api/admin/students/:id      (planned)

Admin - Schedules
GET    /api/admin/schedules
POST   /api/admin/schedules
PATCH  /api/admin/schedules/:id
PATCH  /api/admin/schedules/:id/deactivate
GET    /api/admin/schedules/:id/students
PUT    /api/admin/schedules/:id/students
DELETE /api/admin/schedules/:id     (planned)

Admin - Records
GET    /api/admin/attendance-records
GET    /api/admin/sms-logs          (planned)

Excel
POST /api/admin/excel/import        (planned)
GET  /api/admin/excel/export        (planned)

Settings
GET   /api/admin/settings           (planned)
PATCH /api/admin/settings           (planned)
```

현재 구현된 admin API는 인증/권한 기반, 조회 API, 원생/차량/시간표 생성/수정/비활성화 API, 시간표별 원생 배정 API입니다. 출결 화면, SMS, Excel 처리는 후속 작업에서 구현합니다.

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

## 9. SMS 설계

문자 발송은 출결 저장 로직과 분리합니다.

원칙:

- 출결 기록은 반드시 DB에 먼저 저장합니다.
- 문자 발송 요청은 출결 기록 저장 이후 생성합니다.
- 문자 발송 성공/실패는 `SmsLog`에 기록합니다.
- 문자 발송 실패가 출결 저장 실패로 이어지지 않도록 합니다.
- SMS 제공업체 변경을 고려하여 provider interface를 분리합니다.
- 개발 환경에서는 mock provider를 사용합니다.

문자 발송 조건:

```ts
const shouldSendBoardedSms = attendance.status === "boarded";

const shouldSendNotBoardedSms =
  attendance.status === "not_boarded" &&
  settings.sendNotBoardedSms === true;
```

권장 provider 구조:

```txt
services/sms/
├── smsService.ts
├── smsProvider.types.ts
└── providers/
    ├── mockSmsProvider.ts
    └── realSmsProvider.ts
```

## 10. 관리자 UI 구조

관리자 화면은 엑셀형 UI를 제공하되, 실제 저장은 DB에 수행합니다.

주요 화면:

```txt
/admin/login
/admin/dashboard
/admin/vehicles
/admin/schedules
/admin/students
/admin/attendance
/admin/sms-logs
/admin/settings
```

관리자 명단 관리 UI:

- 호차 선택
- 시간대 선택
- 요일 선택
- 원생 목록 표
- 원생 추가
- 원생 수정
- 원생 삭제 또는 비활성화
- 탑승 장소 수정
- 학부모 연락처 수정
- 저장
- 엑셀 업로드
- 엑셀 다운로드

## 11. 기사님 UI 구조

주요 화면:

```txt
/driver/login
/driver/home
/driver/schedule/:scheduleId
/driver/save-complete
```

기사님 홈:

- 서린태권도 로고
- 오늘 날짜
- 호차명
- 시간대 버튼 목록
- 계정 정보 또는 로그아웃

시간대별 출결 화면:

- 시간대명
- 원생 카드 목록
- 원생 이름
- 탑승 장소
- 현재 상태 표시
- `탑승` 버튼
- `미탑승` 버튼
- 임시 탑승 원생 추가 버튼
- `전체 저장` 버튼

## 12. 배포 구조

초기 배포는 Synology NAS를 기준으로 합니다.

```txt
Synology NAS
├── Reverse Proxy / Web Station
├── App Container
│   ├── Frontend
│   └── Backend API
├── Database Container
└── Storage
    ├── Excel exports
    └── Backups
```

운영 전 확정 필요:

- 도메인 및 HTTPS 인증서
- 외부 접속 방식
- DB 백업 주기
- SMS API Key 보관 방식
- NAS 장애 시 복구 절차

## 13. 보안 고려사항

- HTTPS 사용
- 관리자와 기사님 권한 분리
- 기사님은 본인 호차 데이터만 접근
- 관리자 API는 관리자 권한 확인
- 비밀번호 및 PIN은 해시 처리
- 학부모 연락처는 관리자 외 노출 최소화
- 기사님 화면에는 필요한 탑승 장소와 최소 정보만 표시
- 문자 발송 API Key는 환경변수로 관리
- 엑셀 다운로드 권한 제한
- 서버 로그에 개인정보 과다 노출 금지
- SMS 발송 실패 로그에는 필요한 오류 정보만 기록

## 14. 향후 확장 가능성

MVP 이후 다음 기능을 검토할 수 있습니다.

- 하원 차량 관리
- 학부모용 조회 페이지
- 카카오 알림톡 연동
- 차량 GPS 위치 공유
- 결석 사유 관리
- 수업 출석 관리
- 월별 출결 통계
- 자동 백업
- 관리자 권한 세분화
- SMS 템플릿 다국어 지원
- 여러 지점 또는 여러 학원 지원
