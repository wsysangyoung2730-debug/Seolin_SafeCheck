const { MOCK_DRIVER_TOKEN, MOCK_DRIVER_USERS } = require("../mocks/driver.mock");

function toPublicDriverUser(driverUser) {
  return {
    id: driverUser.id,
    role: "driver",
    accountId: driverUser.accountId,
    displayName: driverUser.displayName,
    vehicleId: driverUser.vehicleId,
    vehicleName: driverUser.vehicleName,
  };
}

function loginMockDriver({ accountId, password, pin }) {
  const credential = password || pin;
  const driverUser = MOCK_DRIVER_USERS.find(
    (user) =>
      user.accountId === accountId &&
      user.mockPin === credential &&
      user.isActive,
  );

  if (!driverUser) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    token: MOCK_DRIVER_TOKEN,
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

function getCurrentMockDriver(req) {
  const token = extractMockToken(req);

  if (token !== MOCK_DRIVER_TOKEN) {
    return null;
  }

  const driverUser = MOCK_DRIVER_USERS.find((user) => user.isActive);
  return driverUser ? toPublicDriverUser(driverUser) : null;
}

module.exports = {
  getCurrentMockDriver,
  loginMockDriver,
};
