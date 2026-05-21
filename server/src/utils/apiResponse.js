function successResponse(data = {}) {
  return {
    success: true,
    data,
  };
}

function errorResponse(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}

module.exports = {
  errorResponse,
  successResponse,
};
