const pool = require("../db/pool");

async function findVehicleByDriverUserId(driverUserId) {
  const result = await pool.query(
    `
      select id, name
      from vehicles
      where driver_user_id = $1
        and is_active = true
      limit 1
    `,
    [driverUserId],
  );

  return result.rows[0] || null;
}

module.exports = {
  findVehicleByDriverUserId,
};
