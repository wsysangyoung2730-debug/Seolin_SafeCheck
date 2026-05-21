const pool = require("../db/pool");

async function findStudentsByScheduleId(scheduleId) {
  const result = await pool.query(
    `
      select
        students.id as student_id,
        students.name as student_name,
        coalesce(
          route_schedule_students.pickup_place_override,
          students.default_pickup_place
        ) as pickup_place
      from route_schedule_students
      inner join students on students.id = route_schedule_students.student_id
      where route_schedule_students.route_schedule_id = $1
        and students.is_active = true
      order by
        route_schedule_students.pickup_order nulls last,
        students.name asc
    `,
    [scheduleId],
  );

  return result.rows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    pickupPlace: row.pickup_place,
    status: "unchecked",
  }));
}

module.exports = {
  findStudentsByScheduleId,
};
