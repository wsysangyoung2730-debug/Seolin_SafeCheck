const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  ...(connectionString
    ? { connectionString }
    : {
        host: process.env.POSTGRES_HOST || "localhost",
        port: Number(process.env.POSTGRES_PORT || 5432),
        database: process.env.POSTGRES_DB || "seolin_safecheck",
        user: process.env.POSTGRES_USER || "seolin_user",
        password: process.env.POSTGRES_PASSWORD || "seolin_password",
      }),
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  query_timeout: 12_000,
});

pool.on("error", (error) => {
  console.error("PostgreSQL idle connection error:", error.message);
});

module.exports = pool;
