# Seolin SafeCheck API Contract

## 1. 문서 목적

이 문서는 Seolin SafeCheck MVP의 백엔드 API 계약을 정의합니다. 현재 단계의 목적은 기사님용 프론트엔드 mock 흐름을 PostgreSQL 기반 백엔드 API로 교체할 수 있도록 요청/응답 형태를 고정하는 것입니다.

이 문서는 API 경로, 공통 응답 형식, 개발용 인증 방식, 기사님용 일정/원생/출결 저장 API, 관리자 API 기반과 원생/차량/시간표/출결 기록 조회 MVP API를 설명합니다. 현재 로컬 백엔드는 PostgreSQL schema/seed와 repository 계층을 사용합니다. **운영용 인증, SMS 발송, Excel 처리는 아직 포함되지 않습니다.**

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
- 기사님용 정적 프론트엔드는 이 API 계약을 기준으로 driver API를 호출합니다.
- 현재 admin API는 관리자 인증/권한 기반, 조회 API, 원생/차량/시간표 관리 MVP write API, 출결 기록 조회 API를 제공합니다.
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
- 개발용 관리자 계정: `admin`
- 개발용 관리자 PIN/비밀번호: `1234`
- 로그인 성공 시 개발용 token을 반환합니다.
- 보호된 API는 다음 중 하나로 token을 받을 수 있습니다.
  - `Authorization: Bearer mock-driver-token-car1`
  - `x-mock-session-token: mock-driver-token-car1`
  - `Authorization: Bearer mock-admin-token-admin`
  - `x-mock-session-token: mock-admin-token-admin`

권한 규칙:

- `/api/driver/*`: `driver` 권한 필요
- `/api/admin/*`: `admin` 권한 필요
- 토큰이 없거나 알 수 없으면 `UNAUTHORIZED`
- 로그인했지만 역할이 맞지 않으면 `FORBIDDEN`

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

### POST `/api/auth/admin/login`

관리자 개발용 로그인 API입니다. 계정 정보는 PostgreSQL `users` 테이블에서 조회합니다. 이 계정은 로컬 개발 검증용이며 운영용 인증이 아닙니다.

요청 예시:

```json
{
  "accountId": "admin",
  "password": "1234"
}
```

`pin` 필드도 허용합니다.

```json
{
  "accountId": "admin",
  "pin": "1234"
}
```

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "token": "mock-admin-token-admin",
    "user": {
      "id": "admin_1",
      "role": "admin",
      "accountId": "admin",
      "displayName": "관리자"
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

현재 개발용 token에 해당하는 사용자 정보를 PostgreSQL에서 조회해 반환합니다.

기사님 성공 응답 예시:

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

관리자 성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "admin_1",
      "role": "admin",
      "accountId": "admin",
      "displayName": "관리자"
    },
    "isMockSession": true
  }
}
```

토큰 누락 또는 잘못된 토큰 응답 예시:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다."
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

## 11. Admin API Foundation

현재 관리자 API는 관리자 인증/권한 기반, 안전한 조회 API, 원생 관리 MVP용 생성/수정/비활성화 API를 제공합니다. 차량/시간표 관리, SMS 발송, Excel import/export는 구현하지 않습니다.

관리자 API 공통 권한 오류:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다."
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다."
  }
}
```

### GET `/api/admin/overview`

관리자 대시보드 초기 화면에 필요한 단순 집계 값을 반환합니다.

- Required auth: `admin`
- Query parameters: 없음

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "totalStudents": 9,
    "activeStudents": 9,
    "totalVehicles": 1,
    "totalSchedules": 3,
    "todayAttendanceRecords": 0
  }
}
```

### GET `/api/admin/students`

관리자 원생 목록 화면의 기반이 되는 원생 목록을 반환합니다. 학부모 연락처 원문은 반환하지 않고 등록 여부만 반환합니다.

- Required auth: `admin`
- Query parameters: 없음

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "students": [
      {
        "studentId": "student_1330_1",
        "studentName": "김서린",
        "pickupPlace": "만촌역 앞",
        "isActive": true,
        "parentContactStatus": "not_registered"
      }
    ]
  }
}
```

