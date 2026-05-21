const express = require("express");

const { getCurrentUser } = require("../services/auth.service");
const {
  getScheduleStudents,
  getTodaySchedules,
} = require("../services/schedule.service");
const { saveAttendance } = require("../services/attendance.service");
const { errorResponse, successResponse } = require("../utils/apiResponse");

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function requireDriver(req, res, next) {
  const user = await getCurrentUser(req);

  if (!user) {
    return res.status(401).json(
      errorResponse("UNAUTHORIZED", "로그인이 필요합니다."),
    );
  }

  if (user.role !== "driver") {
    return res.status(403).json(
      errorResponse("FORBIDDEN", "접근 권한이 없습니다."),
    );
  }

  req.driverUser = user;
  return next();
}

router.use(asyncHandler(requireDriver));

router.get("/schedules/today", asyncHandler(async (req, res) => {
  const result = await getTodaySchedules(req.driverUser.id);

  res.json(successResponse(result));
}));

router.get("/schedules/:scheduleId/students", asyncHandler(async (req, res) => {
  const result = await getScheduleStudents({
    driverUserId: req.driverUser.id,
    scheduleId: req.params.scheduleId,
  });

  if (!result) {
    return res.status(404).json(
      errorResponse("SCHEDULE_NOT_FOUND", "선택한 운행 시간대를 찾을 수 없습니다."),
    );
  }

  return res.json(successResponse(result));
}));

router.post("/attendance/save", asyncHandler(async (req, res) => {
  const result = await saveAttendance({
    ...(req.body || {}),
    checkedByUserId: req.driverUser.id,
  });

  if (!result.success) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

module.exports = router;
