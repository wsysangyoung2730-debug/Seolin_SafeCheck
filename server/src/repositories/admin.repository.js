const pool = require("../db/pool");
const { maskPhoneNumber } = require("../services/sms/phoneNumber");

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
        parent_name,
        default_pickup_place,
        parent_phone,
        memo,
        is_active,
        (
          select count(*)::int
          from route_schedule_students
          where route_schedule_students.student_id = students.id
        ) as assigned_schedule_count
      from students
      order by is_active desc, name asc
    `,
  );

  return result.rows.map((row) => ({
    studentId: row.id,
    studentName: row.name,
    parentName: row.parent_name || "",
    parentPhone: row.parent_phone || "",
    pickupPlace: row.default_pickup_place,
    memo: row.memo || "",
    isActive: row.is_active,
    assignedScheduleCount: row.assigned_schedule_count,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
    parentContactMasked: maskPhoneNumber(row.parent_phone),
  }));
}

async function findStudentScheduleAssignmentData(studentId) {
  const studentResult = await pool.query(
    `
      select id, name, default_pickup_place, is_active
      from students
      where id = $1
      limit 1
    `,
    [studentId],
  );
  const student = studentResult.rows[0];

  if (!student) {
    return null;
  }

  const scheduleResult = await pool.query(
    `
      select
        route_schedules.id as schedule_id,
        route_schedules.vehicle_id,
        vehicles.name as vehicle_name,
        vehicles.is_active as vehicle_is_active,
        route_schedules.day_of_week,
        route_schedules.name as schedule_name,
        route_schedules.start_time,
        route_schedules.is_active as schedule_is_active,
        route_schedule_students.id is not null as is_assigned,
        coalesce(
          nullif(route_schedule_students.pickup_place_override, ''),
          $2
        ) as pickup_place
      from route_schedules
      inner join vehicles on vehicles.id = route_schedules.vehicle_id
      left join route_schedule_students
        on route_schedule_students.route_schedule_id = route_schedules.id
        and route_schedule_students.student_id = $1
      order by
        array_position(
          array['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          route_schedules.day_of_week
        ),
        vehicles.name asc,
        route_schedules.start_time asc
    `,
    [studentId, student.default_pickup_place],
  );

  return {
    student: {
      studentId: student.id,
      studentName: student.name,
      defaultPickupPlace: student.default_pickup_place,
      isActive: student.is_active,
    },
    schedules: scheduleResult.rows.map((row) => ({
      scheduleId: row.schedule_id,
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      vehicleIsActive: row.vehicle_is_active,
      dayOfWeek: row.day_of_week,
      name: row.schedule_name,
      startTime: formatTimeValue(row.start_time),
      scheduleIsActive: row.schedule_is_active,
      isAssigned: row.is_assigned,
      pickupPlace: row.pickup_place,
    })),
  };
}

async function replaceStudentSchedules({ studentId, scheduleIds }) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const studentResult = await client.query(
      "select id from students where id = $1 for update",
      [studentId],
    );

    if (!studentResult.rows[0]) {
      await client.query("rollback");
      return { status: "student_not_found" };
    }

    const scheduleResult = scheduleIds.length === 0
      ? { rows: [] }
      : await client.query(
          `
            select id
            from route_schedules
            where id = any($1::text[])
            for share
          `,
          [scheduleIds],
        );
    const existingScheduleIds = new Set(
      scheduleResult.rows.map((row) => row.id),
    );

    if (existingScheduleIds.size !== scheduleIds.length) {
      await client.query("rollback");
      return { status: "schedule_not_found" };
    }

    await client.query(
      `
        delete from route_schedule_students
        where student_id = $1
          and not (route_schedule_id = any($2::text[]))
      `,
      [studentId, scheduleIds],
    );

    for (const scheduleId of scheduleIds) {
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
            $1,
            $2,
            $3,
            (
              select coalesce(max(pickup_order), 0) + 1
              from route_schedule_students
              where route_schedule_id = $2
            ),
            null,
            null
          )
          on conflict (route_schedule_id, student_id) do nothing
        `,
        [`rss_${scheduleId}_${studentId}`, scheduleId, studentId],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return {
    status: "updated",
    data: await findStudentScheduleAssignmentData(studentId),
  };
}

