/**
 * Pharmacy API Service (Frontend)
 *
 * Communicates with the Node.js + Express REST API endpoints under /api/v1/pharmacy
 * utilizing cookie-based session authentication (credentials: "include").
 *
 * Endpoints:
 * - GET    /api/v1/pharmacy/medicines      - List all medicines with stock & filters
 * - GET    /api/v1/pharmacy/medicines/:id  - Get medicine details and active batches
 * - POST   /api/v1/pharmacy/medicines      - Create a new catalog medicine
 * - PUT    /api/v1/pharmacy/medicines/:id  - Update medicine details
 * - POST   /api/v1/pharmacy/batches        - Add an inventory batch
 * - POST   /api/v1/pharmacy/stock-adjust   - Adjust batch stock
 * - GET    /api/v1/pharmacy/low-stock      - List medicines below reorder level
 */

// Determine API base URL from environment or default to same-origin /api/v1
import { withCsrf } from "../utils/csrf";

const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_API_BASE_URL) ||
  "/api/v1"
).replace(/\/+$/, "");

const PHARMACY_API_URL = `${API_BASE_URL}/pharmacy`;

/**
 * Generic HTTP request helper for Pharmacy REST API calls.
 * Ensures credentials: "include" is always transmitted for session cookie authentication.
 *
 * @param {string} url - Target URL endpoint
 * @param {RequestInit} [options={}] - Standard Fetch options
 * @returns {Promise<any>} Parsed response data
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
 * 1. List all medicines from the catalog with optional filters.
 *
 * @param {Object} [options={}] - Filter options (search, category, status)
 * @returns {Promise<Array<Object>>} List of medicines with active stock & metadata
 */
export async function getMedicines(options = {}) {
  const queryParams = new URLSearchParams();

  if (options.search && typeof options.search === "string" && options.search.trim()) {
    queryParams.append("search", options.search.trim());
  }

  if (options.category && typeof options.category === "string" && options.category.trim()) {
    queryParams.append("category", options.category.trim());
  }

  if (options.status && typeof options.status === "string" && options.status.trim()) {
    queryParams.append("status", options.status.trim());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${PHARMACY_API_URL}/medicines?${queryString}`
    : `${PHARMACY_API_URL}/medicines`;

  const res = await apiRequest(url, { method: "GET" });
  return Array.isArray(res) ? res : [];
}

/**
 * 2. Get medicine details by ID including active and non-depleted batches.
 *
 * @param {string|number} id - Medicine ID
 * @returns {Promise<Object>} Medicine object with batch details
 */
export async function getMedicineById(id) {
  if (!id) {
    throw new Error("Medicine ID is required");
  }

  return await apiRequest(`${PHARMACY_API_URL}/medicines/${id}`, {
    method: "GET",
  });
}

/**
 * 3. Create a new medicine entry in the catalog.
 *
 * @param {Object} data - Medicine data (name, category, dosageForm, unitPrice, reorderLevel, etc.)
 * @returns {Promise<Object>} Created medicine object
 */
export async function createMedicine(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Medicine data is required");
  }

  return await apiRequest(`${PHARMACY_API_URL}/medicines`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 4. Update an existing catalog medicine.
 *
 * @param {string|number} id - Medicine ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated medicine object
 */
export async function updateMedicine(id, data) {
  if (!id) {
    throw new Error("Medicine ID is required");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Update data is required");
  }

  return await apiRequest(`${PHARMACY_API_URL}/medicines/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * 5. Add a new inventory batch for a medicine.
 *
 * @param {Object} data - Batch data (medicineId, batchNumber, quantity, expiryDate, purchasePrice, sellingPrice, etc.)
 * @returns {Promise<Object>} Created batch object
 */
export async function addBatch(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Batch data is required");
  }

  return await apiRequest(`${PHARMACY_API_URL}/batches`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 6. Adjust stock for a batch (increase, decrease, or set quantity).
 *
 * @param {Object} data - Adjustment data (batchId, changeQuantity or newQuantity, reason)
 * @returns {Promise<Object>} Resulting adjustment details
 */
export async function adjustStock(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Stock adjustment data is required");
  }

  return await apiRequest(`${PHARMACY_API_URL}/stock-adjust`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 7. Get medicines that are at or below their configured reorder level.
 *
 * @returns {Promise<Array<Object>>} List of low-stock medicines with deficit
 */
export async function getLowStock() {
  const res = await apiRequest(`${PHARMACY_API_URL}/low-stock`, {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

/**
 * 8. Dispense medicine to a patient.
 *
 * @param {Object} data - Dispensation details (patientId, medicineId, batchId, quantityDispensed, etc.)
 * @returns {Promise<Object>} Created dispensation record
 */
export async function dispenseMedicine(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Dispensation data is required");
  }

  return await apiRequest(`${PHARMACY_API_URL}/dispense`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 9. Get list of past medicine dispensations.
 *
 * @param {Object} [options={}] - Query options (patientId, medicineId, prescriptionId)
 * @returns {Promise<Array<Object>>} List of dispensation records
 */
export async function getDispensations(options = {}) {
  const queryParams = new URLSearchParams();

  if (options.patientId) {
    queryParams.append("patientId", options.patientId);
  }
  if (options.medicineId) {
    queryParams.append("medicineId", options.medicineId);
  }
  if (options.prescriptionId) {
    queryParams.append("prescriptionId", options.prescriptionId);
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${PHARMACY_API_URL}/dispensations?${queryString}`
    : `${PHARMACY_API_URL}/dispensations`;

  const res = await apiRequest(url, { method: "GET" });
  return Array.isArray(res) ? res : [];
}

export default {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  addBatch,
  adjustStock,
  getLowStock,
  dispenseMedicine,
  getDispensations,
};
