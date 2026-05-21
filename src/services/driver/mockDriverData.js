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
