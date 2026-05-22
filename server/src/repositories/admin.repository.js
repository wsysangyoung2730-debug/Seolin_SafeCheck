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

async function createAdminStudent({ studentName, pickupPlace }) {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const studentId = `student_admin_${Date.now()}_${randomSuffix}`;
  const result = await pool.query(
    `
      insert into students (
        id,
        name,
        parent_name,
        parent_phone,
        default_pickup_place,
        memo,
        is_active,
        created_at,
        updated_at
      ) values (
        $1, $2, null, null, $3, null, true, now(), now()
      )
      returning id, name, default_pickup_place, parent_phone, is_active
    `,
    [studentId, studentName, pickupPlace],
  );

  const row = result.rows[0];

  return {
    studentId: row.id,
    studentName: row.name,
    pickupPlace: row.default_pickup_place,
    isActive: row.is_active,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
  };
}

async function updateAdminStudent({
  studentId,
  studentName,
  pickupPlace,
  isActive,
}) {
  const result = await pool.query(
    `
      update students
      set
        name = $2,
        default_pickup_place = $3,
        is_active = $4,
        updated_at = now()
      where id = $1
      returning id, name, default_pickup_place, parent_phone, is_active
    `,
    [studentId, studentName, pickupPlace, isActive],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    studentId: row.id,
    studentName: row.name,
    pickupPlace: row.default_pickup_place,
    isActive: row.is_active,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
  };
}

