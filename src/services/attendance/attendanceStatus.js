export const ATTENDANCE_STATUSES = {
  unchecked: "unchecked",
  boarded: "boarded",
  notBoarded: "not_boarded",
};

export const ATTENDANCE_STATUS_LABEL = {
  [ATTENDANCE_STATUSES.unchecked]: "미확인",
  [ATTENDANCE_STATUSES.boarded]: "탑승",
  [ATTENDANCE_STATUSES.notBoarded]: "미탑승",
};

export function getAttendanceSummary(records) {
  return records.reduce(
    (summary, record) => {
      if (record.status === ATTENDANCE_STATUSES.boarded) {
        summary.boarded += 1;
      } else if (record.status === ATTENDANCE_STATUSES.notBoarded) {
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
