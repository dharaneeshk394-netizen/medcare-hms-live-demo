/**
 * Doctor Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Endpoint: /api/v1/doctors
 *
 * Architecture:
 * React Frontend -> doctorService -> Express REST API -> PostgreSQL
 *
 * Note: Storage fallback (localStorage) is kept strictly separated and is
 * NOT silently invoked when the real API fails, allowing the UI to display
 * accurate server/connection error states.
 */

import { DoctorStore as localDoctorFallback } from "./storage";
import { withCsrf } from "../utils/csrf";

// Determine API base URL from environment or default to same-origin /api/v1
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/+$/, "");

const DOCTORS_API_URL = `${API_BASE_URL}/doctors`;

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
 * Fetch all doctors from PostgreSQL via REST API.
 * @returns {Promise<Array>} List of doctors
 */
export async function getDoctors() {
  const data = await apiRequest(DOCTORS_API_URL);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single doctor by ID from PostgreSQL via REST API.
 * @param {string|number} id - Doctor ID
 * @returns {Promise<Object>} Doctor object
 */
export async function getDoctorById(id) {
  return await apiRequest(`${DOCTORS_API_URL}/${id}`);
}

/**
 * Create a new doctor record in PostgreSQL via REST API.
 * @param {Object} doctorData - Doctor data from the form
 * @returns {Promise<Object>} Created doctor record
 */
export async function createDoctor(doctorData) {
  const payload = {
    name: doctorData.name?.trim(),
    specialization: doctorData.specialization?.trim(),
    phone: doctorData.phone?.trim(),
    email: doctorData.email || "",
    department: doctorData.department || "",
    status: doctorData.status || "Active",
  };

  return await apiRequest(DOCTORS_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing doctor record in PostgreSQL via REST API.
 * @param {string|number} id - Doctor ID
 * @param {Object} doctorData - Updated doctor data from the form
 * @returns {Promise<Object>} Updated doctor record
 */
export async function updateDoctor(id, doctorData) {
  const payload = {
    name: doctorData.name?.trim(),
    specialization: doctorData.specialization?.trim(),
    phone: doctorData.phone?.trim(),
    email: doctorData.email || "",
    department: doctorData.department || "",
    status: doctorData.status || "Active",
  };

  return await apiRequest(`${DOCTORS_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a doctor record from PostgreSQL via REST API.
 * @param {string|number} id - Doctor ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteDoctor(id) {
  return await apiRequest(`${DOCTORS_API_URL}/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Decoupled Storage Fallback
// Kept for offline/testing reference. NOT invoked automatically on API failure.
// ============================================================================
export { localDoctorFallback };
