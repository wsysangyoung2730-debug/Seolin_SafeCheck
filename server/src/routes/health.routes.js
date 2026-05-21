const express = require("express");

const { checkDatabaseHealth } = require("../db/health");
const { successResponse } = require("../utils/apiResponse");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const database = await checkDatabaseHealth();

    res.json(
      successResponse({
        status: "ok",
        service: "seolin-safecheck-backend",
        database,
      }),
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
