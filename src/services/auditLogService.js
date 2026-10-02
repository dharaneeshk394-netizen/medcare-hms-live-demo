import { withCsrf } from "../utils/csrf";

const API_BASE = "/api/v1/audit-logs";

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
 * List audit logs with optional filters and pagination.
 */
export async function listAuditLogs(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);
  if (params.eventType) queryParams.append("eventType", params.eventType);
  if (params.userId) queryParams.append("userId", params.userId);
  if (params.action && params.action !== "All") queryParams.append("action", params.action);
  if (params.outcome && params.outcome !== "All") queryParams.append("outcome", params.outcome);
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.offset !== undefined) queryParams.append("offset", params.offset);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  return await apiRequest(url, { method: "GET" });
}

export default {
  listAuditLogs,
};
