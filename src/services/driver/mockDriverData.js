// MVP 개발 전용 mock 데이터입니다. 실제 인증/API 구현 시 이 파일을 교체합니다.
export const MOCK_DRIVER_USERS = [
  {
    id: "driver_car1",
    accountId: "car1",
    displayName: "1호차 기사님",
    mockPin: "1234",
    vehicleId: "vehicle_1",
    isActive: true,
  },
];

export const MOCK_VEHICLES = [
  {
    id: "vehicle_1",
    name: "1호차",
    driverUserId: "driver_car1",
    isActive: true,
  },
];

export const MOCK_ROUTE_SCHEDULES = [
  {
    id: "schedule_1330",
    vehicleId: "vehicle_1",
    name: "등원",
    startTime: "13:30",
    isActive: true,
  },
  {
    id: "schedule_1440",
    vehicleId: "vehicle_1",
    name: "등원",
    startTime: "14:40",
    isActive: true,
  },
  {
    id: "schedule_1550",
    vehicleId: "vehicle_1",
    name: "등원",
    startTime: "15:50",
    isActive: true,
  },
];

export const MOCK_SCHEDULE_STUDENTS = {
  schedule_1330: [
    {
      studentId: "student_1330_1",
      studentName: "김서린",
      pickupPlace: "만촌역 앞",
      status: "unchecked",
    },
    {
      studentId: "student_1330_2",
      studentName: "박도윤",
      pickupPlace: "아파트 정문",
      status: "unchecked",
    },
    {
      studentId: "student_1330_3",
      studentName: "이지우",
      pickupPlace: "편의점 앞",
      status: "unchecked",
    },
  ],
  schedule_1440: [
    {
      studentId: "student_1440_1",
      studentName: "최민준",
      pickupPlace: "학원 앞 사거리",
      status: "unchecked",
    },
    {
      studentId: "student_1440_2",
      studentName: "한지민",
      pickupPlace: "편의점 앞",
      status: "unchecked",
    },
    {
      studentId: "student_1440_3",
      studentName: "오도윤",
      pickupPlace: "아파트 후문",
      status: "unchecked",
    },
  ],
  schedule_1550: [
    {
      studentId: "student_1550_1",
      studentName: "정하린",
      pickupPlace: "버스정류장 앞",
      status: "unchecked",
    },
    {
      studentId: "student_1550_2",
      studentName: "윤서준",
      pickupPlace: "태권도장 앞",
      status: "unchecked",
    },
    {
      studentId: "student_1550_3",
      studentName: "강지우",
      pickupPlace: "놀이터 입구",
      status: "unchecked",
    },
  ],
};

export function getVehicleForDriver(driverUserId) {
  return MOCK_VEHICLES.find(
    (vehicle) => vehicle.driverUserId === driverUserId && vehicle.isActive,
  );
}

export function getTodayRouteSchedulesForDriver(driverUserId) {
  const vehicle = getVehicleForDriver(driverUserId);

  if (!vehicle) {
    return [];
  }

  return MOCK_ROUTE_SCHEDULES.filter(
    (schedule) => schedule.vehicleId === vehicle.id && schedule.isActive,
  );
}

export function getRouteScheduleForDriver({ driverUserId, scheduleId }) {
  const vehicle = getVehicleForDriver(driverUserId);

  if (!vehicle) {
    return null;
  }

  return (
    MOCK_ROUTE_SCHEDULES.find(
      (schedule) =>
        schedule.id === scheduleId &&
        schedule.vehicleId === vehicle.id &&
        schedule.isActive,
    ) ?? null
  );
}

export function getScheduleStudentsForDriver({ driverUserId, scheduleId }) {
  const schedule = getRouteScheduleForDriver({ driverUserId, scheduleId });

  if (!schedule) {
    return [];
  }

  return (MOCK_SCHEDULE_STUDENTS[scheduleId] ?? []).map((student) => ({
    ...student,
  }));
}