async function createAdminStudent({
  studentName,
  parentName,
  parentPhone,
  pickupPlace,
  memo,
}) {
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
        $1, $2, $3, $4, $5, $6, true, now(), now()
      )
      returning
        id,
        name,
        parent_name,
        parent_phone,
        default_pickup_place,
        memo,
        is_active
    `,
    [studentId, studentName, parentName || null, parentPhone || null, pickupPlace, memo || null],
  );

  const row = result.rows[0];

  return {
    studentId: row.id,
    studentName: row.name,
    parentName: row.parent_name || "",
    parentPhone: row.parent_phone || "",
    pickupPlace: row.default_pickup_place,
    memo: row.memo || "",
    isActive: row.is_active,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
    parentContactMasked: maskPhoneNumber(row.parent_phone),
  };
}

async function updateAdminStudent({
  studentId,
  studentName,
  parentName,
  parentPhone,
  pickupPlace,
  memo,
  isActive,
}) {
  const result = await pool.query(
    `
      update students
      set
        name = $2,
        parent_name = $3,
        parent_phone = $4,
        default_pickup_place = $5,
        memo = $6,
        is_active = $7,
        updated_at = now()
      where id = $1
      returning
        id,
        name,
        parent_name,
        parent_phone,
        default_pickup_place,
        memo,
        is_active
    `,
    [
      studentId,
      studentName,
      parentName || null,
      parentPhone || null,
      pickupPlace,
      memo || null,
      isActive,
    ],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    studentId: row.id,
    studentName: row.name,
    parentName: row.parent_name || "",
    parentPhone: row.parent_phone || "",
    pickupPlace: row.default_pickup_place,
    memo: row.memo || "",
    isActive: row.is_active,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
    parentContactMasked: maskPhoneNumber(row.parent_phone),
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
      returning
        id,
        name,
        parent_name,
        parent_phone,
        default_pickup_place,
        memo,
        is_active
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
    parentName: row.parent_name || "",
    parentPhone: row.parent_phone || "",
    pickupPlace: row.default_pickup_place,
    memo: row.memo || "",
    isActive: row.is_active,
    parentContactStatus: row.parent_phone ? "registered" : "not_registered",
    parentContactMasked: maskPhoneNumber(row.parent_phone),
  };
}

async function deleteAdminStudent(studentId) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const studentResult = await client.query(
      `
        select id, name
        from students
        where id = $1
        for update
      `,
      [studentId],
    );
    const student = studentResult.rows[0];

    if (!student) {
      await client.query("rollback");
      return null;
    }

    const smsResult = await client.query(
      `
        delete from sms_logs
        where student_id = $1
          or attendance_record_id in (
            select id
            from attendance_records
            where student_id = $1
          )
      `,
      [studentId],
    );
    const attendanceResult = await client.query(
      "delete from attendance_records where student_id = $1",
      [studentId],
    );
    const assignmentResult = await client.query(
      "delete from route_schedule_students where student_id = $1",
      [studentId],
    );
    await client.query("delete from students where id = $1", [studentId]);
    await client.query("commit");

    return {
      studentId: student.id,
      studentName: student.name,
      deletedRelations: {
        scheduleAssignments: assignmentResult.rowCount,
        attendanceRecords: attendanceResult.rowCount,
        smsLogs: smsResult.rowCount,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
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

async function deleteAdminVehicle(vehicleId) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const vehicleResult = await client.query(
      `
        select id, name
        from vehicles
        where id = $1
        for update
      `,
      [vehicleId],
    );
    const vehicle = vehicleResult.rows[0];

    if (!vehicle) {
      await client.query("rollback");
      return null;
    }

    const smsResult = await client.query(
      `
        delete from sms_logs
        where attendance_record_id in (
          select id
          from attendance_records
          where vehicle_id = $1
        )
      `,
      [vehicleId],
    );
    const attendanceResult = await client.query(
      "delete from attendance_records where vehicle_id = $1",
      [vehicleId],
    );
    const scheduleResult = await client.query(
      "delete from route_schedules where vehicle_id = $1",
      [vehicleId],
    );
    await client.query("delete from vehicles where id = $1", [vehicleId]);
    await client.query("commit");

    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      deletedRelations: {
        schedules: scheduleResult.rowCount,
        attendanceRecords: attendanceResult.rowCount,
        smsLogs: smsResult.rowCount,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
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

async function findAdminSchedules({ dayOfWeek, vehicleId } = {}) {
  const where = [];
  const values = [];

  if (dayOfWeek) {
    values.push(dayOfWeek);
    where.push(`route_schedules.day_of_week = $${values.length}`);
  }

  if (vehicleId) {
    values.push(vehicleId);
    where.push(`route_schedules.vehicle_id = $${values.length}`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const result = await pool.query(
    `
      select
        route_schedules.id as schedule_id,
        route_schedules.vehicle_id,
        vehicles.name as vehicle_name,
        route_schedules.day_of_week,
        route_schedules.name,
        route_schedules.start_time,
        route_schedules.is_active,
        count(route_schedule_students.student_id)::int as assigned_student_count
      from route_schedules
      inner join vehicles on vehicles.id = route_schedules.vehicle_id
      left join route_schedule_students
        on route_schedule_students.route_schedule_id = route_schedules.id
      ${whereSql}
      group by route_schedules.id, vehicles.name
      order by vehicles.name asc, route_schedules.day_of_week asc, route_schedules.start_time asc
    `,
    values,
  );

  return result.rows.map((row) => ({
    scheduleId: row.schedule_id,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    dayOfWeek: row.day_of_week,
    name: row.name,
    startTime: formatTimeValue(row.start_time),
    assignedStudentCount: row.assigned_student_count,
    isActive: row.is_active,
  }));
}

async function createAdminSchedule({
  vehicleId,
  dayOfWeek,
  scheduleName,
  startTime,
}) {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const scheduleId = `schedule_admin_${Date.now()}_${randomSuffix}`;
  const result = await pool.query(
    `
      insert into route_schedules (
        id,
        vehicle_id,
        day_of_week,
        name,
        start_time,
        is_active,
        created_at,
        updated_at
      ) values (
        $1, $2, $3, $4, $5, true, now(), now()
      )
      returning id
    `,
    [scheduleId, vehicleId, dayOfWeek, scheduleName, startTime],
  );

  return findAdminScheduleById(result.rows[0].id);
}

async function updateAdminSchedule({
  scheduleId,
  vehicleId,
  dayOfWeek,
  scheduleName,
  startTime,
  isActive,
}) {
  const result = await pool.query(
    `
      update route_schedules
      set
        vehicle_id = $2,
        day_of_week = $3,
        name = $4,
        start_time = $5,
        is_active = $6,
        updated_at = now()
      where id = $1
      returning id
    `,
    [scheduleId, vehicleId, dayOfWeek, scheduleName, startTime, isActive],
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

async function deleteAdminSchedule(scheduleId) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const scheduleResult = await client.query(
      `
        select id, name, vehicle_id
        from route_schedules
        where id = $1
        for update
      `,
      [scheduleId],
    );
    const schedule = scheduleResult.rows[0];

    if (!schedule) {
      await client.query("rollback");
      return null;
    }

    const smsResult = await client.query(
      `
        delete from sms_logs
        where attendance_record_id in (
          select id
          from attendance_records
          where route_schedule_id = $1
        )
      `,
      [scheduleId],
    );
    const attendanceResult = await client.query(
      "delete from attendance_records where route_schedule_id = $1",
      [scheduleId],
    );
    const assignmentResult = await client.query(
      "delete from route_schedule_students where route_schedule_id = $1",
      [scheduleId],
    );
    await client.query("delete from route_schedules where id = $1", [scheduleId]);
    await client.query("commit");

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      vehicleId: schedule.vehicle_id,
      deletedRelations: {
        studentAssignments: assignmentResult.rowCount,
        attendanceRecords: attendanceResult.rowCount,
        smsLogs: smsResult.rowCount,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function findAdminScheduleById(scheduleId) {
  const result = await pool.query(
    `
      select
        route_schedules.id as schedule_id,
        route_schedules.vehicle_id,
        vehicles.name as vehicle_name,
        route_schedules.day_of_week,
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
    dayOfWeek: row.day_of_week,
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
  deleteAdminSchedule,
  deleteAdminStudent,
  deleteAdminVehicle,
  findAdminAttendanceRecords,
  findAdminVehicleById,
  findAdminScheduleById,
  findAdminSchedules,
  findAdminStudents,
  findAdminVehicles,
  findActiveStudentIds,
  findScheduleAssignmentData,
  findStudentScheduleAssignmentData,
  findVehicleExists,
  getOverviewCounts,
  replaceScheduleStudents,
  replaceStudentSchedules,
  updateAdminSchedule,
  updateAdminStudent,
  updateAdminVehicle,
};
