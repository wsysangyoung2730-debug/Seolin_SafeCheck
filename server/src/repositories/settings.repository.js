const pool = require("../db/pool");

async function getSettingValue(key) {
  const result = await pool.query(
    `
      select value
      from settings
      where key = $1
      limit 1
    `,
    [key],
  );

  return result.rows[0]?.value ?? null;
}

module.exports = {
  getSettingValue,
};
