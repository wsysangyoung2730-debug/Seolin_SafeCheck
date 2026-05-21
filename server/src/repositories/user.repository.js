const pool = require("../db/pool");

function toPublicDriverUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    role: row.role,
    accountId: row.login_id,
    displayName: row.display_name,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
  };
}

function toPublicAdminUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    role: row.role,
    accountId: row.login_id,
    displayName: row.display_name,
  };
}

function toPublicUser(row) {
  if (!row) {
    return null;
  }

  if (row.role === "admin") {
    return toPublicAdminUser(row);
  }

  return toPublicDriverUser(row);
}

async function findActiveUserById(userId) {
  const result = await pool.query(
    `
      select
        users.id,
        users.login_id,
        users.role,
        users.display_name,
        vehicles.id as vehicle_id,
        vehicles.name as vehicle_name
      from users
      left join vehicles on vehicles.driver_user_id = users.id
      where users.id = $1
        and users.is_active = true
      limit 1
    `,
    [userId],
  );

  return result.rows[0] || null;
}

async function findAdminByLoginId(loginId) {
  const result = await pool.query(
    `
      select
        id,
        login_id,
        development_pin_hash,
        role,
        display_name
      from users
      where login_id = $1
        and role = 'admin'
        and is_active = true
      limit 1
    `,
    [loginId],
  );

  return result.rows[0] || null;
}

async function findDriverByLoginId(loginId) {
  const result = await pool.query(
    `
      select
        users.id,
        users.login_id,
        users.development_pin_hash,
        users.role,
        users.display_name,
        vehicles.id as vehicle_id,
        vehicles.name as vehicle_name
      from users
      left join vehicles on vehicles.driver_user_id = users.id
      where users.login_id = $1
        and users.role = 'driver'
        and users.is_active = true
      limit 1
    `,
    [loginId],
  );

  return result.rows[0] || null;
}

async function findDriverById(driverUserId) {
  const result = await pool.query(
    `
      select
        users.id,
        users.login_id,
        users.role,
        users.display_name,
        vehicles.id as vehicle_id,
        vehicles.name as vehicle_name
      from users
      left join vehicles on vehicles.driver_user_id = users.id
      where users.id = $1
        and users.role = 'driver'
        and users.is_active = true
      limit 1
    `,
    [driverUserId],
  );

  return result.rows[0] || null;
}

module.exports = {
  findActiveUserById,
  findAdminByLoginId,
  findDriverById,
  findDriverByLoginId,
  toPublicAdminUser,
  toPublicDriverUser,
  toPublicUser,
};
