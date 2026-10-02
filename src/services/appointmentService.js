/**
 * Appointment Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Endpoint: /api/v1/appointments
 *
 * Architecture:
 * React Frontend -> appointmentService -> Express REST API -> PostgreSQL
 *
 * Note: Storage fallback (localStorage) is kept strictly separated and is
 * NOT silently invoked when the real API fails, allowing the UI to display
 * accurate server/connection error states.
 */

import { AppointmentStore as localAppointmentFallback } from "./storage";
import { withCsrf } from "../utils/csrf";

// Determine API base URL from environment or default to same-origin /api/v1
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/+$/, "");

const APPOINTMENTS_API_URL = `${API_BASE_URL}/appointments`;

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
 * Fetch all appointments from PostgreSQL via REST API.
 * @returns {Promise<Array>} List of appointments with joined patient and doctor details
 */
export async function getAppointments() {
  const data = await apiRequest(APPOINTMENTS_API_URL);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single appointment by ID from PostgreSQL via REST API.
 * @param {string|number} id - Appointment ID
 * @returns {Promise<Object>} Appointment object
 */
export async function getAppointmentById(id) {
  return await apiRequest(`${APPOINTMENTS_API_URL}/${id}`);
}

/**
 * Create a new appointment record in PostgreSQL via REST API.
 * @param {Object} appointmentData - Appointment data from the form
 * @returns {Promise<Object>} Created appointment record
 */
export async function createAppointment(appointmentData) {
  const payload = {
    patientId: Number(appointmentData.patientId),
    doctorId: Number(appointmentData.doctorId),
    appointmentDate: appointmentData.appointmentDate,
    appointmentTime: appointmentData.appointmentTime,
    reason: appointmentData.reason || "",
    status: appointmentData.status || "Scheduled",
  };

  return await apiRequest(APPOINTMENTS_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing appointment record in PostgreSQL via REST API.
 * @param {string|number} id - Appointment ID
 * @param {Object} appointmentData - Updated appointment data from the form
 * @returns {Promise<Object>} Updated appointment record
 */
export async function updateAppointment(id, appointmentData) {
  const payload = {
    patientId: Number(appointmentData.patientId),
    doctorId: Number(appointmentData.doctorId),
    appointmentDate: appointmentData.appointmentDate,
    appointmentTime: appointmentData.appointmentTime,
    reason: appointmentData.reason || "",
    status: appointmentData.status || "Scheduled",
  };

  return await apiRequest(`${APPOINTMENTS_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete an appointment record from PostgreSQL via REST API.
 * @param {string|number} id - Appointment ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAppointment(id) {
  return await apiRequest(`${APPOINTMENTS_API_URL}/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Decoupled Storage Fallback
// Kept for offline/testing reference. NOT invoked automatically on API failure.
// ============================================================================
export { localAppointmentFallback };
