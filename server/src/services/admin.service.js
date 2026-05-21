const {
  findAdminAttendanceRecords,
  findAdminSchedules,
  findAdminStudents,
  findAdminVehicles,
  getOverviewCounts,
} = require("../repositories/admin.repository");

const VALID_ATTENDANCE_STATUSES = new Set([
  "unchecked",
  "boarded",
  "not_boarded",
]);

async function getAdminOverview() {
  return getOverviewCounts();
}

async function getAdminStudents() {
  return {
    students: await findAdminStudents(),
  };
}

async function getAdminVehicles() {
  return {
    vehicles: await findAdminVehicles(),
  };
}

async function getAdminSchedules() {
  return {
    schedules: await findAdminSchedules(),
  };
}

async function getAdminAttendanceRecords(filters) {
  if (filters.status && !VALID_ATTENDANCE_STATUSES.has(filters.status)) {
    return {
      success: false,
      message: "출결 상태값이 올바르지 않습니다.",
    };
  }

  return {
    success: true,
    data: {
      attendanceRecords: await findAdminAttendanceRecords(filters),
    },
  };
}

module.exports = {
  getAdminAttendanceRecords,
  getAdminOverview,
  getAdminSchedules,
  getAdminStudents,
  getAdminVehicles,
};
