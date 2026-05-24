const { upsertAttendanceRecords } = require("../repositories/attendance.repository");
const { createAttendanceSmsLogs } = require("./sms/sms.service");

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
        record.pickupPlace &&
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
  let smsSummary = {
    total: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    smsSummary = await createAttendanceSmsLogs({
      date,
      scheduleId,
    });
  } catch (error) {
    console.warn("mock SMS log creation failed:", error.message);
  }

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
