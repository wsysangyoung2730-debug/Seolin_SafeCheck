const {
  createAdminStudent,
  deactivateAdminStudent,
  findAdminAttendanceRecords,
  findAdminSchedules,
  findAdminStudents,
  findAdminVehicles,
  getOverviewCounts,
  updateAdminStudent,
} = require("../repositories/admin.repository");

const VALID_ATTENDANCE_STATUSES = new Set([
  "unchecked",
  "boarded",
  "not_boarded",
]);

function normalizeStudentInput({ studentName, pickupPlace, isActive }) {
  return {
    studentName: typeof studentName === "string" ? studentName.trim() : "",
    pickupPlace: typeof pickupPlace === "string" ? pickupPlace.trim() : "",
    isActive: typeof isActive === "boolean" ? isActive : true,
  };
}

function validateStudentInput(student) {
  if (!student.studentName) {
    return "원생 이름을 입력해주세요.";
  }

  if (!student.pickupPlace) {
    return "탑승 장소를 입력해주세요.";
  }

  return "";
}

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

async function createStudent(input) {
  const student = normalizeStudentInput(input);
  const validationMessage = validateStudentInput(student);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  return {
    success: true,
    data: {
      student: await createAdminStudent(student),
    },
  };
}

async function updateStudent(studentId, input) {
  if (!studentId) {
    return {
      success: false,
      message: "원생 정보를 찾을 수 없습니다.",
    };
  }

  const student = normalizeStudentInput(input);
  const validationMessage = validateStudentInput(student);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  const updatedStudent = await updateAdminStudent({
    studentId,
    ...student,
  });

  if (!updatedStudent) {
    return {
      success: false,
      code: "STUDENT_NOT_FOUND",
      message: "원생 정보를 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    data: {
      student: updatedStudent,
    },
  };
}

async function deactivateStudent(studentId) {
  if (!studentId) {
    return {
      success: false,
      message: "원생 정보를 찾을 수 없습니다.",
    };
  }

  const student = await deactivateAdminStudent(studentId);

  if (!student) {
    return {
      success: false,
      code: "STUDENT_NOT_FOUND",
      message: "원생 정보를 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    data: {
      student,
    },
  };
}

module.exports = {
  createStudent,
  deactivateStudent,
  getAdminAttendanceRecords,
  getAdminOverview,
  getAdminSchedules,
  getAdminStudents,
  getAdminVehicles,
  updateStudent,
};
