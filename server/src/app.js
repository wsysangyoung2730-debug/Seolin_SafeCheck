const cors = require("cors");
const express = require("express");

const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const driverRoutes = require("./routes/driver.routes");
const healthRoutes = require("./routes/health.routes");
const { errorResponse } = require("./utils/apiResponse");

function createApp() {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5500";

  app.use(
    cors({
      origin: corsOrigin,
    }),
  );
  app.use(express.json());

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/driver", driverRoutes);

  app.use((req, res) => {
    res.status(404).json(
      errorResponse("NOT_FOUND", "요청한 API 경로를 찾을 수 없습니다."),
    );
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json(
      errorResponse("INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다."),
    );
  });

  return app;
}

module.exports = createApp;
