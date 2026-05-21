const VALID_ATTENDANCE_STATUSES = new Set([
  "unchecked",
  "boarded",
  "not_boarded",
]);

function getAttendanceSummary(records) {
  return records.reduce(
    (summary, record) => {
      if (record.status === "boarded") {
        summary.boarded += 1;
      } else if (record.status === "not_boarded") {
        summary.notBoarded += 1;
      } else {
        summary.unchecked += 1;
      }

      summary.total += 1;
      return summary;
    },
    {
      total: 0,
      boarded: 0,
      notBoarded: 0,
      unchecked: 0,
    },
  );
}

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

function saveMockAttendance({ date, vehicleId, scheduleId, records }) {
  if (!date || !vehicleId || !scheduleId || !hasValidRecords(records)) {
    return {
      success: false,
      message: "출결 저장에 필요한 값이 부족합니다.",
    };
  }

  return {
    success: true,
    data: {
      savedAt: new Date().toISOString(),
      summary: getAttendanceSummary(records),
      isMockSave: true,
    },
  };
}

module.exports = {
  saveMockAttendance,
};
