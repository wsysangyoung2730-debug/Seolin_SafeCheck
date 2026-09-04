const express = require("express");

const {
  getCurrentUser,
  loginAdmin,
  loginDriver,
  logout,
} = require("../services/auth.service");
const {
  clearLoginFailures,
  getLoginAttemptState,
  recordLoginFailure,
} = require("../services/auth/loginThrottle");
const {
  buildExpiredSessionCookie,
  buildSessionCookie,
} = require("../services/auth/sessionCookie");
const { errorResponse, successResponse } = require("../utils/apiResponse");

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function handleLogin({ req, res, role, login }) {
  const { accountId, password, pin } = req.body || {};
  const throttleContext = {
    accountId,
    role,
    ipAddress: req.ip,
  };
  const attemptState = getLoginAttemptState(throttleContext);

  if (attemptState.isLocked) {
    res.set("Retry-After", String(attemptState.retryAfterSeconds));
    return res.status(429).json(
      errorResponse(
        "LOGIN_TEMPORARILY_LOCKED",
        "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
      ),
    );
  }

  const result = await login({ accountId, password, pin });

  if (!result.success) {
    const failedState = recordLoginFailure(throttleContext);

    if (failedState.isLocked) {
      res.set("Retry-After", String(failedState.retryAfterSeconds));
      return res.status(429).json(
        errorResponse(
          "LOGIN_TEMPORARILY_LOCKED",
          "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
        ),
      );
    }

    return res.status(401).json(
      errorResponse("INVALID_CREDENTIALS", "계정 ID 또는 PIN이 올바르지 않습니다."),
    );
  }

  clearLoginFailures(throttleContext);
  res.set("Set-Cookie", buildSessionCookie(result.session.token));
  return res.json(
    successResponse({
      user: result.user,
      expiresAt: result.session.expiresAt.toISOString(),
      isMockSession: false,
    }),
  );
}

router.post("/driver/login", asyncHandler(async (req, res) => {
  return handleLogin({ req, res, role: "driver", login: loginDriver });
}));

router.post("/admin/login", asyncHandler(async (req, res) => {
  return handleLogin({ req, res, role: "admin", login: loginAdmin });
}));

router.get("/me", asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req);

  if (!user) {
    return res.status(401).json(
      errorResponse("UNAUTHORIZED", "로그인이 필요합니다."),
    );
  }

  return res.json(
    successResponse({
      user,
      isMockSession: false,
    }),
  );
}));

router.post("/logout", asyncHandler(async (req, res) => {
  await logout(req);
  res.set("Set-Cookie", buildExpiredSessionCookie());
  res.json(
    successResponse({
      message: "로그아웃되었습니다.",
    }),
  );
}));

module.exports = router;
