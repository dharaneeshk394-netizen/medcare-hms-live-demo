import { withCsrf } from "../utils/csrf.js";

const API_BASE = "/api/v1/settings";

async function apiRequest(url, options = {}) {
  const config = withCsrf({
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const response = await fetch(url, config);
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (isJson && data?.message) ||
      `HTTP error! status: ${response.status} ${response.statusText}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return isJson && data?.data !== undefined ? data.data : data;
}

/**
 * Get current hospital system settings
 */
export async function getSettings() {
  return await apiRequest(API_BASE, { method: "GET" });
}

/**
 * Update hospital system settings (Admin only)
 */
export async function updateSettings(settingsData) {
  return await apiRequest(API_BASE, {
    method: "PUT",
    body: JSON.stringify(settingsData),
  });
}

export default {
  getSettings,
  updateSettings,
};
