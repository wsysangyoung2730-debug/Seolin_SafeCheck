# Seolin SafeCheck API Contract

## 1. 문서 목적

이 문서는 Seolin SafeCheck MVP의 백엔드 API 계약을 정의합니다. 현재 단계의 목적은 기사님용 프론트엔드 mock 흐름을 PostgreSQL 기반 백엔드 API로 교체할 수 있도록 요청/응답 형태를 고정하는 것입니다.

이 문서는 API 경로, 공통 응답 형식, 개발용 인증 방식, 기사님용 일정/원생/출결 저장 API를 설명합니다. 현재 로컬 백엔드는 PostgreSQL schema/seed와 repository 계층을 사용합니다. **프론트엔드 API 연동, 운영용 인증, SMS 발송, Excel 처리, 관리자 대시보드 구현은 아직 포함되지 않습니다.**

## 2. API 설계 원칙

- 응답 형식은 모든 API에서 최대한 통일합니다.
- 기사님 API는 로그인된 기사님 계정에 연결된 차량 데이터만 반환합니다.
- 출결 상태값은 문서화된 값만 사용합니다.
  - `unchecked`
  - `boarded`
  - `not_boarded`
- 원생별 상태 버튼 클릭 시에는 저장 또는 SMS 발송을 하지 않습니다.
- 출결 저장은 `POST /api/driver/attendance/save`에서만 처리합니다.
- 현재 백엔드의 driver API는 PostgreSQL 데이터를 조회/저장합니다.
- 프론트엔드는 아직 기존 정적 mock service를 사용하며, API 연동은 후속 작업에서 진행합니다.
- 사용자에게 전달되는 오류 메시지는 한국어로 작성합니다.

## 3. Base URL 전략

개발 환경 기본값:

```txt
http://localhost:3000/api
```

NAS 배포 후 권장 예시:

```txt
https://safecheck.example.com/api
```

프론트엔드 정적 화면과 백엔드 API가 다른 포트에서 동작할 수 있으므로 개발 환경에서는 CORS를 허용합니다. 운영 환경에서는 허용 origin을 실제 도메인으로 제한합니다.

## 4. MVP 인증/세션 정책

현재 백엔드는 개발용 인증만 제공합니다.

- 개발용 mock 계정: `car1`
- 개발용 mock PIN/비밀번호: `1234`
- 로그인 성공 시 개발용 token을 반환합니다.
- 보호된 driver API는 다음 중 하나로 token을 받을 수 있습니다.
  - `Authorization: Bearer mock-driver-token-car1`
  - `x-mock-session-token: mock-driver-token-car1`

실제 운영 인증에서는 안전한 비밀번호/PIN 해시, 세션 저장소, 만료 처리, HTTPS 전송, 계정 비활성화 정책을 추가해야 합니다. 현재 `development_pin_hash`는 seed 개발 데이터 검증용이며 운영 보안 구현이 아닙니다.

## 5. 공통 응답 형식

성공 응답:

```json
{
  "success": true,
  "data": {}
}
```

오류 응답:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "한국어 오류 메시지"
  }
}
```

## 6. Health API

### GET `/api/health`

서버 상태 확인용 API입니다.

응답 예시:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "seolin-safecheck-backend"
  }
}
```

## 7. Driver Auth APIs

### POST `/api/auth/driver/login`

기사님 개발용 로그인 API입니다. 계정 정보는 PostgreSQL `users` 테이블에서 조회합니다.

요청 예시:

```json
{
  "accountId": "car1",
  "password": "1234"
}
```

`pin` 필드도 허용합니다.

```json
{
  "accountId": "car1",
  "pin": "1234"
}
```

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "token": "mock-driver-token-car1",
    "user": {
      "id": "driver_car1",
      "role": "driver",
      "accountId": "car1",
      "displayName": "1호차 기사님",
      "vehicleId": "vehicle_1",
      "vehicleName": "1호차"
    },
    "isMockSession": true
  }
}
```

실패 응답 예시:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "계정 ID 또는 PIN이 올바르지 않습니다."
  }
}
```

### GET `/api/auth/me`

