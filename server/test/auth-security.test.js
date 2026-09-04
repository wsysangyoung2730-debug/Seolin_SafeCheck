const assert = require("node:assert/strict");
const test = require("node:test");

const { hashCredential, verifyCredential } = require("../src/services/auth/password");
const {
  buildExpiredSessionCookie,
  buildSessionCookie,
} = require("../src/services/auth/sessionCookie");
const {
  clearLoginFailures,
  getLoginAttemptState,
  recordLoginFailure,
} = require("../src/services/auth/loginThrottle");

test("PIN은 Argon2id로 해시하고 올바른 값만 검증한다", async () => {
  const passwordHash = await hashCredential("654321");

  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(passwordHash.includes("654321"), false);
  assert.equal(await verifyCredential(passwordHash, "654321"), true);
  assert.equal(await verifyCredential(passwordHash, "123456"), false);
});

test("운영 세션 쿠키는 JavaScript 접근과 비 HTTPS 전송을 차단한다", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecureSetting = process.env.SESSION_COOKIE_SECURE;

  process.env.NODE_ENV = "production";
  delete process.env.SESSION_COOKIE_SECURE;

  try {
    const cookie = buildSessionCookie("random-session-token");
    const expiredCookie = buildExpiredSessionCookie();

    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Secure/);
    assert.match(expiredCookie, /Max-Age=0/);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;

    if (previousSecureSetting === undefined) {
      delete process.env.SESSION_COOKIE_SECURE;
    } else {
      process.env.SESSION_COOKIE_SECURE = previousSecureSetting;
    }
  }
});

test("동일 계정과 IP의 로그인 실패를 5회부터 잠근다", () => {
  const context = {
    accountId: "test_driver_security",
    role: "driver",
    ipAddress: "127.0.0.99",
  };

  clearLoginFailures(context);

  for (let index = 0; index < 4; index += 1) {
    assert.equal(recordLoginFailure(context).isLocked, false);
  }

  assert.equal(recordLoginFailure(context).isLocked, true);
  assert.equal(getLoginAttemptState(context).isLocked, true);
  clearLoginFailures(context);
});
