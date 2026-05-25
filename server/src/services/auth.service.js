const {
  findActiveUserById,
  findAdminByLoginId,
  findDriverByLoginId,
  toPublicAdminUser,
  toPublicDriverUser,
  toPublicUser,
} = require("../repositories/user.repository");

const DEVELOPMENT_ADMIN_TOKEN = "mock-admin-token-admin";
const DEVELOPMENT_ADMIN_ID = "admin_1";
const DEVELOPMENT_DRIVER_TOKEN = "mock-driver-token-car1";
const DEVELOPMENT_DRIVER_ID = "driver_car1";
const ADMIN_TOKEN_PREFIX = "mock-admin-token-";
const DRIVER_TOKEN_PREFIX = "mock-driver-token-";

async function loginAdmin({ accountId, password, pin }) {
  const credential = password || pin;
  const adminUser = accountId ? await findAdminByLoginId(accountId) : null;

  if (!adminUser || adminUser.development_pin_hash !== credential) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    token: createUserToken(adminUser),
    user: toPublicAdminUser(adminUser),
  };
}

async function loginDriver({ accountId, password, pin }) {
  const credential = password || pin;
  const driverUser = accountId ? await findDriverByLoginId(accountId) : null;

  if (!driverUser || driverUser.development_pin_hash !== credential) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    token: createUserToken(driverUser),
    user: toPublicDriverUser(driverUser),
  };
}

function createUserToken(user) {
  if (user.role === "admin") {
    return `${ADMIN_TOKEN_PREFIX}${user.id}`;
  }

  return `${DRIVER_TOKEN_PREFIX}${user.id}`;
}

function extractMockToken(req) {
  const authHeader = req.get("authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return req.get("x-mock-session-token") || "";
}

async function getCurrentUser(req) {
  const token = extractMockToken(req);

  if (token === DEVELOPMENT_ADMIN_TOKEN) {
    const adminUser = await findActiveUserById(DEVELOPMENT_ADMIN_ID);
    return toPublicUser(adminUser);
  }

  if (token === DEVELOPMENT_DRIVER_TOKEN) {
    const driverUser = await findActiveUserById(DEVELOPMENT_DRIVER_ID);
    return toPublicUser(driverUser);
  }

  if (token.startsWith(ADMIN_TOKEN_PREFIX)) {
    const adminUser = await findActiveUserById(token.slice(ADMIN_TOKEN_PREFIX.length));
    return adminUser?.role === "admin" ? toPublicUser(adminUser) : null;
  }

  if (token.startsWith(DRIVER_TOKEN_PREFIX)) {
    const driverUser = await findActiveUserById(token.slice(DRIVER_TOKEN_PREFIX.length));
    return driverUser?.role === "driver" ? toPublicUser(driverUser) : null;
  }

  return null;
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
};
