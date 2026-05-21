const express = require("express");

const { getCurrentUser } = require("../services/auth.service");
const {
  getAdminAttendanceRecords,
  getAdminOverview,
  getAdminSchedules,
  getAdminStudents,
  getAdminVehicles,
} = require("../services/admin.service");
const { errorResponse, successResponse } = require("../utils/apiResponse");

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function requireAdmin(req, res, next) {
  const user = await getCurrentUser(req);

  if (!user) {
    return res.status(401).json(
      errorResponse("UNAUTHORIZED", "로그인이 필요합니다."),
    );
  }

  if (user.role !== "admin") {
    return res.status(403).json(
      errorResponse("FORBIDDEN", "접근 권한이 없습니다."),
    );
  }

  req.adminUser = user;
  return next();
}

router.use(asyncHandler(requireAdmin));

router.get("/overview", asyncHandler(async (req, res) => {
  const overview = await getAdminOverview();

  res.json(successResponse(overview));
}));

router.get("/students", asyncHandler(async (req, res) => {
  const result = await getAdminStudents();

  res.json(successResponse(result));
}));

router.get("/vehicles", asyncHandler(async (req, res) => {
  const result = await getAdminVehicles();

  res.json(successResponse(result));
}));

router.get("/schedules", asyncHandler(async (req, res) => {
  const result = await getAdminSchedules();

  res.json(successResponse(result));
}));

router.get("/attendance-records", asyncHandler(async (req, res) => {
  const result = await getAdminAttendanceRecords({
    date: req.query.date,
    vehicleId: req.query.vehicleId,
    scheduleId: req.query.scheduleId,
    status: req.query.status,
  });

  if (!result.success) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

module.exports = router;
