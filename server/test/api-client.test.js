const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

// Load the browser's ES modules without changing the backend's CommonJS setup.
const clientModule = Promise.all([
  fs.readFile(path.join(__dirname, "../../src/services/apiClient.js"), "utf8"),
  fs.readFile(path.join(__dirname, "../../src/config/apiConfig.js"), "utf8"),
]).then(([client, config]) => import(moduleUrl(
  client.replace("../config/apiConfig.js", moduleUrl(config)),
)));

function mockBrowser(t, fetch) {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  global.fetch = fetch;
  global.window = {
    location: new URL("https://safecheck.test"),
    localStorage: { getItem: () => null },
  };
  t.after(() => {
    global.fetch = originalFetch;
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  });
}

function pendingUntilAborted(signal) {
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      reject(new DOMException("The operation was aborted", "AbortError"));
    }, { once: true });
  });
}

test("정상 API 요청은 세션 쿠키와 본문을 유지한다", async (t) => {
  mockBrowser(t, async (url, options) => {
    assert.equal(url, "https://safecheck.test/api/example");
    assert.equal(options.credentials, "include");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { name: "test" });
    return new Response(JSON.stringify({ success: true, data: { saved: true } }));
  });
  const { apiPost } = await clientModule;
  assert.deepEqual(await apiPost("/api/example", { name: "test" }), { saved: true });
});

test("응답하지 않는 서버 요청을 중단하고 시간 초과를 알린다", async (t) => {
  let signal;
  mockBrowser(t, (url, options) => {
    signal = options.signal;
    return pendingUntilAborted(signal);
  });
  const { apiGet } = await clientModule;
  await assert.rejects(apiGet("/api/auth/me", { timeoutMs: 20 }), {
    name: "ApiClientError",
    code: "REQUEST_TIMEOUT",
  });
  assert.equal(signal.aborted, true);
});

test("헤더 수신 후 본문이 멈춘 경우에도 제한 시간이 적용된다", async (t) => {
  mockBrowser(t, async (url, { signal }) => ({
    status: 200,
    ok: true,
    json: () => pendingUntilAborted(signal),
  }));
  const { apiGet } = await clientModule;
  await assert.rejects(apiGet("/api/auth/me", { timeoutMs: 20 }), {
    code: "REQUEST_TIMEOUT",
  });
});

test("중계 서버의 HTML 오류도 읽을 수 있는 장애 메시지로 전달한다", async (t) => {
  mockBrowser(t, async () => new Response("<html>Gateway Timeout</html>", { status: 504 }));
  const { apiGet } = await clientModule;
  await assert.rejects(apiGet("/api/auth/me"), {
    code: "SERVER_UNAVAILABLE",
    status: 504,
  });
});

test("네트워크 연결 오류와 잘못된 계정 응답을 구분한다", async (t) => {
  mockBrowser(t, async () => { throw new TypeError("Failed to fetch"); });
  const { apiPost } = await clientModule;
  await assert.rejects(apiPost("/api/auth/admin/login", {}), { code: "NETWORK_ERROR" });

  global.fetch = async () => new Response(JSON.stringify({
    success: false,
    error: { code: "INVALID_CREDENTIALS", message: "계정 정보를 확인해주세요." },
  }), { status: 401 });
  await assert.rejects(apiPost("/api/auth/admin/login", {}), {
    code: "INVALID_CREDENTIALS",
    status: 401,
    message: "계정 정보를 확인해주세요.",
  });
});
