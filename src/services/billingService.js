/**
 * Billing Service
 *
 * Primary Data Source: Node.js + Express REST API (PostgreSQL backend)
 * Mount Path: /api/v1/billing
 *
 * Architecture:
 * React Frontend -> billingService -> Express REST API -> PostgreSQL
 *
 * Endpoints:
 * - GET    /api/v1/billing/invoices                  - List invoices with query filters
 * - GET    /api/v1/billing/invoices/:id              - Get invoice details with items & payments
 * - POST   /api/v1/billing/invoices                  - Create a new invoice
 * - PUT    /api/v1/billing/invoices/:id              - Update invoice metadata/discount/tax
 * - POST   /api/v1/billing/invoices/:id/cancel       - Cancel an invoice (admin only)
 * - POST   /api/v1/billing/invoices/:id/items        - Add a line item to an invoice
 * - PUT    /api/v1/billing/invoices/:id/items/:itemId - Update an invoice line item
 * - DELETE /api/v1/billing/invoices/:id/items/:itemId - Remove an invoice line item
 * - GET    /api/v1/billing/invoices/:id/payments     - Get payment records for an invoice
 * - POST   /api/v1/billing/invoices/:id/payments     - Record a payment for an invoice
 *
 * Security & Financial Calculations:
 * - All requests transmit session cookie credentials (credentials: "include").
 * - Financial aggregates (subtotal, totalAmount, paidAmount, balanceAmount) and
 *   status transitions are authoritatively calculated and enforced by the backend.
 */

import { withCsrf } from "../utils/csrf";

// Determine API base URL from environment or default to same-origin /api/v1
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/+$/, "");

const BILLING_API_URL = `${API_BASE_URL}/billing`;

/**
 * Generic HTTP request helper for Billing REST API calls.
 * Ensures credentials: "include" is always transmitted and maps response
 * error structures to clean, descriptive JavaScript Errors.
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
      throw new Error(result.message);
    }

    if (response.status === 401) {
      throw new Error("Authentication required. Please log in.");
    }

    if (response.status === 403) {
      throw new Error("Access denied. You do not have permission to perform this action.");
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
// Primary Billing API Operations (REST API -> PostgreSQL)
// ============================================================================

/**
 * Fetch invoices from backend with optional query filters and pagination.
 *
 * @param {Object} [filters={}] - Query filters
 * @param {number|string} [filters.patientId] - Filter by patient ID
 * @param {string} [filters.status] - Filter by invoice status (PENDING, PARTIAL, PAID, OVERDUE, CANCELLED)
 * @param {string} [filters.invoiceNumber] - Filter by invoice number prefix
 * @param {string} [filters.startDate] - Filter by start invoice date (YYYY-MM-DD)
 * @param {string} [filters.endDate] - Filter by end invoice date (YYYY-MM-DD)
 * @param {number|string} [filters.page] - Page number (>= 1)
 * @param {number|string} [filters.limit] - Page limit (1 - 100)
 * @returns {Promise<Array>} List of invoices
 */