async function deactivateAdminStudent(studentId) {
  const result = await pool.query(
    `
      update students
      set
        is_active = false,
        updated_at = now()
      where id = $1
      returning id, name, default_pickup_place, parent_phone, is_active
    `,
    [studentId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    studentId: row.id,
    studentName: row.name,
    pickupPlace: row.default_pickup_place,
    isActive: row.is_active,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
  };
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

async function createAdminVehicle({ vehicleName }) {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const vehicleId = `vehicle_admin_${Date.now()}_${randomSuffix}`;
  const result = await pool.query(
    `
      insert into vehicles (
        id,
        name,
        driver_user_id,
        is_active,
        created_at,
        updated_at
      ) values (
        $1, $2, null, true, now(), now()
      )
      returning id, name, is_active
    `,
    [vehicleId, vehicleName],
  );

  return findAdminVehicleById(result.rows[0].id);
}

async function updateAdminVehicle({ vehicleId, vehicleName, isActive }) {
  const result = await pool.query(
    `
      update vehicles
      set
        name = $2,
        is_active = $3,
        updated_at = now()
      where id = $1
      returning id, name, is_active
    `,
    [vehicleId, vehicleName, isActive],
  );

  if (!result.rows[0]) {
    return null;
  }

  return findAdminVehicleById(result.rows[0].id);
}

async function deactivateAdminVehicle(vehicleId) {
  const result = await pool.query(
    `
      update vehicles
      set
        is_active = false,
        updated_at = now()
      where id = $1
      returning id, name, is_active
    `,
    [vehicleId],
  );

  if (!result.rows[0]) {
    return null;
  }

  return findAdminVehicleById(result.rows[0].id);
}

async function findAdminVehicleById(vehicleId) {
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
      where vehicles.id = $1
      limit 1
    `,
    [vehicleId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    driver: row.driver_account_id
      ? {
          accountId: row.driver_account_id,
          displayName: row.driver_display_name,
        }
      : null,
    isActive: row.is_active,
  };
}

async function findVehicleExists(vehicleId) {
  const result = await pool.query(
    `
      select exists(
        select 1 from vehicles where id = $1 and is_active = true
      ) as exists
    `,
    [vehicleId],
  );

  return Boolean(result.rows[0]?.exists);
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

async function createAdminSchedule({ vehicleId, scheduleName, startTime }) {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const scheduleId = `schedule_admin_${Date.now()}_${randomSuffix}`;
  const result = await pool.query(
    `
      insert into route_schedules (
        id,
        vehicle_id,
        name,
        start_time,
        is_active,
        created_at,
        updated_at
      ) values (
        $1, $2, $3, $4, true, now(), now()
      )
      returning id
    `,
    [scheduleId, vehicleId, scheduleName, startTime],
  );

  return findAdminScheduleById(result.rows[0].id);
}

async function updateAdminSchedule({
  scheduleId,
  vehicleId,
  scheduleName,
  startTime,
  isActive,
}) {
  const result = await pool.query(
    `
      update route_schedules
      set
        vehicle_id = $2,
        name = $3,
        start_time = $4,
        is_active = $5,
        updated_at = now()
      where id = $1
      returning id
    `,
    [scheduleId, vehicleId, scheduleName, startTime, isActive],
  );

  if (!result.rows[0]) {
    return null;
  }

  return findAdminScheduleById(result.rows[0].id);
}

async function deactivateAdminSchedule(scheduleId) {
  const result = await pool.query(
    `
      update route_schedules
      set
        is_active = false,
        updated_at = now()
      where id = $1
      returning id
    `,
    [scheduleId],
  );

  if (!result.rows[0]) {
    return null;
  }

  return findAdminScheduleById(result.rows[0].id);
}

async function findAdminScheduleById(scheduleId) {
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
      where route_schedules.id = $1
      group by route_schedules.id, vehicles.name
      limit 1
    `,
    [scheduleId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    scheduleId: row.schedule_id,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    name: row.name,
    startTime: formatTimeValue(row.start_time),
    assignedStudentCount: row.assigned_student_count,
    isActive: row.is_active,
  };
}

async function findScheduleAssignmentData(scheduleId) {
  const schedule = await findAdminScheduleById(scheduleId);

  if (!schedule) {
    return null;
  }

  const assignedResult = await pool.query(
    `
      select student_id
      from route_schedule_students
      where route_schedule_id = $1
      order by pickup_order nulls last, student_id asc
    `,
    [scheduleId],
  );

  const studentsResult = await pool.query(
    `
      select id, name, default_pickup_place
      from students
      where is_active = true
      order by name asc
    `,
  );

  const assignedStudentIds = new Set(
    assignedResult.rows.map((row) => row.student_id),
  );

  return {
    schedule,
    assignedStudentIds: Array.from(assignedStudentIds),
    students: studentsResult.rows.map((row) => ({
      studentId: row.id,
      studentName: row.name,
      pickupPlace: row.default_pickup_place,
      isAssigned: assignedStudentIds.has(row.id),
    })),
  };
}

async function replaceScheduleStudents({ scheduleId, studentIds }) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      "delete from route_schedule_students where route_schedule_id = $1",
      [scheduleId],
    );

    for (const [index, studentId] of studentIds.entries()) {
      await client.query(
        `
          insert into route_schedule_students (
            id,
            route_schedule_id,
            student_id,
            pickup_order,
            pickup_place_override,
            memo
          ) values (
            $1, $2, $3, $4, null, null
          )
        `,
        [`rss_${scheduleId}_${studentId}`, scheduleId, studentId, index + 1],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return findScheduleAssignmentData(scheduleId);
}

async function findActiveStudentIds(studentIds) {
  if (studentIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `
      select id
      from students
      where id = any($1::text[])
        and is_active = true
    `,
    [studentIds],
  );

  return result.rows.map((row) => row.id);
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
      left join route_schedule_students
        on route_schedule_students.route_schedule_id = attendance_records.route_schedule_id
        and route_schedule_students.student_id = attendance_records.student_id
      ${whereSql}
      order by vehicles.name asc,
        route_schedules.start_time asc,
        route_schedule_students.pickup_order nulls last,
        students.name asc,
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
  createAdminStudent,
  createAdminSchedule,
  createAdminVehicle,
  deactivateAdminSchedule,
  deactivateAdminStudent,
  deactivateAdminVehicle,
  findAdminAttendanceRecords,
  findAdminVehicleById,
  findAdminScheduleById,
  findAdminSchedules,
  findAdminStudents,
  findAdminVehicles,
  findActiveStudentIds,
  findScheduleAssignmentData,
  findVehicleExists,
  getOverviewCounts,
  replaceScheduleStudents,
  updateAdminSchedule,
  updateAdminStudent,
  updateAdminVehicle,
};
