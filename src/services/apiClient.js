import { getApiBaseUrl } from "../config/apiConfig.js";
import { getStoredDriverSession } from "./driverSession.js";

export class ApiClientError extends Error {
  constructor(message, { code = "API_ERROR", status = 0 } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function buildHeaders({ useAuth = true } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (useAuth) {
    const session = getStoredDriverSession();

    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }
  }

  return headers;
}

async function request(path, { method = "GET", body, useAuth = true } = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: buildHeaders({ useAuth }),
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError("서버 응답을 읽지 못했습니다.", {
      code: "INVALID_JSON",
      status: response.status,
    });
  }

  if (!response.ok || !payload.success) {
    throw new ApiClientError(
      payload.error?.message || "요청 처리 중 오류가 발생했습니다.",
      {
        code: payload.error?.code || "REQUEST_FAILED",
        status: response.status,
      },
    );
  }

  return payload.data;
}

export function apiGet(path, options) {
  return request(path, {
    ...options,
    method: "GET",
  });
}

export function apiPost(path, body, options) {
  return request(path, {
    ...options,
    method: "POST",
    body,
  });
}
