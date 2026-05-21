const pool = require("./pool");

async function checkDatabaseHealth() {
  try {
    await pool.query("select 1");
    return "ok";
  } catch (error) {
    return "unavailable";
  }
}

module.exports = {
  checkDatabaseHealth,
};
