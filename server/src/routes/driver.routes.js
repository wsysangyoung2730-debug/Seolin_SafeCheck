const express = require("express");

const { getCurrentMockDriver } = require("../services/auth.service");
const {
  getMockScheduleStudents,
  getTodayMockSchedules,
} = require("../services/schedule.service");
const { saveMockAttendance } = require("../services/attendance.service");
const { errorResponse, successResponse } = require("../utils/apiResponse");

const router = express.Router();

function requireMockDriver(req, res, next) {
  const user = getCurrentMockDriver(req);

  if (!user) {
    return res.status(401).json(
      errorResponse("UNAUTHORIZED", "로그인이 필요합니다."),
    );
  }

  req.driverUser = user;
  return next();
}

router.get("/schedules/today", requireMockDriver, (req, res) => {
  const result = getTodayMockSchedules(req.driverUser.id);

  res.json(successResponse(result));
});

router.get("/schedules/:scheduleId/students", requireMockDriver, (req, res) => {
  const result = getMockScheduleStudents({
    driverUserId: req.driverUser.id,
    scheduleId: req.params.scheduleId,
  });

  if (!result) {
    return res.status(404).json(
      errorResponse("SCHEDULE_NOT_FOUND", "선택한 운행 시간대를 찾을 수 없습니다."),
    );
  }

  return res.json(successResponse(result));
});

router.post("/attendance/save", requireMockDriver, (req, res) => {
  const result = saveMockAttendance(req.body || {});

  if (!result.success) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
});

module.exports = router;
