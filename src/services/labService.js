import { withCsrf } from "../utils/csrf";

const API_BASE = "/api/v1/lab";

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
 * 1. Get list of catalog lab tests
 */
export async function getLabTests(options = {}) {
  const queryParams = new URLSearchParams();
  if (options.search) queryParams.append("search", options.search);
  if (options.category && options.category !== "All") queryParams.append("category", options.category);
  if (options.status && options.status !== "All") queryParams.append("status", options.status);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}/tests?${queryString}` : `${API_BASE}/tests`;

  const res = await apiRequest(url, { method: "GET" });
  return Array.isArray(res) ? res : [];
}

/**
 * 2. Get single lab test by ID
 */
export async function getLabTestById(id) {
  return await apiRequest(`${API_BASE}/tests/${id}`, { method: "GET" });
}

/**
 * 3. Create catalog lab test (admin only)
 */
export async function createLabTest(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Lab test data is required");
  }

  return await apiRequest(`${API_BASE}/tests`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 4. Get list of lab orders
 */
export async function getLabOrders(options = {}) {
  const queryParams = new URLSearchParams();
  if (options.search) queryParams.append("search", options.search);
  if (options.status && options.status !== "All") queryParams.append("status", options.status);
  if (options.priority && options.priority !== "All") queryParams.append("priority", options.priority);
  if (options.patientId) queryParams.append("patientId", options.patientId);
  if (options.doctorId) queryParams.append("doctorId", options.doctorId);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}/orders?${queryString}` : `${API_BASE}/orders`;

  const res = await apiRequest(url, { method: "GET" });
  return Array.isArray(res) ? res : [];
}

/**
 * 5. Get single lab order by ID with line items
 */
export async function getLabOrderById(id) {
  return await apiRequest(`${API_BASE}/orders/${id}`, { method: "GET" });
}

/**
 * 6. Create new lab order (admin, doctor)
 */
export async function createLabOrder(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Lab order data is required");
  }

  return await apiRequest(`${API_BASE}/orders`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 7. Record specimen collected
 */
export async function recordSpecimen(id) {
  return await apiRequest(`${API_BASE}/orders/${id}/sample`, { method: "PUT" });
}

/**
 * 8. Submit results for order items
 */
export async function recordResults(id, data) {
  if (!data || typeof data !== "object") {
    throw new Error("Result data is required");
  }

  return await apiRequest(`${API_BASE}/orders/${id}/results`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 9. Cancel lab order
 */
export async function cancelLabOrder(id, reason) {
  return await apiRequest(`${API_BASE}/orders/${id}/cancel`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });
}

export default {
  getLabTests,
  getLabTestById,
  createLabTest,
  getLabOrders,
  getLabOrderById,
  createLabOrder,
  recordSpecimen,
  recordResults,
  cancelLabOrder,
};
