const crypto = require("crypto");

const {
  findAdminByLoginId,
  findDriverByLoginId,
  toPublicAdminUser,
  toPublicDriverUser,
  toPublicUser,
} = require("../repositories/user.repository");
const {
  createAuthSession,
  deleteAuthSession,
  deleteExpiredAuthSessions,
  findUserBySessionToken,
} = require("../repositories/auth.repository");
const { verifyCredential } = require("./auth/password");
const {
  getSessionToken,
  getSessionTtlMilliseconds,
} = require("./auth/sessionCookie");

const PLACEHOLDER_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$90QMdVrUpTr7eMpQ/UZdKA$Xk+UjslpW8iosr3L3f8r3SqMSMbCRgK6zAcQKRS+rRM";

function normalizeLoginId(accountId) {
  return typeof accountId === "string" ? accountId.trim().toLowerCase() : "";
}

async function createUserSession(user) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + getSessionTtlMilliseconds());

  await deleteExpiredAuthSessions();
  await createAuthSession({
    userId: user.id,
    token,
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

async function loginAdmin({ accountId, password, pin }) {
  const credential = password || pin;
  const normalizedAccountId = normalizeLoginId(accountId);
  const adminUser = normalizedAccountId
    ? await findAdminByLoginId(normalizedAccountId)
    : null;
  const isValidCredential = await verifyCredential(
    adminUser?.password_hash || PLACEHOLDER_PASSWORD_HASH,
    credential,
  );

  if (!adminUser || !isValidCredential) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    session: await createUserSession(adminUser),
    user: toPublicAdminUser(adminUser),
  };
}

async function loginDriver({ accountId, password, pin }) {
  const credential = password || pin;
  const normalizedAccountId = normalizeLoginId(accountId);
  const driverUser = normalizedAccountId
    ? await findDriverByLoginId(normalizedAccountId)
    : null;
  const isValidCredential = await verifyCredential(
    driverUser?.password_hash || PLACEHOLDER_PASSWORD_HASH,
    credential,
  );

  if (!driverUser || !isValidCredential) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    session: await createUserSession(driverUser),
    user: toPublicDriverUser(driverUser),
  };
}

async function getCurrentUser(req) {
  return toPublicUser(await findUserBySessionToken(getSessionToken(req)));
}

async function logout(req) {
  await deleteAuthSession(getSessionToken(req));
}

async function getCurrentDriver(req) {
  const user = await getCurrentUser(req);

  if (user?.role !== "driver") {
    return null;
  }

  return user;
}

async function getCurrentAdmin(req) {
  const user = await getCurrentUser(req);

  if (user?.role !== "admin") {
    return null;
  }

  return user;
}

module.exports = {
  getCurrentAdmin,
  getCurrentDriver,
  getCurrentUser,
  loginAdmin,
  loginDriver,
  logout,
};
