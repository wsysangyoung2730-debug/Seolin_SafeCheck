const { upsertAttendanceRecords } = require("../repositories/attendance.repository");

const VALID_ATTENDANCE_STATUSES = new Set([
  "unchecked",
  "boarded",
  "not_boarded",
]);

function hasValidRecords(records) {
  return (
    Array.isArray(records) &&
    records.length > 0 &&
    records.every(
      (record) =>
        record &&
        record.studentId &&
        VALID_ATTENDANCE_STATUSES.has(record.status),
    )
  );
}

async function saveAttendance({
  date,
  vehicleId,
  scheduleId,
  records,
  checkedByUserId,
}) {
  if (!date || !vehicleId || !scheduleId || !hasValidRecords(records)) {
    return {
      success: false,
      message: "출결 저장에 필요한 값이 부족합니다.",
    };
  }

  if (!checkedByUserId) {
    return {
      success: false,
      message: "출결 저장을 위한 기사님 정보가 없습니다.",
    };
  }

  const result = await upsertAttendanceRecords({
    date,
    vehicleId,
    scheduleId,
    checkedByUserId,
    records,
  });

  if (result.status === "forbidden") {
    return {
      success: false,
      code: "ATTENDANCE_SCOPE_FORBIDDEN",
      message: "이 차량과 시간표의 출결을 저장할 권한이 없습니다.",
    };
  }

  if (result.status === "student_not_assigned") {
    return {
      success: false,
      code: "STUDENT_NOT_ASSIGNED",
      message: "시간표에 배정되지 않은 원생이 포함되어 있습니다.",
    };
  }
  const smsSummary = {
    total: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    disabled: true,
  };

  return {
    success: true,
    data: {
      savedAt: result.savedAt,
      summary: result.summary,
      smsSummary,
      isMockSave: false,
    },
  };
}

module.exports = {
  saveAttendance,
};
