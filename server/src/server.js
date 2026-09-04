require("dotenv").config();

const createApp = require("./app");
const { ensureDevelopmentScheduleSchema } = require("./db/developmentSchema");
const { runMigrations } = require("./db/migrations");

const app = createApp();
const port = Number(process.env.PORT || 3000);

async function startServer() {
  await runMigrations();

  try {
    await ensureDevelopmentScheduleSchema();
  } catch (error) {
    console.warn("development schema check skipped:", error.message);
  }

  app.listen(port, () => {
    console.log(`seolin-safecheck-backend listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
