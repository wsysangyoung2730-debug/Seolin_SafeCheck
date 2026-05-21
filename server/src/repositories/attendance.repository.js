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
          record.pickupPlace,
        ],
      );
    }

    await client.query("commit");

    return {
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
