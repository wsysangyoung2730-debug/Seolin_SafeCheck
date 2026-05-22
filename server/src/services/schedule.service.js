const {
  findScheduleForVehicle,
  findSchedulesByVehicleId,
} = require("../repositories/schedule.repository");
const { findStudentsByScheduleId } = require("../repositories/student.repository");
const { findVehicleByDriverUserId } = require("../repositories/vehicle.repository");

function getTodayDateValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getDayOfWeekFromDate(date) {
  const [year, month, day] = normalizeDateValue(date).split("-").map(Number);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

function normalizeDateValue(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date : getTodayDateValue();
}

async function getTodaySchedules(driverUserId, date) {
  const vehicle = await findVehicleByDriverUserId(driverUserId);
  const targetDate = normalizeDateValue(date);
  const dayOfWeek = getDayOfWeekFromDate(targetDate);
  const schedules = vehicle
    ? await findSchedulesByVehicleId({ vehicleId: vehicle.id, dayOfWeek })
    : [];

  return {
    date: targetDate,
    dayOfWeek,
    vehicle,
    schedules,
  };
}

async function getScheduleStudents({ driverUserId, scheduleId, date }) {
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

  const targetDate = normalizeDateValue(date);

  return {
    date: targetDate,
    schedule,
    students: await findStudentsByScheduleId(scheduleId, targetDate),
  };
}

module.exports = {
  getScheduleStudents,
  getTodaySchedules,
};
