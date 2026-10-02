import { withCsrf } from "../utils/csrf";

const API_BASE = "/api/v1/notifications";

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
 * 1. Get list of notifications for the authenticated user
 */
export async function getNotifications(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.isRead !== undefined && params.isRead !== null && params.isRead !== "") {
    queryParams.append("isRead", params.isRead);
  }
  if (params.type && params.type !== "All") {
    queryParams.append("type", params.type);
  }
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.offset) queryParams.append("offset", params.offset);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  const res = await apiRequest(url, { method: "GET" });
  return Array.isArray(res) ? res : [];
}

/**
 * 2. Get unread notification count
 */
export async function getUnreadCount() {
  const res = await apiRequest(`${API_BASE}/unread-count`, { method: "GET" });
  return typeof res?.unreadCount === "number" ? res.unreadCount : typeof res === "number" ? res : 0;
}

/**
 * 3. Mark single notification as read
 */
export async function markAsRead(id) {
  return await apiRequest(`${API_BASE}/${id}/read`, { method: "PUT" });
}

/**
 * 4. Mark all unread notifications as read
 */
export async function markAllAsRead() {
  return await apiRequest(`${API_BASE}/read-all`, { method: "PUT" });
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
