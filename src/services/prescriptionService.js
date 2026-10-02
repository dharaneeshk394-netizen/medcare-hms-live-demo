/**
 * Prescription Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Mount Path: /api/v1/prescriptions
 *
 * Architecture:
 * React Frontend -> prescriptionService -> Express REST API -> PostgreSQL
 *
 * Endpoints:
 * - GET    /api/v1/prescriptions                   - List prescriptions with query filters
 * - GET    /api/v1/prescriptions/:id               - Get prescription details with items
 * - POST   /api/v1/prescriptions                   - Create a new prescription
 * - PUT    /api/v1/prescriptions/:id               - Update prescription details
 * - POST   /api/v1/prescriptions/:id/cancel        - Cancel a prescription
 * - POST   /api/v1/prescriptions/:id/items         - Add a line item to a prescription
 * - PUT    /api/v1/prescriptions/items/:itemId     - Update a prescription line item
 * - DELETE /api/v1/prescriptions/items/:itemId     - Remove a prescription line item
 */

import { withCsrf } from "../utils/csrf.js";

// Determine API base URL from environment or default to same-origin /api/v1
const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_API_BASE_URL) ||
  "/api/v1"
).replace(/\/+$/, "");

const PRESCRIPTIONS_API_URL = `${API_BASE_URL}/prescriptions`;

/**
 * Generic HTTP request helper for Prescription REST API calls.
 * Ensures credentials: "include" is always transmitted for session cookie authentication
 * and maps response error structures to clean, descriptive JavaScript Errors.
 *
 * @param {string} url - Target URL endpoint
 * @param {RequestInit} [options={}] - Standard Fetch options
 * @returns {Promise<any>} Parsed JSON response payload
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
 * Strips server-controlled and auto-generated fields from payloads
 * prior to sending POST or PUT requests to the API.
 *
 * @param {Object} data - Input payload
 * @returns {Object} Cleaned payload without server-controlled attributes
 */
function sanitizePayload(data) {
  if (!data || typeof data !== "object") return {};
  const cleaned = { ...data };

  const serverControlledFields = [
    "id",
    "prescriptionNumber",
    "prescription_number",
    "createdBy",
    "created_by",
    "createdAt",
    "created_at",
    "updatedAt",
    "updated_at",
  ];

  for (const field of serverControlledFields) {
    delete cleaned[field];
  }

  if (Array.isArray(cleaned.items)) {
    cleaned.items = cleaned.items.map((item) => {
      if (!item || typeof item !== "object") return item;
      const cleanItem = { ...item };
      const itemServerFields = [
        "id",
        "prescriptionId",
        "prescription_id",
        "createdAt",
        "created_at",
        "updatedAt",
        "updated_at",
      ];
      for (const field of itemServerFields) {
        delete cleanItem[field];
      }
      return cleanItem;
    });
  }

  return cleaned;
}

// ============================================================================
// Primary Prescription API Operations
// ============================================================================

/**
 * Fetch prescriptions from backend with optional query filters and pagination.
 *
 * @param {Object} [filters={}] - Query filters
 * @param {number|string} [filters.patientId] - Filter by patient ID
 * @param {number|string} [filters.doctorId] - Filter by doctor ID
 * @param {number|string} [filters.appointmentId] - Filter by appointment ID
 * @param {string} [filters.status] - Filter by prescription status (ACTIVE, CANCELLED)
 * @param {string} [filters.date] - Filter by prescription date (YYYY-MM-DD)
 * @param {string} [filters.search] - Search by patient name, doctor name, medicine, or notes
 * @param {number|string} [filters.page] - Page number (>= 1)
 * @param {number|string} [filters.limit] - Page limit (1 - 100)
 * @returns {Promise<Array|Object>} List of prescriptions or prescription data
 */
export async function getPrescriptions(filters = {}) {
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
  if (filters.status && filters.status !== "All") {
    params.append("status", filters.status);
  }
  if (filters.date) {
    params.append("date", filters.date);
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
  const url = queryString ? `${PRESCRIPTIONS_API_URL}?${queryString}` : PRESCRIPTIONS_API_URL;

  return await apiRequest(url);
}

/**
 * Fetch full prescription details by ID (including items, patient, doctor, appointment).
 *
 * @param {string|number} id - Prescription ID
 * @returns {Promise<Object>} Prescription details object
 */
export async function getPrescriptionById(id) {
  if (!id) {
    throw new Error("Prescription ID is required");
  }
  return await apiRequest(`${PRESCRIPTIONS_API_URL}/${id}`);
}

/**
 * Create a new prescription with optional initial line items.
 * Strips server-controlled fields (e.g., createdBy, prescriptionNumber) before sending.
 *
 * @param {Object} data - Prescription creation payload
 * @returns {Promise<Object>} Created prescription object
 */
export async function createPrescription(data) {
  const payload = sanitizePayload(data);
  return await apiRequest(PRESCRIPTIONS_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update editable fields of an existing prescription.
 *
 * @param {string|number} id - Prescription ID
 * @param {Object} data - Updated fields
 * @returns {Promise<Object>} Updated prescription object
 */
export async function updatePrescription(id, data) {
  if (!id) {
    throw new Error("Prescription ID is required");
  }
  const payload = sanitizePayload(data);
  return await apiRequest(`${PRESCRIPTIONS_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Cancel an active prescription.
 *
 * @param {string|number} id - Prescription ID
 * @returns {Promise<Object>} Cancelled prescription object
 */
export async function cancelPrescription(id) {
  if (!id) {
    throw new Error("Prescription ID is required");
  }
  return await apiRequest(`${PRESCRIPTIONS_API_URL}/${id}/cancel`, {
    method: "POST",
  });
}

/**
 * Add a line item to an active prescription.
 *
 * @param {string|number} prescriptionId - Prescription ID
 * @param {Object} data - Item payload
 * @returns {Promise<Object>} Updated prescription object with new item
 */
export async function addPrescriptionItem(prescriptionId, data) {
  if (!prescriptionId) {
    throw new Error("Prescription ID is required");
  }
  const payload = sanitizePayload(data);
  return await apiRequest(`${PRESCRIPTIONS_API_URL}/${prescriptionId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing line item in a prescription.
 *
 * @param {string|number} itemId - Item ID
 * @param {Object} data - Updated item fields
 * @returns {Promise<Object>} Updated prescription object
 */
export async function updatePrescriptionItem(itemId, data) {
  if (!itemId) {
    throw new Error("Item ID is required");
  }
  const payload = sanitizePayload(data);
  return await apiRequest(`${PRESCRIPTIONS_API_URL}/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Remove a line item from a prescription.
 *
 * @param {string|number} itemId - Item ID
 * @returns {Promise<Object>} Updated prescription object
 */
export async function removePrescriptionItem(itemId) {
  if (!itemId) {
    throw new Error("Item ID is required");
  }
  return await apiRequest(`${PRESCRIPTIONS_API_URL}/items/${itemId}`, {
    method: "DELETE",
  });
}

export default {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  cancelPrescription,
  addPrescriptionItem,
  updatePrescriptionItem,
  removePrescriptionItem,
};