### POST `/api/admin/students`

관리자가 원생을 추가합니다. 현재 MVP에서는 원생 이름과 기본 탑승 장소만 저장하며 학부모 연락처 원문은 받지 않습니다.

- Required auth: `admin`

요청 예시:

```json
{
  "studentName": "개발테스트",
  "pickupPlace": "테스트 장소"
}
```

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "student": {
      "studentId": "student_admin_1770000000000_ab12cd",
      "studentName": "개발테스트",
      "pickupPlace": "테스트 장소",
      "isActive": true,
      "parentContactStatus": "not_registered"
    }
  }
}
```

검증 실패 응답 예시:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "원생 이름을 입력해주세요."
  }
}
```

### PATCH `/api/admin/students/:studentId`

관리자가 원생 이름, 기본 탑승 장소, 활성 상태를 수정합니다.

- Required auth: `admin`

요청 예시:

```json
{
  "studentName": "개발테스트",
  "pickupPlace": "수정된 테스트 장소",
  "isActive": true
}
```

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "student": {
      "studentId": "student_admin_1770000000000_ab12cd",
      "studentName": "개발테스트",
      "pickupPlace": "수정된 테스트 장소",
      "isActive": true,
      "parentContactStatus": "not_registered"
    }
  }
}
```

### PATCH `/api/admin/students/:studentId/deactivate`

관리자가 원생을 비활성화합니다. 실제 삭제는 하지 않습니다.

- Required auth: `admin`

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "student": {
      "studentId": "student_admin_1770000000000_ab12cd",
      "studentName": "개발테스트",
      "pickupPlace": "수정된 테스트 장소",
      "isActive": false,
      "parentContactStatus": "not_registered"
    }
  }
}
```

### GET `/api/admin/vehicles`

관리자 차량 목록 화면의 기반이 되는 차량 목록을 반환합니다.

- Required auth: `admin`
- Query parameters: 없음

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "vehicleId": "vehicle_1",
        "vehicleName": "1호차",
        "driver": {
          "accountId": "car1",
          "displayName": "1호차 기사님"
        },
        "isActive": true
      }
    ]
  }
}
```

### POST `/api/admin/vehicles`

관리자가 차량을 추가합니다. 기사님 계정 생성/배정 UI는 이 단계에서 구현하지 않습니다.

- Required auth: `admin`

요청 예시:

```json
{
  "vehicleName": "개발 테스트 차량"
}
```

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "vehicle": {
      "vehicleId": "vehicle_admin_1770000000000_ab12cd",
      "vehicleName": "개발 테스트 차량",
      "driver": null,
      "isActive": true
    }
  }
}
```

### PATCH `/api/admin/vehicles/:vehicleId`

관리자가 차량명과 활성 상태를 수정합니다.

- Required auth: `admin`

요청 예시:

```json
{
  "vehicleName": "수정된 테스트 차량",
  "isActive": true
}
```

### PATCH `/api/admin/vehicles/:vehicleId/deactivate`

관리자가 차량을 비활성화합니다. 출결 기록이나 시간표를 삭제하지 않습니다.

- Required auth: `admin`

### GET `/api/admin/schedules`

관리자 운행 시간대 목록 화면의 기반이 되는 일정 목록을 반환합니다.

