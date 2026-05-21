const {
  createAdminSchedule,
  createAdminStudent,
  createAdminVehicle,
  deactivateAdminSchedule,
  deactivateAdminStudent,
  deactivateAdminVehicle,
  findAdminAttendanceRecords,
  findAdminScheduleById,
  findAdminSchedules,
  findAdminStudents,
  findAdminVehicles,
  findActiveStudentIds,
  findScheduleAssignmentData,
  findVehicleExists,
  getOverviewCounts,
  replaceScheduleStudents,
  updateAdminSchedule,
  updateAdminStudent,
  updateAdminVehicle,
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

function normalizeVehicleInput({ vehicleName, isActive }) {
  return {
    vehicleName: typeof vehicleName === "string" ? vehicleName.trim() : "",
    isActive: typeof isActive === "boolean" ? isActive : true,
  };
}

function validateVehicleInput(vehicle) {
  if (!vehicle.vehicleName) {
    return "차량명을 입력해주세요.";
  }

  return "";
}

function normalizeScheduleInput({
  vehicleId,
  scheduleName,
  name,
  startTime,
  isActive,
}) {
  return {
    vehicleId: typeof vehicleId === "string" ? vehicleId.trim() : "",
    scheduleName:
      typeof scheduleName === "string"
        ? scheduleName.trim()
        : typeof name === "string"
          ? name.trim()
          : "",
    startTime: typeof startTime === "string" ? startTime.trim() : "",
    isActive: typeof isActive === "boolean" ? isActive : true,
  };
}

function isValidStartTime(startTime) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime);
}

async function validateScheduleInput(schedule) {
  if (!schedule.vehicleId) {
    return "차량을 선택해주세요.";
  }

  if (!(await findVehicleExists(schedule.vehicleId))) {
    return "선택한 차량을 찾을 수 없습니다.";
  }

  if (!schedule.scheduleName) {
    return "시간대 이름을 입력해주세요.";
  }

  if (!isValidStartTime(schedule.startTime)) {
    return "시작 시간을 올바르게 입력해주세요.";
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

async function createVehicle(input) {
  const vehicle = normalizeVehicleInput(input);
  const validationMessage = validateVehicleInput(vehicle);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  return {
    success: true,
    data: {
      vehicle: await createAdminVehicle(vehicle),
    },
  };
}

async function updateVehicle(vehicleId, input) {
  if (!vehicleId) {
    return {
      success: false,
      message: "차량 정보를 찾을 수 없습니다.",
    };
  }

  const vehicle = normalizeVehicleInput(input);
  const validationMessage = validateVehicleInput(vehicle);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  const updatedVehicle = await updateAdminVehicle({
    vehicleId,
    ...vehicle,
  });

  if (!updatedVehicle) {
    return {
      success: false,
      code: "VEHICLE_NOT_FOUND",
      message: "차량 정보를 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    data: {
      vehicle: updatedVehicle,
    },
  };
}

async function deactivateVehicle(vehicleId) {
  if (!vehicleId) {
    return {
      success: false,
      message: "차량 정보를 찾을 수 없습니다.",
    };
  }

  const vehicle = await deactivateAdminVehicle(vehicleId);

  if (!vehicle) {
    return {
      success: false,
      code: "VEHICLE_NOT_FOUND",
      message: "차량 정보를 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    data: {
      vehicle,
    },
  };
}

async function getAdminSchedules() {
  return {
    schedules: await findAdminSchedules(),
  };
}

async function createSchedule(input) {
  const schedule = normalizeScheduleInput(input);
  const validationMessage = await validateScheduleInput(schedule);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  return {
    success: true,
    data: {
      schedule: await createAdminSchedule(schedule),
    },
  };
}

async function updateSchedule(scheduleId, input) {
  if (!scheduleId) {
    return {
      success: false,
      message: "시간표 정보를 찾을 수 없습니다.",
    };
  }

  const schedule = normalizeScheduleInput(input);
  const validationMessage = await validateScheduleInput(schedule);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  const updatedSchedule = await updateAdminSchedule({
    scheduleId,
    ...schedule,
  });

  if (!updatedSchedule) {
    return {
      success: false,
      code: "SCHEDULE_NOT_FOUND",
      message: "시간표 정보를 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    data: {
      schedule: updatedSchedule,
    },
  };
}

async function deactivateSchedule(scheduleId) {
  if (!scheduleId) {
    return {
      success: false,
      message: "시간표 정보를 찾을 수 없습니다.",
    };
  }

  const schedule = await deactivateAdminSchedule(scheduleId);

  if (!schedule) {
    return {
      success: false,
      code: "SCHEDULE_NOT_FOUND",
      message: "시간표 정보를 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    data: {
      schedule,
    },
  };
}

async function getScheduleStudents(scheduleId) {
  const data = await findScheduleAssignmentData(scheduleId);

  if (!data) {
    return {
      success: false,
      code: "SCHEDULE_NOT_FOUND",
      message: "시간표 정보를 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    data,
  };
}

async function updateScheduleStudents(scheduleId, input) {
  const schedule = await findAdminScheduleById(scheduleId);

  if (!schedule) {
    return {
      success: false,
      code: "SCHEDULE_NOT_FOUND",
      message: "시간표 정보를 찾을 수 없습니다.",
    };
  }

  if (!Array.isArray(input.studentIds)) {
    return {
      success: false,
      message: "배정할 원생 목록이 올바르지 않습니다.",
    };
  }

  const studentIds = Array.from(
    new Set(input.studentIds.filter((studentId) => typeof studentId === "string")),
  );
  const activeStudentIds = await findActiveStudentIds(studentIds);

  if (activeStudentIds.length !== studentIds.length) {
    return {
      success: false,
      message: "배정할 수 없는 원생이 포함되어 있습니다.",
    };
  }

  return {
    success: true,
    data: await replaceScheduleStudents({
      scheduleId,
      studentIds,
    }),
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
  createSchedule,
  createStudent,
  createVehicle,
  deactivateSchedule,
  deactivateStudent,
  deactivateVehicle,
  getAdminAttendanceRecords,
  getAdminOverview,
  getAdminSchedules,
  getAdminStudents,
  getAdminVehicles,
  getScheduleStudents,
  updateSchedule,
  updateScheduleStudents,
  updateStudent,
  updateVehicle,
};
