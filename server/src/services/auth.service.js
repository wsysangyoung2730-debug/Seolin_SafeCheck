const {
  findDriverById,
  findDriverByLoginId,
  toPublicDriverUser,
} = require("../repositories/user.repository");

const DEVELOPMENT_DRIVER_TOKEN = "mock-driver-token-car1";
const DEVELOPMENT_DRIVER_ID = "driver_car1";

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
    token: DEVELOPMENT_DRIVER_TOKEN,
    user: toPublicDriverUser(driverUser),
  };
}

function extractMockToken(req) {
  const authHeader = req.get("authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return req.get("x-mock-session-token") || "";
}

async function getCurrentDriver(req) {
  const token = extractMockToken(req);

  if (token !== DEVELOPMENT_DRIVER_TOKEN) {
    return null;
  }

  const driverUser = await findDriverById(DEVELOPMENT_DRIVER_ID);
  return toPublicDriverUser(driverUser);
}

module.exports = {
  getCurrentDriver,
  loginDriver,
};
