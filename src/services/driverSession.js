const SESSION_STORAGE_KEY = "seolinSafeCheck.driverApiSession.v1";

function readSession() {
  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function writeDriverSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearDriverSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getStoredDriverSession() {
  const session = readSession();

  if (!session?.token || session.user?.role !== "driver") {
    return null;
  }

  return session;
}

export function hasStoredDriverSession() {
  return Boolean(getStoredDriverSession());
}
