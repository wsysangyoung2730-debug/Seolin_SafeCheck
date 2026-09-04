const SESSION_COOKIE_NAME = "seolin_session";

function parseCookies(req) {
  const cookieHeader = req.get("cookie") || "";

  return cookieHeader.split(";").reduce((cookies, item) => {
    const separatorIndex = item.indexOf("=");

    if (separatorIndex < 0) {
      return cookies;
    }

    const name = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();

    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }

    return cookies;
  }, {});
}

function getSessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE_NAME] || "";
}

function isSecureCookie() {
  if (process.env.SESSION_COOKIE_SECURE === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

function getSessionTtlMilliseconds() {
  const configuredHours = Number(process.env.SESSION_TTL_HOURS || 12);
  const hours = Number.isFinite(configuredHours) && configuredHours > 0
    ? configuredHours
    : 12;

  return hours * 60 * 60 * 1000;
}

function buildSessionCookie(token) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(getSessionTtlMilliseconds() / 1000)}`,
  ];

  if (isSecureCookie()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildExpiredSessionCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];

  if (isSecureCookie()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

module.exports = {
  buildExpiredSessionCookie,
  buildSessionCookie,
  getSessionToken,
  getSessionTtlMilliseconds,
};
