const DEFAULT_API_BASE_URL = "http://localhost:3000";
const API_BASE_URL_STORAGE_KEY = "seolinSafeCheck.apiBaseUrl";

export function getApiBaseUrl() {
  const configuredUrl = window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
  const baseUrl = configuredUrl || DEFAULT_API_BASE_URL;

  return baseUrl.replace(/\/$/, "");
}