export async function getInvoices(filters = {}) {
  const params = new URLSearchParams();

  if (filters.patientId !== undefined && filters.patientId !== null && filters.patientId !== "") {
    params.append("patientId", filters.patientId);
  }
  if (filters.status && filters.status !== "All") {
    params.append("status", filters.status);
  }
  if (filters.invoiceNumber && filters.invoiceNumber.trim()) {
    params.append("invoiceNumber", filters.invoiceNumber.trim());
  }
  if (filters.startDate) {
    params.append("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.append("endDate", filters.endDate);
  }
  if (filters.page) {
    params.append("page", filters.page);
  }
  if (filters.limit) {
    params.append("limit", filters.limit);
  }

  const queryString = params.toString();
  const url = queryString ? `${BILLING_API_URL}/invoices?${queryString}` : `${BILLING_API_URL}/invoices`;

  const data = await apiRequest(url);
  return Array.isArray(data) ? data : (data?.data || []);
}

/**
 * Fetch full invoice details by ID (including patient, items, payments).
 *
 * @param {string|number} id - Invoice ID
 * @returns {Promise<Object>} Invoice details object
 */
export async function getInvoiceById(id) {
  if (!id) {
    throw new Error("Invoice ID is required");
  }
  return await apiRequest(`${BILLING_API_URL}/invoices/${id}`);
}

/**
 * Create a new invoice with initial line items.
 *
 * @param {Object} data - Invoice creation payload
 * @param {number} data.patientId - Required patient ID
 * @param {number} [data.appointmentId] - Optional appointment ID
 * @param {number} [data.admissionId] - Optional admission ID
 * @param {string} [data.invoiceDate] - Invoice date (YYYY-MM-DD)
 * @param {string} [data.dueDate] - Due date (YYYY-MM-DD)
 * @param {number} [data.discount] - Discount amount (>= 0)
 * @param {number} [data.tax] - Tax amount (>= 0)
 * @param {string} [data.billingNotes] - Notes/memo
 * @param {Array<Object>} data.items - Required non-empty array of line items
 * @returns {Promise<Object>} Created invoice object
 */
export async function createInvoice(data) {
  return await apiRequest(`${BILLING_API_URL}/invoices`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update invoice metadata (dates, discount, tax, notes, linked clinical entities).
 * Note: Financial totals and status cannot be updated directly; they are recalculated.
 *
 * @param {string|number} id - Invoice ID
 * @param {Object} data - Updated fields
 * @returns {Promise<Object>} Updated invoice object
 */
export async function updateInvoice(id, data) {
  if (!id) {
    throw new Error("Invoice ID is required");
  }
  return await apiRequest(`${BILLING_API_URL}/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Cancel an unpaid invoice (Admin only).
 *
 * @param {string|number} id - Invoice ID
 * @param {string} [reason=""] - Cancellation reason
 * @returns {Promise<Object>} Cancelled invoice object
 */
export async function cancelInvoice(id, reason = "") {
  if (!id) {
    throw new Error("Invoice ID is required");
  }
  return await apiRequest(`${BILLING_API_URL}/invoices/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * Add a new line item to an invoice.
 * Note: Only permitted on invoices with PENDING status.
 *
 * @param {string|number} invoiceId - Invoice ID
 * @param {Object} item - Line item payload
 * @param {string} [item.itemType="General"] - Item type category
 * @param {string} item.description - Item description (1-255 chars)
 * @param {number} item.quantity - Quantity (integer >= 1)
 * @param {number} item.unitPrice - Unit price (number >= 0)
 * @returns {Promise<Object>} Updated invoice object with recalculated totals
 */
export async function addInvoiceItem(invoiceId, item) {
  if (!invoiceId) {
    throw new Error("Invoice ID is required");
  }
  return await apiRequest(`${BILLING_API_URL}/invoices/${invoiceId}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
}

/**
 * Update an existing line item in an invoice.
 * Note: Only permitted on invoices with PENDING status.
 *
 * @param {string|number} invoiceId - Invoice ID
 * @param {string|number} itemId - Item ID
 * @param {Object} item - Updated item fields
 * @returns {Promise<Object>} Updated invoice object with recalculated totals
 */
export async function updateInvoiceItem(invoiceId, itemId, item) {
  if (!invoiceId || !itemId) {
    throw new Error("Invoice ID and Item ID are required");
  }
  return await apiRequest(`${BILLING_API_URL}/invoices/${invoiceId}/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(item),
  });
}

/**
 * Remove a line item from an invoice.
 * Note: Only permitted on invoices with PENDING status. An invoice must retain at least 1 item.
 *
 * @param {string|number} invoiceId - Invoice ID
 * @param {string|number} itemId - Item ID
 * @returns {Promise<Object>} Updated invoice object with recalculated totals
 */
export async function removeInvoiceItem(invoiceId, itemId) {
  if (!invoiceId || !itemId) {
    throw new Error("Invoice ID and Item ID are required");
  }
  return await apiRequest(`${BILLING_API_URL}/invoices/${invoiceId}/items/${itemId}`, {
    method: "DELETE",
  });
}

/**
 * Fetch all payments recorded for an invoice.
 *
 * @param {string|number} invoiceId - Invoice ID
 * @returns {Promise<Array>} List of payment records
 */
export async function getInvoicePayments(invoiceId) {
  if (!invoiceId) {
    throw new Error("Invoice ID is required");
  }
  const data = await apiRequest(`${BILLING_API_URL}/invoices/${invoiceId}/payments`);
  return Array.isArray(data) ? data : [];
}

/**
 * Record a payment against an invoice.
 *
 * @param {string|number} invoiceId - Invoice ID
 * @param {Object} paymentData - Payment data
 * @param {number} paymentData.amount - Payment amount (> 0)
 * @param {string} [paymentData.paymentMethod="Cash"] - Payment method enum
 * @param {string} [paymentData.paymentDate] - Payment date (YYYY-MM-DD)
 * @param {string} [paymentData.referenceNumber] - Optional transaction/check/ref string
 * @param {string} [paymentData.notes] - Optional payment notes
 * @returns {Promise<Object>} Result object containing { payment, invoice }
 */
export async function recordPayment(invoiceId, paymentData) {
  if (!invoiceId) {
    throw new Error("Invoice ID is required");
  }
  return await apiRequest(`${BILLING_API_URL}/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
}
