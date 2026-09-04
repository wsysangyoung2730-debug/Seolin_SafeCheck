import { ApiClientError, apiGet, apiPost } from "./apiClient.js";

export async function getCurrentAdminSession() {
  try {
    const data = await apiGet("/api/auth/me");

    if (data.user?.role !== "admin") {
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

export async function loginAdmin({ accountId, password }) {
  try {
    const data = await apiPost(
      "/api/auth/admin/login",
      {
        accountId,
        password,
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
          : "로그인에 실패했습니다. 계정 정보를 확인해주세요.",
    };
  }
}

export async function logoutAdmin() {
  await apiPost("/api/auth/logout", {});
}
