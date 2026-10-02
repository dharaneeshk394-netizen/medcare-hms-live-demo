import { withCsrf } from "../utils/csrf";

const API_BASE = "/api/v1/reports";

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

function buildDateQuery(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * 1. Get high-level summary KPIs
 */
export async function getSummary() {
  return await apiRequest(`${API_BASE}/summary`, { method: "GET" });
}

/**
 * 2. Get financial & billing report
 */
export async function getFinancialReport(startDate, endDate) {
  const query = buildDateQuery(startDate, endDate);
  return await apiRequest(`${API_BASE}/financial${query}`, { method: "GET" });
}

/**
 * 3. Get clinical & appointment report
 */
export async function getClinicalReport(startDate, endDate) {
  const query = buildDateQuery(startDate, endDate);
  return await apiRequest(`${API_BASE}/clinical${query}`, { method: "GET" });
}

/**
 * 4. Get pharmacy inventory & dispensation report
 */
export async function getPharmacyReport(startDate, endDate) {
  const query = buildDateQuery(startDate, endDate);
  return await apiRequest(`${API_BASE}/pharmacy${query}`, { method: "GET" });
}

/**
 * 5. Get laboratory diagnostic report
 */
export async function getLaboratoryReport(startDate, endDate) {
  const query = buildDateQuery(startDate, endDate);
  return await apiRequest(`${API_BASE}/laboratory${query}`, { method: "GET" });
}

export default {
  getSummary,
  getFinancialReport,
  getClinicalReport,
  getPharmacyReport,
  getLaboratoryReport,
};
