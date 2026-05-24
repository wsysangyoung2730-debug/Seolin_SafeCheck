const API_BASE_URL_STORAGE_KEY = "seolinSafeCheck.apiBaseUrl";

function getDefaultApiBaseUrl() {
  const { protocol, hostname } = window.location;

  if (
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return "http://localhost:3000";
  }

  return window.location.origin;
}

export function getApiBaseUrl() {
  const configuredUrl = window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
  const baseUrl = configuredUrl || getDefaultApiBaseUrl();

  return baseUrl.replace(/\/$/, "");
}
