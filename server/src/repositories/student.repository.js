const pool = require("../db/pool");

async function findStudentsByScheduleId(scheduleId, date) {
  const result = await pool.query(
    `
      select
        students.id as student_id,
        students.name as student_name,
        coalesce(
          route_schedule_students.pickup_place_override,
          students.default_pickup_place
        ) as pickup_place,
        coalesce(attendance_records.status, 'unchecked') as status,
        attendance_records.updated_at as last_saved_at
      from route_schedule_students
      inner join students on students.id = route_schedule_students.student_id
      left join attendance_records
        on attendance_records.route_schedule_id = route_schedule_students.route_schedule_id
        and attendance_records.student_id = students.id
        and attendance_records.attendance_date = $2
      where route_schedule_students.route_schedule_id = $1
        and students.is_active = true
      order by
        route_schedule_students.pickup_order nulls last,
        students.name asc
    `,
    [scheduleId, date],
  );

  return result.rows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    pickupPlace: row.pickup_place,
    status: row.status,
    lastSavedAt: row.last_saved_at,
  }));
}

module.exports = {
  findStudentsByScheduleId,
};
