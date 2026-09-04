import { ApiClientError, apiGet, apiPost } from "./apiClient.js";

export async function getCurrentDriverSession() {
  try {
    const data = await apiGet("/api/auth/me");

    if (data.user?.role !== "driver") {
      return null;
    }

    return {
      user: data.user,
      isMockSession: data.isMockSession,
    };
  } catch {
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
    );
    const session = {
      user: data.user,
      isMockSession: data.isMockSession,
      expiresAt: data.expiresAt,
    };

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
  await apiPost("/api/auth/logout", {});
}