- Required auth: `admin`
- Query parameters: 없음

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "scheduleId": "schedule_1330",
        "vehicleId": "vehicle_1",
        "vehicleName": "1호차",
        "name": "등원",
        "startTime": "13:30",
        "assignedStudentCount": 3,
        "isActive": true
      }
    ]
  }
}
```

### POST `/api/admin/schedules`

관리자가 등원 시간표를 추가합니다.

- Required auth: `admin`

요청 예시:

```json
{
  "vehicleId": "vehicle_1",
  "scheduleName": "등원",
  "startTime": "16:20"
}
```

### PATCH `/api/admin/schedules/:scheduleId`

관리자가 차량, 시간대 이름, 시작 시간, 활성 상태를 수정합니다.

- Required auth: `admin`

요청 예시:

```json
{
  "vehicleId": "vehicle_1",
  "scheduleName": "등원",
  "startTime": "16:30",
  "isActive": true
}
```

### PATCH `/api/admin/schedules/:scheduleId/deactivate`

관리자가 시간표를 비활성화합니다. 출결 기록과 원생 기록은 삭제하지 않습니다.

- Required auth: `admin`

### GET `/api/admin/schedules/:scheduleId/students`

시간표별 원생 배정 화면에 필요한 시간표 정보, 현재 배정된 원생 ID, 활성 원생 목록을 반환합니다.

- Required auth: `admin`

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "schedule": {
      "scheduleId": "schedule_1330",
      "vehicleId": "vehicle_1",
      "vehicleName": "1호차",
      "name": "등원",
      "startTime": "13:30",
      "assignedStudentCount": 3,
      "isActive": true
    },
    "assignedStudentIds": ["student_1330_1"],
    "students": [
      {
        "studentId": "student_1330_1",
        "studentName": "김서린",
        "pickupPlace": "만촌역 앞",
        "isAssigned": true
      }
    ]
  }
}
```

### PUT `/api/admin/schedules/:scheduleId/students`

시간표별 원생 배정을 저장합니다. 요청된 `studentIds` 기준으로 배정 테이블을 동기화하며 원생/출결 기록은 삭제하지 않습니다.

- Required auth: `admin`

요청 예시:

```json
{
  "studentIds": ["student_1330_1", "student_1330_2"]
}
```

### GET `/api/admin/attendance-records`

관리자 출결 기록 조회 화면의 기반이 되는 저장된 출결 기록과 요약 집계를 반환합니다. 결과는 최근 100건으로 제한합니다.

- Required auth: `admin`
- Query parameters:
  - `date`: 선택, `YYYY-MM-DD`
  - `vehicleId`: 선택
  - `scheduleId`: 선택
  - `status`: 선택, `unchecked` / `boarded` / `not_boarded`

성공 응답 예시:

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 1,
      "boarded": 1,
      "notBoarded": 0,
      "unchecked": 0
    },
    "attendanceRecords": [
      {
        "date": "2026-05-22",
        "vehicle": {
          "vehicleId": "vehicle_1",
          "vehicleName": "1호차"
        },
        "schedule": {
          "scheduleId": "schedule_1330",
          "name": "등원",
          "startTime": "13:30"
        },
        "student": {
          "studentId": "student_1330_1",
          "studentName": "김서린"
        },
        "status": "boarded",
        "pickupPlace": "만촌역 앞",
        "savedAt": "2026-05-22T04:30:00.000Z"
      }
    ]
  }
}
```

잘못된 `status` 응답 예시:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "출결 상태값이 올바르지 않습니다."
  }
}
```

### Planned Admin APIs

다음 API는 계획만 있으며 현재 구현되어 있지 않습니다.

- `DELETE /api/admin/vehicles/:id`
- `DELETE /api/admin/schedules/:id`
- `DELETE /api/admin/students/:id`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`

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
- 기사님용 프론트엔드는 `src/services/apiClient.js`를 통해 현재 백엔드 API를 호출합니다.
- SMS 발송, SMS 로그 생성, Excel import/export는 아직 구현하지 않았습니다.
- 현재 구현된 관리자 API는 개발용 admin 로그인, 권한 확인, overview/students/vehicles/schedules/attendance-records 조회, 원생/차량/시간표 생성/수정/비활성화, 시간표별 원생 배정입니다.
