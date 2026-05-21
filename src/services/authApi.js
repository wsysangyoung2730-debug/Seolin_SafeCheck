import { ApiClientError, apiGet, apiPost } from "./apiClient.js";
import {
  clearDriverSession,
  getStoredDriverSession,
  writeDriverSession,
} from "./driverSession.js";

export async function getCurrentDriverSession() {
  const session = getStoredDriverSession();

  if (!session) {
    return null;
  }

  try {
    const data = await apiGet("/api/auth/me");
    const nextSession = {
      ...session,
      user: data.user,
      isMockSession: data.isMockSession,
    };

    writeDriverSession(nextSession);
    return nextSession;
  } catch {
    clearDriverSession();
    return null;
  }
}

export async function loginDriver({ accountId, pin }) {
  try {
    const data = await apiPost(
      "/api/auth/driver/login",
      {
        accountId,
        pin,
      },
      {
        useAuth: false,
      },
    );
    const session = {
      token: data.token,
      user: data.user,
      isMockSession: data.isMockSession,
      issuedAt: new Date().toISOString(),
    };

    writeDriverSession(session);

    return {
      success: true,
      session,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ApiClientError
          ? error.message
          : "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

export async function logoutDriver() {
  try {
    await apiPost("/api/auth/logout", {});
  } finally {
    clearDriverSession();
  }
}
