const crypto = require("crypto");

const pool = require("../db/pool");

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createAuthSession({ userId, token, expiresAt }) {
  const sessionId = `session_${crypto.randomUUID()}`;

  await pool.query(
    `
      insert into auth_sessions (
        id,
        token_hash,
        user_id,
        expires_at,
        created_at,
        last_seen_at
      ) values ($1, $2, $3, $4, now(), now())
    `,
    [sessionId, hashSessionToken(token), userId, expiresAt],
  );

  return sessionId;
}

async function findUserBySessionToken(token) {
  if (!token) {
    return null;
  }

  const result = await pool.query(
    `
      update auth_sessions
      set last_seen_at = now()
      from users
      left join vehicles on vehicles.driver_user_id = users.id
      where auth_sessions.token_hash = $1
        and auth_sessions.user_id = users.id
        and auth_sessions.expires_at > now()
        and users.is_active = true
      returning
        users.id,
        users.login_id,
        users.role,
        users.display_name,
        vehicles.id as vehicle_id,
        vehicles.name as vehicle_name
    `,
    [hashSessionToken(token)],
  );

  return result.rows[0] || null;
}

async function deleteAuthSession(token) {
  if (!token) {
    return;
  }

  await pool.query(
    "delete from auth_sessions where token_hash = $1",
    [hashSessionToken(token)],
  );
}

async function deleteExpiredAuthSessions() {
  await pool.query("delete from auth_sessions where expires_at <= now()");
}

module.exports = {
  createAuthSession,
  deleteAuthSession,
  deleteExpiredAuthSessions,
  findUserBySessionToken,
};
