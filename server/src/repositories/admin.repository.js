const pool = require("../db/pool");

function formatTimeValue(value) {
  if (typeof value === "string") {
    return value.slice(0, 5);
  }

  return value;
}

function formatDateValue(value) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

async function getOverviewCounts() {
  const result = await pool.query(
    `
      select
        (select count(*)::int from students) as total_students,
        (select count(*)::int from students where is_active = true) as active_students,
        (select count(*)::int from vehicles) as total_vehicles,
        (select count(*)::int from route_schedules) as total_schedules,
        (
          select count(*)::int
          from attendance_records
          where attendance_date = current_date
        ) as today_attendance_records
    `,
  );

  const row = result.rows[0];

  return {
    totalStudents: row.total_students,
    activeStudents: row.active_students,
    totalVehicles: row.total_vehicles,
    totalSchedules: row.total_schedules,
    todayAttendanceRecords: row.today_attendance_records,
  };
}

async function findAdminStudents() {
  const result = await pool.query(
    `
      select
        id,
        name,
        default_pickup_place,
        parent_phone,
        is_active
      from students
      order by is_active desc, name asc
    `,
  );

  return result.rows.map((row) => ({
    studentId: row.id,
    studentName: row.name,
    pickupPlace: row.default_pickup_place,
    isActive: row.is_active,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
  }));
}

async function findAdminVehicles() {
  const result = await pool.query(
    `
      select
        vehicles.id as vehicle_id,
        vehicles.name as vehicle_name,
        vehicles.is_active,
        users.login_id as driver_account_id,
        users.display_name as driver_display_name
      from vehicles
      left join users on users.id = vehicles.driver_user_id
      order by vehicles.name asc
    `,
  );

  return result.rows.map((row) => ({
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    driver: row.driver_account_id
      ? {
          accountId: row.driver_account_id,
          displayName: row.driver_display_name,
        }
      : null,
    isActive: row.is_active,
  }));
}

async function findAdminSchedules() {
  const result = await pool.query(
    `
      select
        route_schedules.id as schedule_id,
        route_schedules.vehicle_id,
        vehicles.name as vehicle_name,
        route_schedules.name,
        route_schedules.start_time,
        route_schedules.is_active,
        count(route_schedule_students.student_id)::int as assigned_student_count
      from route_schedules
      inner join vehicles on vehicles.id = route_schedules.vehicle_id
      left join route_schedule_students
        on route_schedule_students.route_schedule_id = route_schedules.id
      group by route_schedules.id, vehicles.name
      order by vehicles.name asc, route_schedules.start_time asc
    `,
  );

  return result.rows.map((row) => ({
    scheduleId: row.schedule_id,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    name: row.name,
    startTime: formatTimeValue(row.start_time),
    assignedStudentCount: row.assigned_student_count,
    isActive: row.is_active,
  }));
}

async function findAdminAttendanceRecords(filters = {}) {
  const where = [];
  const values = [];

  if (filters.date) {
    values.push(filters.date);
    where.push(`attendance_records.attendance_date = $${values.length}`);
  }

  if (filters.vehicleId) {
    values.push(filters.vehicleId);
    where.push(`attendance_records.vehicle_id = $${values.length}`);
  }

  if (filters.scheduleId) {
    values.push(filters.scheduleId);
    where.push(`attendance_records.route_schedule_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    where.push(`attendance_records.status = $${values.length}`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const result = await pool.query(
    `
      select
        attendance_records.attendance_date,
        attendance_records.status,
        attendance_records.pickup_place,
        attendance_records.checked_at,
        attendance_records.created_at,
        attendance_records.updated_at,
        vehicles.id as vehicle_id,
        vehicles.name as vehicle_name,
        route_schedules.id as schedule_id,
        route_schedules.name as schedule_name,
        route_schedules.start_time,
        students.id as student_id,
        students.name as student_name
      from attendance_records
      inner join vehicles on vehicles.id = attendance_records.vehicle_id
      inner join route_schedules
        on route_schedules.id = attendance_records.route_schedule_id
      inner join students on students.id = attendance_records.student_id
      ${whereSql}
      order by attendance_records.attendance_date desc,
        attendance_records.updated_at desc
      limit 100
    `,
    values,
  );

  return result.rows.map((row) => ({
    date: formatDateValue(row.attendance_date),
    vehicle: {
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
    },
    schedule: {
      scheduleId: row.schedule_id,
      name: row.schedule_name,
      startTime: formatTimeValue(row.start_time),
    },
    student: {
      studentId: row.student_id,
      studentName: row.student_name,
    },
    status: row.status,
    pickupPlace: row.pickup_place,
    savedAt: row.checked_at || row.updated_at || row.created_at,
  }));
}

module.exports = {
  findAdminAttendanceRecords,
  findAdminSchedules,
  findAdminStudents,
  findAdminVehicles,
  getOverviewCounts,
};
