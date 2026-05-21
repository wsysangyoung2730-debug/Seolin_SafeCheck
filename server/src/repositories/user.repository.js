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
  findDriverById,
  findDriverByLoginId,
  toPublicDriverUser,
};
