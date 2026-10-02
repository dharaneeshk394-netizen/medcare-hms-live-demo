/**
 * Patient Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Endpoint: /api/v1/patients
 *
 * Architecture:
 * React Frontend -> patientService -> Express REST API -> PostgreSQL
 *
 * Note: Storage fallback (localStorage) is kept strictly separated and is
 * NOT silently invoked when the real API fails, allowing the UI to display
 * accurate server/connection error states.
 */

import { PatientStore as localPatientFallback } from "./storage";
import { withCsrf } from "../utils/csrf";

// Determine API base URL from environment or default to same-origin /api/v1
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/+$/, "");

const PATIENTS_API_URL = `${API_BASE_URL}/patients`;

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

/**
 * Maps frontend patient form data to the backend payload structure.
 * The PostgreSQL database schema expects a single `name` column,
 * whereas the frontend form captures `firstName` and `lastName`.
 *
 * @param {Object} data - Frontend patient object
 * @returns {Object} Backend-compatible payload
 */
export function mapPatientToBackend(data) {
  if (!data) return {};

  const name = (
    data.name ||
    `${data.firstName || ""} ${data.lastName || ""}`
  ).trim();

  return {
    name,
    age: Number(data.age),
    gender: data.gender,
    phone: data.phone,
    email: data.email || "",
    bloodGroup: data.bloodGroup || "",
    status: data.status || "Active",
  };
}

/**
 * Maps a backend patient record to frontend-compatible fields.
 * Safely splits `name` into `firstName` and `lastName` so that edit forms
 * and table views can read either structure without errors.
 *
 * @param {Object} patient - Backend patient record
 * @returns {Object} Frontend-compatible patient object
 */
export function mapPatientFromBackend(patient) {
  if (!patient) return null;

  const rawName = (patient.name || "").trim();
  const nameParts = rawName ? rawName.split(/\s+/) : [];
  const firstName = patient.firstName || nameParts[0] || "";
  const lastName =
    patient.lastName !== undefined
      ? patient.lastName
      : nameParts.slice(1).join(" ");

  return {
    ...patient,
    name: rawName || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
  };
}

// ============================================================================
// Primary API Operations (REST API -> PostgreSQL)
// ============================================================================

/**
 * Fetch all patients from PostgreSQL via REST API.
 * @returns {Promise<Array>} List of patients
 */
export async function getPatients() {
  const data = await apiRequest(PATIENTS_API_URL);
  return Array.isArray(data) ? data.map(mapPatientFromBackend) : [];
}

/**
 * Fetch a single patient by ID from PostgreSQL via REST API.
 * @param {string|number} id - Patient ID
 * @returns {Promise<Object>} Patient object
 */
export async function getPatientById(id) {
  const data = await apiRequest(`${PATIENTS_API_URL}/${id}`);
  return mapPatientFromBackend(data);
}

/**
 * Create a new patient record in PostgreSQL via REST API.
 * @param {Object} patientData - Patient data from the form
 * @returns {Promise<Object>} Created patient record
 */
export async function createPatient(patientData) {
  const payload = mapPatientToBackend(patientData);
  const data = await apiRequest(PATIENTS_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapPatientFromBackend(data);
}

/**
 * Update an existing patient record in PostgreSQL via REST API.
 * @param {string|number} id - Patient ID
 * @param {Object} patientData - Updated patient data from the form
 * @returns {Promise<Object>} Updated patient record
 */
export async function updatePatient(id, patientData) {
  const payload = mapPatientToBackend(patientData);
  const data = await apiRequest(`${PATIENTS_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapPatientFromBackend(data);
}

/**
 * Delete a patient record from PostgreSQL via REST API.
 * @param {string|number} id - Patient ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deletePatient(id) {
  return await apiRequest(`${PATIENTS_API_URL}/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Decoupled Storage Fallback
// Kept for offline/testing reference. NOT invoked automatically on API failure.
// ============================================================================
export { localPatientFallback };
