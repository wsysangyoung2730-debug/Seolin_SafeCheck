import { ApiClientError, apiGet, apiPost } from "./apiClient.js";
import {
  clearAdminSession,
  getStoredAdminSession,
  writeAdminSession,
} from "./adminSession.js";

export async function getCurrentAdminSession() {
  const session = getStoredAdminSession();

  if (!session) {
    return null;
  }

  try {
    const data = await apiGet("/api/auth/me", { authRole: "admin" });

    if (data.user?.role !== "admin") {
      clearAdminSession();
      return null;
    }

    const nextSession = {
      ...session,
      user: data.user,
      isMockSession: data.isMockSession,
    };

    writeAdminSession(nextSession);
    return nextSession;
  } catch {
    clearAdminSession();
    return null;
  }
}

export async function loginAdmin({ accountId, password }) {
  try {
    const data = await apiPost(
      "/api/auth/admin/login",
      {
        accountId,
        password,
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

    writeAdminSession(session);

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
          : "로그인에 실패했습니다. 계정 정보를 확인해주세요.",
    };
  }
}

export async function logoutAdmin() {
  try {
    await apiPost("/api/auth/logout", {}, { authRole: "admin" });
  } finally {
    clearAdminSession();
  }
}
