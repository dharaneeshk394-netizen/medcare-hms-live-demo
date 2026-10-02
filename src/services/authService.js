/**
 * Authentication Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Endpoints:
 *   - POST /api/v1/auth/login   (Creates server-side session, sets HttpOnly hms_sid cookie)
 *   - GET  /api/v1/auth/me      (Validates session cookie, returns sanitized user profile)
 *   - POST /api/v1/auth/logout  (Destroys session on server, clears hms_sid cookie)
 *
 * Security & Session Architecture:
 * - Relies strictly on the server-managed HttpOnly 'hms_sid' session cookie.
 * - All requests explicitly specify credentials: "include" to transmit the cookie.
 * - Passwords, hashes, and session tokens are NEVER stored in localStorage,
 *   sessionStorage, JavaScript cookies, or global window variables.
 */

import { withCsrf } from "../utils/csrf";

// Determine API base URL from environment or default to same-origin /api/v1
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/+$/, "");

const AUTH_API_URL = `${API_BASE_URL}/auth`;

/**
 * Generic HTTP request helper for authentication REST API calls.
 * Ensures credentials: "include" is always transmitted and maps response
 * error structures to clean, descriptive JavaScript Errors.
 *
 * @param {string} url - Target URL endpoint
 * @param {RequestInit} [options={}] - Standard Fetch options
 * @returns {Promise<any>} Parsed JSON response payload
 */
async function authApiRequest(url, options = {}) {
  let response;

  try {
    response = await fetch(
      url,
      withCsrf({
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        ...options,
      })
    );
  } catch (networkError) {
    throw new Error(
      `Network error communicating with ${url}: ${networkError.message || "Failed to fetch"}`
    );
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    // Check if the backend provided a structured error message
    if (result && result.message) {
      const err = new Error(result.message);
      err.status = response.status;
      err.data = result;
      throw err;
    }

    if (response.status === 401) {
      const err = new Error("Authentication required or session expired.");
      err.status = 401;
      throw err;
    }

    if (response.status === 403) {
      const err = new Error("Access forbidden. Insufficient permissions.");
      err.status = 403;
      throw err;
    }

    if (response.status === 404) {
      const err = new Error(`Requested authentication resource not found at ${url}`);
      err.status = 404;
      throw err;
    }

    const genericErr = new Error(`Server returned error status ${response.status}`);
    genericErr.status = response.status;
    throw genericErr;
  }

  return result;
}

export const authService = {
  /**
   * Authenticate a user with username (or email) and password.
   * On success, the server issues an HttpOnly 'hms_sid' session cookie.
   *
   * @param {Object} credentials
   * @param {string} credentials.username - Username or email address
   * @param {string} credentials.password - Account password
   * @returns {Promise<{ success: boolean, message: string, data: Object }>} Sanitized user profile
   */
  async login({ username, password }) {
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    const payload = {
      username: String(username).trim(),
      password: String(password),
    };

    const response = await authApiRequest(`${AUTH_API_URL}/login`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response;
  },

  /**
   * Retrieve the currently authenticated user's profile from the active session.
   * Transmits the HttpOnly 'hms_sid' cookie automatically.
   *
   * @returns {Promise<{ success: boolean, data: Object }>} Sanitized user profile (id, full_name, username, email, role, is_active)
   */
  async getCurrentUser() {
    const response = await authApiRequest(`${AUTH_API_URL}/me`, {
      method: "GET",
    });

    return response;
  },

  /**
   * Log out the current user session.
   * Destroys the server-side session and instructs the browser to clear the 'hms_sid' cookie.
   *
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async logout() {
    const response = await authApiRequest(`${AUTH_API_URL}/logout`, {
      method: "POST",
    });

    return response;
  },
};

export default authService;
