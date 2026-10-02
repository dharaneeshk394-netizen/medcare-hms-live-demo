import { withCsrf } from "../utils/csrf";

const API_BASE = "/api/v1/users";

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

  return isJson && data?.data !== undefined ? data : data;
}

/**
 * List system users with search, role, status filters, and pagination.
 */
export async function listUsers(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append("search", params.search);
  if (params.role && params.role !== "All") queryParams.append("role", params.role);
  if (params.isActive !== undefined && params.isActive !== "" && params.isActive !== "All") {
    queryParams.append("isActive", params.isActive);
  }
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.offset !== undefined) queryParams.append("offset", params.offset);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  return await apiRequest(url, { method: "GET" });
}

/**
 * Get user profile by ID.
 */
export async function getUserById(id) {
  return await apiRequest(`${API_BASE}/${id}`, { method: "GET" });
}

/**
 * Update user role. Admin only.
 */
export async function updateUserRole(id, role) {
  return await apiRequest(`${API_BASE}/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

/**
 * Update user account active status. Admin only.
 */
export async function updateUserStatus(id, isActive) {
  return await apiRequest(`${API_BASE}/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ isActive }),
  });
}

export default {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
};
