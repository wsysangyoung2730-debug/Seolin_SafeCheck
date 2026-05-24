const express = require("express");
const multer = require("multer");

const { getCurrentUser } = require("../services/auth.service");
const {
  createSchedule,
  createStudent,
  createVehicle,
  deactivateSchedule,
  deactivateStudent,
  deactivateVehicle,
  exportAdminAttendanceRecords,
  getAdminAttendanceRecords,
  getAdminOverview,
  getAdminSchedules,
  getAdminStudents,
  getAdminSmsLogs,
  getAdminVehicles,
  getScheduleStudents,
  previewExcelImport,
  updateSchedule,
  updateScheduleStudents,
  updateStudent,
  updateVehicle,
} = require("../services/admin.service");
const { errorResponse, successResponse } = require("../utils/apiResponse");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

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

router.post("/students", asyncHandler(async (req, res) => {
  const result = await createStudent(req.body || {});

  if (!result.success) {
    return res.status(400).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.status(201).json(successResponse(result.data));
}));

router.patch("/students/:studentId", asyncHandler(async (req, res) => {
  const result = await updateStudent(req.params.studentId, req.body || {});

  if (!result.success) {
    const status = result.code === "STUDENT_NOT_FOUND" ? 404 : 400;

    return res.status(status).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.patch("/students/:studentId/deactivate", asyncHandler(async (req, res) => {
  const result = await deactivateStudent(req.params.studentId);

  if (!result.success) {
    const status = result.code === "STUDENT_NOT_FOUND" ? 404 : 400;

    return res.status(status).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.get("/vehicles", asyncHandler(async (req, res) => {
  const result = await getAdminVehicles();

  res.json(successResponse(result));
}));

router.post("/vehicles", asyncHandler(async (req, res) => {
  const result = await createVehicle(req.body || {});

  if (!result.success) {
    return res.status(400).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.status(201).json(successResponse(result.data));
}));

router.patch("/vehicles/:vehicleId", asyncHandler(async (req, res) => {
  const result = await updateVehicle(req.params.vehicleId, req.body || {});

  if (!result.success) {
    const status = result.code === "VEHICLE_NOT_FOUND" ? 404 : 400;

    return res.status(status).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.patch("/vehicles/:vehicleId/deactivate", asyncHandler(async (req, res) => {
  const result = await deactivateVehicle(req.params.vehicleId);

  if (!result.success) {
    const status = result.code === "VEHICLE_NOT_FOUND" ? 404 : 400;

    return res.status(status).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.get("/schedules", asyncHandler(async (req, res) => {
  const result = await getAdminSchedules({
    dayOfWeek: req.query.dayOfWeek,
    vehicleId: req.query.vehicleId,
  });

  res.json(successResponse(result));
}));

router.post("/schedules", asyncHandler(async (req, res) => {
  const result = await createSchedule(req.body || {});

  if (!result.success) {
    return res.status(400).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.status(201).json(successResponse(result.data));
}));

router.patch("/schedules/:scheduleId", asyncHandler(async (req, res) => {
  const result = await updateSchedule(req.params.scheduleId, req.body || {});

  if (!result.success) {
    const status = result.code === "SCHEDULE_NOT_FOUND" ? 404 : 400;

    return res.status(status).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.patch("/schedules/:scheduleId/deactivate", asyncHandler(async (req, res) => {
  const result = await deactivateSchedule(req.params.scheduleId);

  if (!result.success) {
    const status = result.code === "SCHEDULE_NOT_FOUND" ? 404 : 400;

    return res.status(status).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.get("/schedules/:scheduleId/students", asyncHandler(async (req, res) => {
  const result = await getScheduleStudents(req.params.scheduleId);

  if (!result.success) {
    return res.status(404).json(
      errorResponse(result.code || "SCHEDULE_NOT_FOUND", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.put("/schedules/:scheduleId/students", asyncHandler(async (req, res) => {
  const result = await updateScheduleStudents(
    req.params.scheduleId,
    req.body || {},
  );

  if (!result.success) {
    const status = result.code === "SCHEDULE_NOT_FOUND" ? 404 : 400;

    return res.status(status).json(
      errorResponse(result.code || "VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
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

router.get("/attendance-records/export", asyncHandler(async (req, res) => {
  const result = await exportAdminAttendanceRecords({
    date: req.query.date,
    vehicleId: req.query.vehicleId,
    scheduleId: req.query.scheduleId,
  });

  if (!result.success) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", result.message),
    );
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.data.filename}"`,
  );
  return res.send(result.data.buffer);
}));

router.post("/excel/import/preview", upload.single("file"), asyncHandler(async (req, res) => {
  const result = await previewExcelImport(req.file);

  if (!result.success) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", result.message),
    );
  }

  return res.json(successResponse(result.data));
}));

router.get("/sms-logs", asyncHandler(async (req, res) => {
  const result = await getAdminSmsLogs({
    date: req.query.date,
  });

  return res.json(successResponse(result));
}));

module.exports = router;
