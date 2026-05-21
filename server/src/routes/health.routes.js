const express = require("express");

const { successResponse } = require("../utils/apiResponse");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(
    successResponse({
      status: "ok",
      service: "seolin-safecheck-backend",
    }),
  );
});

module.exports = router;
