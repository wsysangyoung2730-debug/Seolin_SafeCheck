const pool = require("../db/pool");

function createSmsLogId({ attendanceRecordId, status }) {
  return `sms_${attendanceRecordId}_${status}_${Date.now()}`;
}

function maskContact(parentPhone) {
  if (!parentPhone) {
    return null;
  }

  const digits = parentPhone.replace(/\D/g, "");

  if (digits.length < 4) {
    return "****";
  }

  return `****${digits.slice(-4)}`;
}

async function findSmsTargets({ date, scheduleId, statuses }) {
  const result = await pool.query(
    `
      select
        attendance_records.id as attendance_record_id,
        attendance_records.status,
        attendance_records.pickup_place,
        attendance_records.checked_at,
        students.id as student_id,
        students.name as student_name,
        students.parent_phone,
        route_schedules.start_time
      from attendance_records
      inner join students on students.id = attendance_records.student_id
      inner join route_schedules on route_schedules.id = attendance_records.route_schedule_id
      where attendance_records.attendance_date = $1
        and attendance_records.route_schedule_id = $2
        and attendance_records.status = any($3::text[])
      order by route_schedules.start_time asc, students.name asc
    `,
    [date, scheduleId, statuses],
  );

  return result.rows.map((row) => ({
    attendanceRecordId: row.attendance_record_id,
    status: row.status,
    pickupPlace: row.pickup_place,
    checkedAt: row.checked_at,
    studentId: row.student_id,
    studentName: row.student_name,
    parentPhone: row.parent_phone,
    parentContactMasked: maskContact(row.parent_phone),
    startTime:
      typeof row.start_time === "string"
        ? row.start_time.slice(0, 5)
        : row.start_time,
  }));
}

async function insertSmsLog({
  attendanceRecordId,
  studentId,
  parentContactMasked,
  message,
  status,
  provider,
  providerMessageId,
  errorMessage,
  sentAt,
}) {
  const result = await pool.query(
    `
      insert into sms_logs (
        id,
        attendance_record_id,
        student_id,
        parent_phone,
        message,
        status,
        provider,
        provider_message_id,
        error_message,
        sent_at,
        created_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now()
      )
      returning id
    `,
    [
      createSmsLogId({ attendanceRecordId, status }),
      attendanceRecordId,
      studentId,
      parentContactMasked,
      message,
      status,
      provider,
      providerMessageId,
      errorMessage,
      sentAt,
    ],
  );

  return result.rows[0].id;
}

async function findSmsLogs({ date }) {
  const values = [];
  const where = [];

  if (date) {
    values.push(date);
    where.push(`attendance_records.attendance_date = $${values.length}`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const result = await pool.query(
    `
      select
        sms_logs.created_at,
        sms_logs.parent_phone,
        sms_logs.message,
        sms_logs.status,
        sms_logs.provider,
        sms_logs.provider_message_id,
        sms_logs.error_message,
        students.name as student_name
      from sms_logs
      left join students on students.id = sms_logs.student_id
      left join attendance_records on attendance_records.id = sms_logs.attendance_record_id
      ${whereSql}
      order by sms_logs.created_at desc
      limit 100
    `,
    values,
  );

  return result.rows.map((row) => ({
    createdAt: row.created_at,
    studentName: row.student_name || "-",
    parentContactMasked: row.parent_phone,
    message: row.message,
    status: row.status,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    errorMessage: row.error_message,
  }));
}

module.exports = {
  findSmsLogs,
  findSmsTargets,
  insertSmsLog,
  maskContact,
};
