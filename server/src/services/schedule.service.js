const { MOCK_SCHEDULES } = require("../mocks/schedules.mock");
const { MOCK_STUDENTS_BY_SCHEDULE } = require("../mocks/students.mock");
const { MOCK_DRIVER_USERS } = require("../mocks/driver.mock");

function getDriverVehicle(driverUserId) {
  const driverUser = MOCK_DRIVER_USERS.find(
    (user) => user.id === driverUserId && user.isActive,
  );

  if (!driverUser) {
    return null;
  }

  return {
    id: driverUser.vehicleId,
    name: driverUser.vehicleName,
  };
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayMockSchedules(driverUserId) {
  const vehicle = getDriverVehicle(driverUserId);
  const schedules = vehicle
    ? MOCK_SCHEDULES.filter((schedule) => schedule.vehicleId === vehicle.id)
    : [];

  return {
    date: getTodayDateValue(),
    vehicle,
    schedules,
  };
}

function getMockScheduleStudents({ driverUserId, scheduleId }) {
  const vehicle = getDriverVehicle(driverUserId);

  if (!vehicle) {
    return null;
  }

  const schedule = MOCK_SCHEDULES.find(
    (item) => item.id === scheduleId && item.vehicleId === vehicle.id,
  );

  if (!schedule) {
    return null;
  }

  return {
    schedule,
    students: (MOCK_STUDENTS_BY_SCHEDULE[scheduleId] || []).map((student) => ({
      ...student,
    })),
  };
}

module.exports = {
  getMockScheduleStudents,
  getTodayMockSchedules,
};
