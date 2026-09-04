const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const ATTEMPT_TTL_MS = 60 * 60 * 1000;
const attempts = new Map();

function normalizeKey({ accountId, role, ipAddress }) {
  return `${role}:${String(accountId || "").trim().toLowerCase()}:${ipAddress || "unknown"}`;
}

function cleanupExpiredAttempts(now = Date.now()) {
  attempts.forEach((attempt, key) => {
    if (now - attempt.updatedAt > ATTEMPT_TTL_MS) {
      attempts.delete(key);
    }
  });
}

function getLoginAttemptState(context) {
  cleanupExpiredAttempts();
  const key = normalizeKey(context);
  const attempt = attempts.get(key);

  if (!attempt || !attempt.lockedUntil || attempt.lockedUntil <= Date.now()) {
    if (attempt?.lockedUntil) {
      attempts.delete(key);
    }

    return {
      isLocked: false,
      retryAfterSeconds: 0,
    };
  }

  return {
    isLocked: true,
    retryAfterSeconds: Math.ceil((attempt.lockedUntil - Date.now()) / 1000),
  };
}

function recordLoginFailure(context) {
  const key = normalizeKey(context);
  const previous = attempts.get(key);
  const failedCount = (previous?.failedCount || 0) + 1;
  const lockedUntil = failedCount >= MAX_FAILED_ATTEMPTS
    ? Date.now() + LOCK_DURATION_MS
    : null;

  attempts.set(key, {
    failedCount,
    lockedUntil,
    updatedAt: Date.now(),
  });

  return getLoginAttemptState(context);
}

function clearLoginFailures(context) {
  attempts.delete(normalizeKey(context));
}

module.exports = {
  clearLoginFailures,
  getLoginAttemptState,
  recordLoginFailure,
};
