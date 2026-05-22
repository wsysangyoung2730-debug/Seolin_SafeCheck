const pool = require("../db/pool");

function formatTimeValue(value) {
  if (typeof value === "string") {
    return value.slice(0, 5);
  }

  return value;
}

function toSchedule(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    dayOfWeek: row.day_of_week,
    name: row.name,
    startTime: formatTimeValue(row.start_time),
  };
}

async function findSchedulesByVehicleId({ vehicleId, dayOfWeek }) {
  const result = await pool.query(
    `
      select id, vehicle_id, day_of_week, name, start_time
      from route_schedules
      where vehicle_id = $1
        and day_of_week = $2
        and is_active = true
      order by start_time asc
    `,
    [vehicleId, dayOfWeek],
  );

  return result.rows.map(toSchedule);
}

async function findScheduleForVehicle({ scheduleId, vehicleId }) {
  const result = await pool.query(
    `
      select id, vehicle_id, day_of_week, name, start_time
      from route_schedules
      where id = $1
        and vehicle_id = $2
        and is_active = true
      limit 1
    `,
    [scheduleId, vehicleId],
  );

  return result.rows[0] ? toSchedule(result.rows[0]) : null;
}

module.exports = {
  findScheduleForVehicle,
  findSchedulesByVehicleId,
};
