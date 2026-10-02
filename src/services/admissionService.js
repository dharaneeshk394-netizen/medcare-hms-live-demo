/**
 * Admission Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Endpoint: /api/v1/admissions
 *
 * Architecture:
 * React Frontend -> admissionService -> Express REST API -> PostgreSQL
 */

import { withCsrf } from "../utils/csrf";

// Determine API base URL from environment or default to same-origin /api/v1
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/+$/, "");

const ADMISSIONS_API_URL = `${API_BASE_URL}/admissions`;

/**
 * Generic HTTP request helper for REST API calls.
 * Throws clear, actionable errors when the server is unreachable or responds with an error status.
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
      throw new Error(result.message);
    }

    if (response.status === 404) {
      throw new Error(`Requested resource not found at ${url}`);
    }

    if (response.status === 400) {
      throw new Error(`Invalid request submitted to ${url}`);
    }

    if (response.status >= 500) {
      throw new Error(
        `Server error (${response.status}) at ${url}: Database or internal service error`
      );
    }

    throw new Error(
      `Request failed with status ${response.status}: ${response.statusText}`
    );
  }

  return result?.data !== undefined ? result.data : result;
}

// ============================================================================
// Primary API Operations (REST API -> PostgreSQL)
// ============================================================================

/**
 * Fetch all admissions from PostgreSQL via REST API.
 * @returns {Promise<Array>} List of admissions
 */
export async function getAdmissions() {
  const data = await apiRequest(ADMISSIONS_API_URL);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single admission by ID from PostgreSQL via REST API.
 * @param {string|number} id - Admission ID
 * @returns {Promise<Object>} Admission object
 */
export async function getAdmissionById(id) {
  return await apiRequest(`${ADMISSIONS_API_URL}/${id}`);
}

/**
 * Create a new admission record in PostgreSQL via REST API.
 * @param {Object} admissionData - Admission data
 * @returns {Promise<Object>} Created admission record
 */
export async function createAdmission(admissionData) {
  const payload = {
    patientId: Number(admissionData.patientId),
    doctorId: Number(admissionData.doctorId),
    roomNumber: admissionData.roomNumber?.trim(),
    bedNumber: admissionData.bedNumber?.trim(),
    admissionDate: admissionData.admissionDate,
    expectedDischargeDate: admissionData.expectedDischargeDate || null,
    actualDischargeDate: admissionData.actualDischargeDate || null,
    diagnosis: admissionData.diagnosis?.trim() || "",
    status: admissionData.status || "Admitted",
  };

  return await apiRequest(ADMISSIONS_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing admission record in PostgreSQL via REST API.
 * @param {string|number} id - Admission ID
 * @param {Object} admissionData - Updated admission data
 * @returns {Promise<Object>} Updated admission record
 */
export async function updateAdmission(id, admissionData) {
  const payload = {
    patientId: Number(admissionData.patientId),
    doctorId: Number(admissionData.doctorId),
    roomNumber: admissionData.roomNumber?.trim(),
    bedNumber: admissionData.bedNumber?.trim(),
    admissionDate: admissionData.admissionDate,
    expectedDischargeDate: admissionData.expectedDischargeDate || null,
    actualDischargeDate: admissionData.actualDischargeDate || null,
    diagnosis: admissionData.diagnosis?.trim() || "",
    status: admissionData.status || "Admitted",
  };

  return await apiRequest(`${ADMISSIONS_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete an admission record from PostgreSQL via REST API.
 * @param {string|number} id - Admission ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAdmission(id) {
  return await apiRequest(`${ADMISSIONS_API_URL}/${id}`, {
    method: "DELETE",
  });
}
