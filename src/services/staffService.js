/**
 * Staff Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Mount Path: /api/v1/staff
 */

import { withCsrf } from "../utils/csrf";

const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_API_BASE_URL) ||
  "/api/v1"
).replace(/\/+$/, "");

const STAFF_API_URL = `${API_BASE_URL}/staff`;

/**
 * Generic HTTP request helper for Staff REST API calls.
 */
async function apiRequest(url, options = {}) {
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
    if (result && result.message) {
      const err = new Error(result.message);
      err.status = response.status;
      err.data = result;
      throw err;
    }
    if (response.status === 401) {
      const err = new Error("Authentication required. Please log in.");
      err.status = 401;
      throw err;
    }
    if (response.status === 403) {
      const err = new Error("Access denied. You do not have permission to perform this action.");
      err.status = 403;
      throw err;
    }
    if (response.status === 404) {
      const err = new Error(`Requested resource not found at ${url}`);
      err.status = 404;
      throw err;
    }
    if (response.status === 400) {
      const err = new Error(`Invalid request submitted to ${url}`);
      err.status = 400;
      throw err;
    }
    if (response.status >= 500) {
      const err = new Error(
        `Server error (${response.status}) at ${url}: Database or internal service error`
      );
      err.status = response.status;
      throw err;
    }
    const err = new Error(
      `Request failed with status ${response.status}: ${response.statusText}`
    );
    err.status = response.status;
    throw err;
  }

  return result?.data !== undefined ? result.data : result;
}

/**
 * Strips server-controlled fields prior to sending payload.
 */
function sanitizePayload(data) {
  if (!data || typeof data !== "object") return {};
  const cleaned = { ...data };
  const serverControlledFields = [
    "id",
    "staffNumber",
    "staff_number",
    "createdBy",
    "created_by",
    "createdByName",
    "createdAt",
    "created_at",
    "updatedAt",
    "updated_at",
    "departmentName",
    "department_name",
  ];
  for (const field of serverControlledFields) {
    delete cleaned[field];
  }
  return cleaned;
}

/**
 * Fetch staff members with optional query filters and pagination.
 */
export async function getStaff(filters = {}) {
  const params = new URLSearchParams();

  if (filters.departmentId !== undefined && filters.departmentId !== null && filters.departmentId !== "") {
    params.append("departmentId", filters.departmentId);
  }
  if (filters.employmentStatus && filters.employmentStatus !== "All") {
    params.append("employmentStatus", filters.employmentStatus);
  }
  if (filters.status && filters.status !== "All") {
    params.append("status", filters.status);
  }
  if (filters.designation && filters.designation !== "All") {
    params.append("designation", filters.designation);
  }
  if (filters.search && String(filters.search).trim()) {
    params.append("search", String(filters.search).trim());
  }
  if (filters.page) {
    params.append("page", filters.page);
  }
  if (filters.limit) {
    params.append("limit", filters.limit);
  }

  const queryString = params.toString();
  const url = queryString ? `${STAFF_API_URL}?${queryString}` : STAFF_API_URL;
  return await apiRequest(url);
}

/**
 * Fetch full staff record by ID.
 */
export async function getStaffById(id) {
  if (!id) {
    throw new Error("Staff ID is required");
  }
  return await apiRequest(`${STAFF_API_URL}/${id}`);
}

/**
 * Create a new staff record.
 */
export async function createStaff(data) {
  const payload = sanitizePayload(data);
  return await apiRequest(STAFF_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update fields of an existing staff member.
 */
export async function updateStaff(id, data) {
  if (!id) {
    throw new Error("Staff ID is required");
  }
  const payload = sanitizePayload(data);
  return await apiRequest(`${STAFF_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Deactivate a staff member.
 */
export async function deactivateStaff(id) {
  if (!id) {
    throw new Error("Staff ID is required");
  }
  return await apiRequest(`${STAFF_API_URL}/${id}/deactivate`, {
    method: "PATCH",
  });
}

export default {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deactivateStaff,
};
