import { getApiBaseUrl } from "../config/apiConfig.js";

export class ApiClientError extends Error {
  constructor(message, { code = "API_ERROR", status = 0 } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function buildHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

async function request(
  path,
  { method = "GET", body, timeoutMs = 15_000 } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    if ([502, 503, 504].includes(response.status)) {
      throw new ApiClientError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", {
        code: "SERVER_UNAVAILABLE",
        status: response.status,
      });
    }

    let payload;

    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted || error.name === "AbortError") {
        throw error;
      }

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
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiClientError(
        "서버 응답이 지연되고 있습니다. 잠시 후 다시 확인해주세요.",
        { code: "REQUEST_TIMEOUT" },
      );
    }

    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError("서버에 연결할 수 없습니다. 인터넷 연결과 서버 상태를 확인해주세요.", {
      code: "NETWORK_ERROR",
    });
  } finally {
    clearTimeout(timeout);
  }
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

export function apiPatch(path, body, options) {
  return request(path, {
    ...options,
    method: "PATCH",
    body,
  });
}

export function apiPut(path, body, options) {
  return request(path, {
    ...options,
    method: "PUT",
    body,
  });
}

export function apiDelete(path, options) {
  return request(path, {
    ...options,
    method: "DELETE",
  });
}
