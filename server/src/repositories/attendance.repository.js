const pool = require("../db/pool");

function createAttendanceRecordId({ date, scheduleId, studentId }) {
  return `attendance_${date}_${scheduleId}_${studentId}`;
}

function getAttendanceSummary(records) {
  return records.reduce(
    (summary, record) => {
      if (record.status === "boarded") {
        summary.boarded += 1;
      } else if (record.status === "not_boarded") {
        summary.notBoarded += 1;
      } else {
        summary.unchecked += 1;
      }

      summary.total += 1;
      return summary;
    },
    {
      total: 0,
      boarded: 0,
      notBoarded: 0,
      unchecked: 0,
    },
  );
}

async function upsertAttendanceRecords({
  date,
  vehicleId,
  scheduleId,
  checkedByUserId,
  records,
}) {
  const client = await pool.connect();
  const savedAt = new Date();

  try {
    await client.query("begin");

    const scopeResult = await client.query(
      `
        select exists (
          select 1
          from vehicles
          inner join route_schedules
            on route_schedules.id = $3
            and route_schedules.vehicle_id = vehicles.id
            and route_schedules.is_active = true
          where vehicles.id = $1
            and vehicles.driver_user_id = $2
            and vehicles.is_active = true
        ) as is_allowed
      `,
      [vehicleId, checkedByUserId, scheduleId],
    );

    if (!scopeResult.rows[0]?.is_allowed) {
      await client.query("rollback");
      return { status: "forbidden" };
    }

    const requestedStudentIds = Array.from(
      new Set(records.map((record) => record.studentId)),
    );
    const assignmentResult = await client.query(
      `
        select
          route_schedule_students.student_id,
          coalesce(
            nullif(route_schedule_students.pickup_place_override, ''),
            students.default_pickup_place
          ) as pickup_place
        from route_schedule_students
        inner join students
          on students.id = route_schedule_students.student_id
          and students.is_active = true
        where route_schedule_students.route_schedule_id = $1
          and route_schedule_students.student_id = any($2::text[])
      `,
      [scheduleId, requestedStudentIds],
    );

    if (assignmentResult.rows.length !== requestedStudentIds.length) {
      await client.query("rollback");
      return { status: "student_not_assigned" };
    }

    const pickupPlaces = new Map(
      assignmentResult.rows.map((row) => [row.student_id, row.pickup_place]),
    );

    for (const record of records) {
      await client.query(
        `
          insert into attendance_records (
            id,
            attendance_date,
            vehicle_id,
            route_schedule_id,
            student_id,
            status,
            checked_at,
            checked_by_user_id,
            pickup_place,
            is_temporary_student,
            created_at,
            updated_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, false, now(), now()
          )
          on conflict (attendance_date, route_schedule_id, student_id)
          do update set
            status = excluded.status,
            checked_at = excluded.checked_at,
            checked_by_user_id = excluded.checked_by_user_id,
            pickup_place = excluded.pickup_place,
            updated_at = now()
        `,
        [
          createAttendanceRecordId({
            date,
            scheduleId,
            studentId: record.studentId,
          }),
          date,
          vehicleId,
          scheduleId,
          record.studentId,
          record.status,
          savedAt.toISOString(),
          checkedByUserId,
          pickupPlaces.get(record.studentId),
        ],
      );
    }

    await client.query("commit");

    return {
      status: "saved",
      savedAt: savedAt.toISOString(),
      summary: getAttendanceSummary(records),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getAttendanceSummary,
  upsertAttendanceRecords,
};
