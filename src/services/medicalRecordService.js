/**
 * Medical Record Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Mount Path: /api/v1/medical-records
 */

import { withCsrf } from "../utils/csrf";

const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_API_BASE_URL) ||
  "/api/v1"
).replace(/\/+$/, "");

const MEDICAL_RECORDS_API_URL = `${API_BASE_URL}/medical-records`;

/**
 * Generic HTTP request helper for Medical Record REST API calls.
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
    "recordNumber",
    "record_number",
    "createdBy",
    "created_by",
    "createdByName",
    "patientName",
    "patientCode",
    "doctorName",
    "doctorCode",
    "appointmentCode",
    "createdAt",
    "created_at",
    "updatedAt",
    "updated_at",
  ];

  for (const field of serverControlledFields) {
    delete cleaned[field];
  }

  return cleaned;
}

/**
 * Fetch medical records with optional query filters and pagination.
 */
export async function getMedicalRecords(filters = {}) {
  const params = new URLSearchParams();

  if (filters.patientId !== undefined && filters.patientId !== null && filters.patientId !== "") {
    params.append("patientId", filters.patientId);
  }
  if (filters.doctorId !== undefined && filters.doctorId !== null && filters.doctorId !== "") {
    params.append("doctorId", filters.doctorId);
  }
  if (filters.appointmentId !== undefined && filters.appointmentId !== null && filters.appointmentId !== "") {
    params.append("appointmentId", filters.appointmentId);
  }
  if (filters.recordType && filters.recordType !== "All") {
    params.append("recordType", filters.recordType);
  }
  if (filters.status && filters.status !== "All") {
    params.append("status", filters.status);
  }
  if (filters.date) {
    params.append("date", filters.date);
  }
  if (filters.startDate) {
    params.append("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.append("endDate", filters.endDate);
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
  const url = queryString ? `${MEDICAL_RECORDS_API_URL}?${queryString}` : MEDICAL_RECORDS_API_URL;

  return await apiRequest(url);
}

/**
 * Fetch full medical record details by ID.
 */
export async function getMedicalRecordById(id) {
  if (!id) {
    throw new Error("Medical Record ID is required");
  }
  return await apiRequest(`${MEDICAL_RECORDS_API_URL}/${id}`);
}

/**
 * Create a new medical record.
 */
export async function createMedicalRecord(data) {
  const payload = sanitizePayload(data);
  return await apiRequest(MEDICAL_RECORDS_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update editable clinical fields of an existing medical record.
 */
export async function updateMedicalRecord(id, data) {
  if (!id) {
    throw new Error("Medical Record ID is required");
  }
  const payload = sanitizePayload(data);
  return await apiRequest(`${MEDICAL_RECORDS_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export default {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
};