현재 개발용 token에 해당하는 기사님 정보를 PostgreSQL에서 조회해 반환합니다.

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "driver_car1",
      "role": "driver",
      "accountId": "car1",
      "displayName": "1호차 기사님",
      "vehicleId": "vehicle_1",
      "vehicleName": "1호차"
    },
    "isMockSession": true
  }
}
```

### POST `/api/auth/logout`

mock 로그아웃 API입니다. 현재는 실제 세션 저장소가 없으므로 항상 성공 응답을 반환합니다.

```json
{
  "success": true,
  "data": {
    "message": "로그아웃되었습니다."
  }
}
```

## 8. Driver Schedule APIs

### GET `/api/driver/schedules/today`

오늘 기사님 차량의 시간대 목록을 반환합니다.

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "date": "2026-05-22",
    "vehicle": {
      "id": "vehicle_1",
      "name": "1호차"
    },
    "schedules": [
      {
        "id": "schedule_1330",
        "vehicleId": "vehicle_1",
        "name": "등원",
        "startTime": "13:30"
      },
      {
        "id": "schedule_1440",
        "vehicleId": "vehicle_1",
        "name": "등원",
        "startTime": "14:40"
      },
      {
        "id": "schedule_1550",
        "vehicleId": "vehicle_1",
        "name": "등원",
        "startTime": "15:50"
      }
    ]
  }
}
```

## 9. Driver Student List API

### GET `/api/driver/schedules/:scheduleId/students`

선택한 시간대의 원생 탑승 목록을 반환합니다.

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": "schedule_1330",
      "name": "등원",
      "startTime": "13:30"
    },
    "students": [
      {
        "studentId": "student_1330_1",
        "studentName": "김서린",
        "pickupPlace": "만촌역 앞",
        "status": "unchecked"
      }
    ]
  }
}
```

잘못된 `scheduleId` 응답 예시:

```json
{
  "success": false,
  "error": {
    "code": "SCHEDULE_NOT_FOUND",
    "message": "선택한 운행 시간대를 찾을 수 없습니다."
  }
}
```

## 10. Driver Attendance Save API

### POST `/api/driver/attendance/save`

선택한 시간대의 출결 기록을 전체 저장합니다. 현재는 PostgreSQL `attendance_records`에 insert/update를 수행하며 SMS는 발송하지 않습니다.

요청 예시:

```json
{
  "date": "2026-05-22",
  "vehicleId": "vehicle_1",
  "scheduleId": "schedule_1330",
  "records": [
    {
      "studentId": "student_1",
      "status": "boarded",
      "pickupPlace": "만촌역 앞"
    }
  ]
}
```

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "savedAt": "2026-05-22T00:00:00.000Z",
    "summary": {
      "total": 3,
      "boarded": 2,
      "notBoarded": 1,
      "unchecked": 0
    },
    "isMockSave": false
  }
}
```

필수 필드 누락 응답 예시:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "출결 저장에 필요한 값이 부족합니다."
  }
}
```

## 11. 향후 Admin API 개요

관리자 API는 다음 단계 이후 별도 구현합니다.

- `GET /api/admin/vehicles`
- `POST /api/admin/vehicles`
- `GET /api/admin/schedules`
- `POST /api/admin/schedules`
- `GET /api/admin/students`
- `POST /api/admin/students`
- `GET /api/admin/attendance`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`

관리자 API는 관리자 권한 인증과 입력값 검증을 반드시 포함해야 합니다.

## 12. 향후 SMS API/로그 개요

SMS는 출결 저장 이후 별도 모듈에서 처리합니다. 현재 작업에서는 SMS 발송과 SMS 로그 생성을 구현하지 않습니다.

향후 검토 API:

- `GET /api/admin/sms-logs`
- `POST /api/internal/sms/send`

SMS provider, 발신번호, 과금 방식, 실패 재시도 정책은 추후 확정 필요입니다.

## 13. 향후 Excel API 개요

Excel은 DB의 원본 데이터를 가져오거나 내보내는 보조 수단입니다. 현재 작업에서는 Excel import/export를 구현하지 않습니다.

향후 검토 API:

- `POST /api/admin/excel/import`
- `GET /api/admin/excel/export`

## 14. 현재 DB 연동 구현 메모

- 현재 백엔드 driver API는 `server/src/repositories`를 통해 PostgreSQL을 사용합니다.
- schema 파일: `server/src/db/schema.sql`
- seed 파일: `server/src/db/seed.sql`
- seed 데이터는 개발용 가짜 원생/차량/시간대 데이터입니다.
- 프론트엔드가 현재 백엔드 API를 호출하도록 바꾸는 작업은 별도 후속 작업에서 진행합니다.
- SMS 발송, SMS 로그 생성, Excel import/export, 관리자 CRUD API는 아직 구현하지 않았습니다.
