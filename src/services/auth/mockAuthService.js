import { MOCK_DRIVER_USERS } from "../driver/mockDriverData.js";

const SESSION_STORAGE_KEY = "seolinSafeCheck.driverSession.v1";

function createMockSession(driverUser) {
  return {
    driverId: driverUser.id,
    accountId: driverUser.accountId,
    vehicleId: driverUser.vehicleId,
    role: "driver",
    issuedAt: new Date().toISOString(),
    isMockSession: true,
  };
}

function readSession() {
  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getDriverSession() {
  const session = readSession();

  if (!session || session.role !== "driver" || !session.driverId) {
    return null;
  }

  const driverUser = MOCK_DRIVER_USERS.find(
    (user) => user.id === session.driverId && user.isActive,
  );

  return driverUser ? session : null;
}

export function hasDriverSession() {
  return Boolean(getDriverSession());
}

export async function loginDriver({ accountId, pin }) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 250);
  });

  const driverUser = MOCK_DRIVER_USERS.find(
    (user) => user.accountId === accountId && user.mockPin === pin,
  );

  if (!driverUser || !driverUser.isActive) {
    return {
      success: false,
      message: "계정 ID 또는 PIN이 올바르지 않습니다.",
    };
  }

  const session = createMockSession(driverUser);
  writeSession(session);

  return {
    success: true,
    session,
  };
}

export function logoutDriver() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
