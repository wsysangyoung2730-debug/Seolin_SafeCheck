const express = require("express");

const {
  getCurrentUser,
  loginAdmin,
  loginDriver,
} = require("../services/auth.service");
const { errorResponse, successResponse } = require("../utils/apiResponse");

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.post("/driver/login", asyncHandler(async (req, res) => {
  const { accountId, password, pin } = req.body || {};
  const result = await loginDriver({ accountId, password, pin });

  if (!result.success) {
    return res.status(401).json(
      errorResponse("INVALID_CREDENTIALS", "계정 ID 또는 PIN이 올바르지 않습니다."),
    );
  }

  return res.json(
    successResponse({
      token: result.token,
      user: result.user,
      isMockSession: true,
    }),
  );
}));

router.post("/admin/login", asyncHandler(async (req, res) => {
  const { accountId, password, pin } = req.body || {};
  const result = await loginAdmin({ accountId, password, pin });

  if (!result.success) {
    return res.status(401).json(
      errorResponse("INVALID_CREDENTIALS", "계정 ID 또는 PIN이 올바르지 않습니다."),
    );
  }

  return res.json(
    successResponse({
      token: result.token,
      user: result.user,
      isMockSession: true,
    }),
  );
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
      isMockSession: true,
    }),
  );
}));

router.post("/logout", (req, res) => {
  res.json(
    successResponse({
      message: "로그아웃되었습니다.",
    }),
  );
});

module.exports = router;
