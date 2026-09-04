const pool = require("./pool");
const { hashCredential } = require("../services/auth/password");

const AUTH_MIGRATION_LOCK_ID = 9081988;
const DISABLED_ACCOUNT_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$90QMdVrUpTr7eMpQ/UZdKA$Xk+UjslpW8iosr3L3f8r3SqMSMbCRgK6zAcQKRS+rRM";

async function hasColumn(client, tableName, columnName) {
  const result = await client.query(
    `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
          and column_name = $2
      ) as exists
    `,
    [tableName, columnName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function migrateLegacyCredentials(client) {
  if (!(await hasColumn(client, "users", "development_pin_hash"))) {
    return;
  }

  const result = await client.query(
    `
      select id, development_pin_hash
      from users
      where password_hash is null
        and development_pin_hash is not null
    `,
  );

  for (const user of result.rows) {
    const passwordHash = await hashCredential(user.development_pin_hash);
    await client.query(
      "update users set password_hash = $2, updated_at = now() where id = $1",
      [user.id, passwordHash],
    );
  }

  await client.query(`
    update users
    set password_hash = $1, is_active = false, updated_at = now()
    where password_hash is null
  `, [DISABLED_ACCOUNT_PASSWORD_HASH]);
  await client.query("alter table users alter column password_hash set not null");
  await client.query("alter table users drop column development_pin_hash");
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [AUTH_MIGRATION_LOCK_ID]);
    await client.query("begin");
    await migrateLegacyCredentials(client);
    await client.query(`
      create table if not exists auth_sessions (
        id text primary key,
        token_hash text not null unique,
        user_id text not null references users(id) on delete cascade,
        expires_at timestamptz not null,
        created_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create index if not exists idx_auth_sessions_user_id
        on auth_sessions(user_id)
    `);
    await client.query(`
      create index if not exists idx_auth_sessions_expires_at
        on auth_sessions(expires_at)
    `);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.query("select pg_advisory_unlock($1)", [AUTH_MIGRATION_LOCK_ID]);
    client.release();
  }
}

module.exports = {
  runMigrations,
};
