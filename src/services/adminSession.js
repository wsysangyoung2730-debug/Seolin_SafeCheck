const SESSION_STORAGE_KEY = "seolinSafeCheck.adminApiSession.v1";

function readSession() {
  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function writeAdminSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getStoredAdminSession() {
  const session = readSession();

  if (!session?.token || session.user?.role !== "admin") {
    return null;
  }

  return session;
}

export function hasStoredAdminSession() {
  return Boolean(getStoredAdminSession());
}
