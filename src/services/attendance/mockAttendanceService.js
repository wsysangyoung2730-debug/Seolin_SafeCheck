import { getAttendanceSummary } from "./attendanceStatus.js";

// MVP 개발 전용 mock 저장 서비스입니다. 실제 DB/API 연동 시 같은 입력 형태로 교체합니다.
export async function saveAttendance({ date, vehicleId, scheduleId, records }) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 450);
  });

  return {
    success: true,
    savedAt: new Date().toISOString(),
    request: {
      date,
      vehicleId,
      scheduleId,
      records,
    },
    summary: getAttendanceSummary(records),
  };
}
