/**
 * Anti-CSRF Frontend Helper Utility
 *
 * Extracts the anti-CSRF token from the client-readable 'hms_csrf' cookie
 * and automatically attaches it as an 'X-CSRF-Token' header on all
 * state-changing HTTP requests (POST, PUT, PATCH, DELETE).
 */

/**
 * Reads the 'hms_csrf' token value from document.cookie.
 * @returns {string} The anti-CSRF token or empty string if not found.
 */
export function getCsrfToken() {
  if (typeof document === "undefined" || !document.cookie) {
    return "";
  }
  const match = document.cookie.match(/(?:^|;\s*)hms_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Enriches fetch options with credentials: "include" and the X-CSRF-Token header
 * for any mutating HTTP method.
 *
 * @param {RequestInit} [options={}]
 * @returns {RequestInit}
 */
export function withCsrf(options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers = { ...(options.headers || {}) };

  if (isMutating) {
    const token = getCsrfToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  }

  return {
    ...options,
    credentials: "include",
    headers,
  };
}
