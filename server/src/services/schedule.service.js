const {
  findScheduleForVehicle,
  findSchedulesByVehicleId,
} = require("../repositories/schedule.repository");
const { findStudentsByScheduleId } = require("../repositories/student.repository");
const { findVehicleByDriverUserId } = require("../repositories/vehicle.repository");

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

async function getTodaySchedules(driverUserId) {
  const vehicle = await findVehicleByDriverUserId(driverUserId);
  const schedules = vehicle ? await findSchedulesByVehicleId(vehicle.id) : [];

  return {
    date: getTodayDateValue(),
    vehicle,
    schedules,
  };
}

async function getScheduleStudents({ driverUserId, scheduleId }) {
  const vehicle = await findVehicleByDriverUserId(driverUserId);

  if (!vehicle) {
    return null;
  }

  const schedule = await findScheduleForVehicle({
    scheduleId,
    vehicleId: vehicle.id,
  });

  if (!schedule) {
    return null;
  }

  return {
    schedule,
    students: await findStudentsByScheduleId(scheduleId),
  };
}

module.exports = {
  getScheduleStudents,
  getTodaySchedules,
};
