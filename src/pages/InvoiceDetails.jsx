import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import PrintableInvoice from "../components/PrintableInvoice";
import { useAuth } from "../context/AuthContext";
import {
  getInvoiceById,
  addInvoiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  recordPayment,
  cancelInvoice,
} from "../services/billingService";

/**
 * Allowed item types matching PostgreSQL backend domain constraint
 */
const ALLOWED_ITEM_TYPES = [
  "Consultation",
  "Room Charge",
  "Procedure",
  "Medication",
  "Lab Test",
  "General",
  "Other",
];

/**
 * Allowed payment methods matching PostgreSQL backend domain constraint
 */
const ALLOWED_PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Insurance",
  "Bank Transfer",
  "Online",
  "Other",
];

/**
 * Initial empty item form state for Add Item
 */
const INITIAL_ITEM_FORM = {
  itemType: "General",
  description: "",
  quantity: 1,
  unitPrice: "0.00",
};

/**
 * Initial form state for Record Payment
 */
const INITIAL_PAYMENT_FORM = {
  amount: "",
  paymentMethod: "Cash",
  paymentDate: new Date().toISOString().slice(0, 10),
  referenceNumber: "",
  notes: "",
};

/**
 * Currency formatter for monetary values.
 * Returns consistent $X.XX representation without modifying raw data.
 */
function formatCurrency(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) {
    return "$0.00";
  }
  return `$${num.toFixed(2)}`;
}

/**
 * Date formatter for invoice dates.
 * Displays formatted YYYY-MM-DD or readable localized date.
 */
function formatDate(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InvoiceDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  // Invoice and view state
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Feedback notifications
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Item Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Line item object when editing
  const [removingItem, setRemovingItem] = useState(null); // Line item object when confirming removal

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState(INITIAL_PAYMENT_FORM);
  const [paymentValidationErrors, setPaymentValidationErrors] = useState({});

  // Cancel Invoice Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelValidationError, setCancelValidationError] = useState("");

  // Active form data & validation for Add/Edit modals
  const [itemFormData, setItemFormData] = useState(INITIAL_ITEM_FORM);
  const [formValidationErrors, setFormValidationErrors] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  /**
   * Fetch invoice details by route ID.
   */
  const loadInvoice = useCallback(async () => {
    const numericId = Number(id);
    if (!id || Number.isNaN(numericId) || numericId <= 0) {
      setError("Invalid invoice ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getInvoiceById(id);
      setInvoice(data);
    } catch (err) {
      console.warn("Failed to load invoice details:", err.message);
      setError(
        err.message ||
          "Failed to load invoice details. Please check the ID or try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Derived RBAC & Business Rules checks for item management
  const userRole = user?.role ? String(user.role).toLowerCase() : "";
  const isAuthorizedRole = userRole === "admin" || userRole === "receptionist";
  const isPendingStatus = invoice?.status === "PENDING";
  const paymentsList = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const hasNoPayments = paymentsList.length === 0;

  /**
   * Items are editable if:
   * 1. User has admin or receptionist role
   * 2. Invoice is in PENDING status
   * 3. No payments have been recorded yet
   */
  const canManageItems = isAuthorizedRole && isPendingStatus && hasNoPayments;

  // Informative restriction notice explaining why item actions might be restricted
  const itemRestrictionNotice = useMemo(() => {
    if (!invoice) return null;
    if (!isAuthorizedRole) {
      return "Line items are view-only for your current role (Requires Admin or Receptionist).";
    }
    if (!isPendingStatus) {
      return `Line items are locked because this invoice status is ${invoice.status}. Only PENDING invoices can be modified.`;
    }
    if (!hasNoPayments) {
      return "Line items are locked because payments have already been recorded on this invoice.";
    }
    return null;
  }, [invoice, isAuthorizedRole, isPendingStatus, hasNoPayments]);

  /**
   * Payment recording permission & business rules:
   * 1. User has admin or receptionist role
   * 2. Invoice is NOT cancelled
   * 3. Invoice is NOT already paid
   * 4. Outstanding balance is greater than 0
   */
  const currentBalance = Number(invoice?.balanceAmount || 0);
  const isCancelled = invoice?.status === "CANCELLED";
  const isPaid = invoice?.status === "PAID" || currentBalance <= 0;
  const canRecordPayment = isAuthorizedRole && !isCancelled && !isPaid && currentBalance > 0;

  // Informative restriction notice explaining why payment recording is unavailable
  const paymentRestrictionNotice = useMemo(() => {
    if (!invoice) return null;
    if (!isAuthorizedRole) {
      return "Payment recording is restricted for your current role (Requires Admin or Receptionist).";
    }
    if (isCancelled) {
      return "Payments cannot be recorded because this invoice has been CANCELLED.";
    }
    if (isPaid || currentBalance <= 0) {
      return "This invoice is already fully paid. No outstanding balance remains.";
    }
    return null;
  }, [invoice, isAuthorizedRole, isCancelled, isPaid, currentBalance]);

  /**
   * Invoice cancellation permission & business rules:
   * 1. User has ADMIN role only (Backend strictly enforces requireRole("admin"))
   * 2. Invoice is NOT already cancelled
   * 3. Invoice is NOT already paid
   * 4. Zero payments recorded (Backend requires refunding/reversing payments first)
   */
  const isAdmin = userRole === "admin";
  const canCancelInvoice =
    isAdmin && !isCancelled && invoice?.status !== "PAID" && hasNoPayments;

  /**
   * Validate line item form input fields.
   * Strict adherence:
   * - description required and max 255 chars
   * - quantity positive integer (> 0)
   * - unitPrice >= 0
   * - itemType in ALLOWED_ITEM_TYPES
   */
  const validateItemFields = (fields) => {
    const errors = {};

    if (!fields.itemType || !ALLOWED_ITEM_TYPES.includes(fields.itemType)) {
      errors.itemType = `Item type must be one of: ${ALLOWED_ITEM_TYPES.join(", ")}`;
    }

    const trimmedDesc = fields.description ? String(fields.description).trim() : "";
    if (!trimmedDesc) {
      errors.description = "Item description is required";
    } else if (trimmedDesc.length > 255) {
      errors.description = "Description cannot exceed 255 characters";
    }

    const qty = Number(fields.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      errors.quantity = "Quantity must be a whole positive number (1 or more)";
    }

    if (
      fields.unitPrice === "" ||
      fields.unitPrice === null ||
      fields.unitPrice === undefined
    ) {
      errors.unitPrice = "Unit price is required";
    } else {
      const price = Number(fields.unitPrice);
      if (Number.isNaN(price) || price < 0) {
        errors.unitPrice = "Unit price must be a non-negative number ($0.00 or higher)";
      }
    }

    return errors;
  };

  /**
   * Open the Add Item modal with fresh default state
   */
  const handleOpenAddModal = () => {
    setItemFormData(INITIAL_ITEM_FORM);
    setFormValidationErrors({});
    setModalError("");
    setActionSuccess("");
    setActionError("");
    setIsAddModalOpen(true);
  };

  /**
   * Open the Edit Item modal populated with the target item's existing attributes
   */
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setItemFormData({
      itemType: item.itemType || item.item_type || "General",
      description: item.description || "",
      quantity: item.quantity || 1,
      unitPrice:
        item.unitPrice !== undefined
          ? String(item.unitPrice)
          : item.unit_price !== undefined
          ? String(item.unit_price)
          : "0.00",
    });
    setFormValidationErrors({});
    setModalError("");
    setActionSuccess("");
    setActionError("");
  };

  /**
   * Open the Remove Item confirmation modal
   */
  const handleOpenRemoveModal = (item) => {
    setRemovingItem(item);
    setModalError("");
    setActionSuccess("");
    setActionError("");
  };

  /**
   * Close any open item, payment, or cancellation modal
   */
  const handleCloseModal = useCallback(() => {
    if (modalSubmitting) return; // Prevent closing while in-flight
    setIsAddModalOpen(false);
    setEditingItem(null);
    setRemovingItem(null);
    setIsPaymentModalOpen(false);
    setIsCancelModalOpen(false);
    setFormValidationErrors({});
    setPaymentValidationErrors({});
    setCancelReason("");
    setCancelValidationError("");
    setModalError("");
  }, [modalSubmitting]);

  /**
   * Open the Cancel Invoice confirmation modal
   */
  const handleOpenCancelModal = () => {
    setCancelReason("");
    setCancelValidationError("");
    setModalError("");
    setActionSuccess("");
    setActionError("");
    setIsCancelModalOpen(true);
  };

  /**
   * Handle changes to item modal form fields
   */
  const handleFormFieldChange = (field, value) => {
    setItemFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (formValidationErrors[field]) {
      setFormValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  /**
   * Submit Add Line Item
   */
  const handleSubmitAddItem = async (e) => {
    e.preventDefault();
    if (modalSubmitting) return;

    const errors = validateItemFields(itemFormData);
    if (Object.keys(errors).length > 0) {
      setFormValidationErrors(errors);
      return;
    }

    setModalSubmitting(true);
    setModalError("");

    try {
      // Clean payload: NEVER send totalPrice, subtotal, discount, tax, totalAmount, paidAmount, balanceAmount, or status
      const payload = {
        itemType: itemFormData.itemType,
        description: itemFormData.description.trim(),
        quantity: parseInt(itemFormData.quantity, 10),
        unitPrice: Number(itemFormData.unitPrice),
      };

      const updatedInvoice = await addInvoiceItem(invoice.id, payload);

      if (updatedInvoice && updatedInvoice.id) {
        setInvoice(updatedInvoice);
      } else {
        await loadInvoice();
      }

      setIsAddModalOpen(false);
      setActionSuccess("Line item added successfully.");
    } catch (err) {
      console.warn("Failed to add line item:", err.message);
      setModalError(
        err.message || "Failed to add item. Please verify the input and try again."
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  /**
   * Submit Edit Line Item
   */
  const handleSubmitEditItem = async (e) => {
    e.preventDefault();
    if (modalSubmitting || !editingItem) return;

    const errors = validateItemFields(itemFormData);
    if (Object.keys(errors).length > 0) {
      setFormValidationErrors(errors);
      return;
    }

    setModalSubmitting(true);
    setModalError("");

    try {
      // Clean payload: NEVER send calculated totals
      const payload = {
        itemType: itemFormData.itemType,
        description: itemFormData.description.trim(),
        quantity: parseInt(itemFormData.quantity, 10),
        unitPrice: Number(itemFormData.unitPrice),
      };

      const updatedInvoice = await updateInvoiceItem(
        invoice.id,
        editingItem.id,
        payload
      );

      if (updatedInvoice && updatedInvoice.id) {
        setInvoice(updatedInvoice);
      } else {
        await loadInvoice();
      }

      setEditingItem(null);
      setActionSuccess("Line item updated successfully.");
    } catch (err) {
      console.warn("Failed to update line item:", err.message);
      setModalError(
        err.message || "Failed to update item. Please verify the input and try again."
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  /**
   * Submit Remove Line Item
   */
  const handleConfirmRemoveItem = async () => {
    if (modalSubmitting || !removingItem) return;

    // Frontend pre-check: Minimum 1 item rule
    const currentItemsCount = Array.isArray(invoice?.items) ? invoice.items.length : 0;
    if (currentItemsCount <= 1) {
      setModalError(
        "Cannot remove the only item from an invoice. An invoice must contain at least one line item."
      );
      return;
    }

    setModalSubmitting(true);
    setModalError("");

    try {
      const updatedInvoice = await removeInvoiceItem(invoice.id, removingItem.id);

      if (updatedInvoice && updatedInvoice.id) {
        setInvoice(updatedInvoice);
      } else {
        await loadInvoice();
      }

      setRemovingItem(null);
      setActionSuccess("Line item removed successfully.");
    } catch (err) {
      console.warn("Failed to remove line item:", err.message);
      setModalError(
        err.message || "Failed to remove item. Please try again."
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  /**
   * Open the Record Payment modal with fresh default state
   */
  const handleOpenPaymentModal = () => {
    setPaymentFormData({
      amount: "",
      paymentMethod: "Cash",
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNumber: "",
      notes: "",
    });
    setPaymentValidationErrors({});
    setModalError("");
    setActionSuccess("");
    setActionError("");
    setIsPaymentModalOpen(true);
  };

  /**
   * Helper to autofill the remaining balance into the amount input
   */
  const handleSetFullBalance = () => {
    if (currentBalance > 0) {
      setPaymentFormData((prev) => ({
        ...prev,
        amount: currentBalance.toFixed(2),
      }));
      setPaymentValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy.amount;
        return copy;
      });
    }
  };

  /**
   * Client-side validation for Record Payment form.
   * Matches authoritative backend rules:
   * - amount: required, positive number > 0, amount <= balance_amount
   * - paymentMethod: must be one of ALLOWED_PAYMENT_METHODS
   * - paymentDate: optional, but if provided must be YYYY-MM-DD
   * - referenceNumber: optional, max 100 characters
   * - notes: optional, max 500 characters
   */
  const validatePaymentFields = (fields) => {
    const errors = {};

    // 1. Amount validation
    const rawAmount = String(fields.amount || "").trim();
    if (!rawAmount) {
      errors.amount = "Payment amount is required";
    } else {
      const amountNum = Number(rawAmount);
      if (Number.isNaN(amountNum) || amountNum <= 0) {
        errors.amount = "Payment amount must be a positive number greater than 0";
      } else if (amountNum > currentBalance) {
        errors.amount = `Payment amount (${formatCurrency(amountNum)}) cannot exceed the remaining balance (${formatCurrency(currentBalance)})`;
      }
    }

    // 2. Payment Method validation
    if (!fields.paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(fields.paymentMethod)) {
      errors.paymentMethod = `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(", ")}`;
    }

    // 3. Payment Date validation (if provided)
    const rawDate = String(fields.paymentDate || "").trim();
    if (rawDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        errors.paymentDate = "Payment date must be in YYYY-MM-DD format";
      } else {
        const [year, month, day] = rawDate.split("-").map(Number);
        const dateObj = new Date(year, month - 1, day);
        if (
          dateObj.getFullYear() !== year ||
          dateObj.getMonth() !== month - 1 ||
          dateObj.getDate() !== day
        ) {
          errors.paymentDate = "Payment date must be a valid calendar date";
        }
      }
    }

    // 4. Reference Number validation: max 100 chars
    const rawRef = String(fields.referenceNumber || "").trim();
    if (rawRef.length > 100) {
      errors.referenceNumber = "Reference number cannot exceed 100 characters";
    }

    // 5. Notes validation: max 500 chars
    const rawNotes = String(fields.notes || "").trim();
    if (rawNotes.length > 500) {
      errors.notes = "Notes cannot exceed 500 characters";
    }

    return errors;
  };

  /**
   * Submit Record Payment to backend.
   * Frontend NEVER sends or controls:
   * - invoiceNumber, paymentNumber
   * - subtotal, totalAmount, paidAmount, balanceAmount, status
   * - receivedBy, userId, invoiceId in body
   */
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (modalSubmitting) return;

    const errors = validatePaymentFields(paymentFormData);
    setPaymentValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setModalSubmitting(true);
    setModalError("");

    const payload = {
      amount: Number(paymentFormData.amount),
      paymentMethod: paymentFormData.paymentMethod,
      paymentDate: paymentFormData.paymentDate ? paymentFormData.paymentDate.trim() : undefined,
      referenceNumber: paymentFormData.referenceNumber.trim() || null,
      notes: paymentFormData.notes.trim() || null,
    };

    try {
      const result = await recordPayment(invoice.id, payload);

      if (result && result.invoice) {
        setInvoice(result.invoice);
      }
      // Authoritatively reload the complete invoice composite to refresh relations & payments list
      await loadInvoice();

      setIsPaymentModalOpen(false);
      setActionSuccess(
        `Payment of ${formatCurrency(payload.amount)} recorded successfully.`
      );
    } catch (err) {
      console.warn("Failed to record payment:", err.message);
      setModalError(
        err.message || "Failed to record payment. Please check your inputs and try again."
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  /**
   * Submit invoice cancellation to backend.
   * Only sends trimmed reason string (max 500 chars).
   * Backend remains authoritative for status, balance zeroing, and audit logging.
   */
  const handleConfirmCancelInvoice = async (e) => {
    if (e) e.preventDefault();
    if (modalSubmitting) return;

    const trimmedReason = cancelReason.trim();
    if (trimmedReason.length > 500) {
      setCancelValidationError("Cancellation reason must not exceed 500 characters");
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError("");
      setCancelValidationError("");

      await cancelInvoice(invoice.id, trimmedReason);

      setIsCancelModalOpen(false);
      setCancelReason("");

      const invNum = invoice?.invoiceNumber || `INV-${invoice.id}`;
      setActionSuccess(`Invoice ${invNum} has been successfully cancelled.`);
      setActionError("");

      // Authoritatively reload the complete invoice composite from the backend
      await loadInvoice();
    } catch (err) {
      console.warn("Failed to cancel invoice:", err.message);
      setModalError(
        err.message || "Failed to cancel invoice. Please verify your permissions and try again."
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  /**
   * Close modals when pressing Escape key
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !modalSubmitting) {
        handleCloseModal();
      }
    };
    if (
      isAddModalOpen ||
      editingItem ||
      removingItem ||
      isPaymentModalOpen ||
      isCancelModalOpen
    ) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    isAddModalOpen,
    editingItem,
    removingItem,
    isPaymentModalOpen,
    isCancelModalOpen,
    modalSubmitting,
    handleCloseModal,
  ]);

  // Render Loading State
  if (loading) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Invoice Details</h2>
            <p>Loading invoice information...</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/billing")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Billing
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div className="empty-state">
            <p>Loading invoice...</p>
          </div>
        </section>
      </div>
    );
  }

  // Render Error / Invalid ID State
  if (error || !invoice) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Invoice Details</h2>
            <p>View patient invoice and billing breakdown.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/billing")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Billing
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div
            className="empty-state"
            style={{
              padding: "36px 20px",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>
              Unable to Load Invoice
            </h3>
            <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto 20px" }}>
              {error || "The requested invoice could not be found or retrieved."}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                className="primary-button"
                onClick={loadInvoice}
              >
                Retry
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/billing")}
              >
                Back to Billing
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Extract patient, appointment, admission details safely
  const patient = invoice.patient || {};
  const patientDisplayName =
    patient.name || invoice.patientName || "—";
  const patientDisplayCode =
    patient.patientCode ||
    patient.patientId ||
    invoice.patientCode ||
    (invoice.patientId ? `P${invoice.patientId}` : "—");
  const patientPhone =
    patient.phone || invoice.patientPhone || "—";
  const patientEmail =
    patient.email || invoice.patientEmail || "—";

  const appointment = invoice.appointment;
  const admission = invoice.admission;
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];

  return (
    <div>
      {/* Page Header */}
      <div className="page-heading-with-action page-heading">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h2>Invoice {invoice.invoiceNumber || `INV-${invoice.id}`}</h2>
            <StatusBadge status={invoice.status} />
          </div>
          <p>Detailed view of patient billing, line items, and payment history.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {canRecordPayment && (
            <button
              type="button"
              className="primary-button"
              onClick={handleOpenPaymentModal}
            >
              Record Payment
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => window.print()}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="print" size={14} /> Print Invoice
          </button>
          {canCancelInvoice && (
            <button
              type="button"
              className="secondary-button danger-button"
              onClick={handleOpenCancelModal}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              Cancel Invoice
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/billing")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Billing
            </span>
          </button>
        </div>
      </div>

      {/* Cancelled Status Alert */}
      {isCancelled && (
        <div
          className="modal-alert modal-alert-warning"
          style={{ marginBottom: "20px" }}
          role="status"
        >
          <strong>Invoice Cancelled:</strong> This invoice has been voided. Line items and payment records are permanently locked.
        </div>
      )}

      {/* Global Action Notifications */}
      {actionSuccess && (
        <div
          className="modal-alert modal-alert-success"
          style={{ marginBottom: "20px" }}
          role="status"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{actionSuccess}</span>
            <button
              type="button"
              onClick={() => setActionSuccess("")}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                fontWeight: "bold",
                cursor: "pointer",
                padding: "0 4px",
                display: "inline-flex",
                alignItems: "center",
              }}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div
          className="modal-alert modal-alert-error"
          style={{ marginBottom: "20px" }}
          role="alert"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError("")}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                fontWeight: "bold",
                cursor: "pointer",
                padding: "0 4px",
                display: "inline-flex",
                alignItems: "center",
              }}
              aria-label="Dismiss error"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: INVOICE & PATIENT OVERVIEW CARDS */}
      <div className="invoice-detail-grid">
        {/* Invoice Information Card */}
        <section className="dashboard-section invoice-info-card">
          <div className="section-header">
            <h3>Invoice Information</h3>
            <p>Metadata, issue dates, and recorded status.</p>
          </div>

          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Invoice Number</span>
              <span className="detail-value font-mono">
                {invoice.invoiceNumber || `INV-${invoice.id}`}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Invoice Date</span>
              <span className="detail-value">
                {formatDate(invoice.invoiceDate)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Due Date</span>
              <span className="detail-value">
                {formatDate(invoice.dueDate)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <StatusBadge status={invoice.status} />
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Created By</span>
              <span className="detail-value">
                {invoice.createdBy?.fullName ||
                  invoice.createdByName ||
                  "System"}
              </span>
            </div>
          </div>
        </section>

        {/* Patient Details Card */}
        <section className="dashboard-section invoice-info-card">
          <div className="section-header">
            <h3>Patient Details</h3>
            <p>Billed patient contact and identifier.</p>
          </div>

          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Patient Name</span>
              <span className="detail-value font-semibold">
                {patientDisplayName}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Patient ID</span>
              <span className="detail-value font-mono">
                {patientDisplayCode}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{patientPhone}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{patientEmail}</span>
            </div>
          </div>
        </section>

        {/* Linked Records & Notes Card */}
        <section className="dashboard-section invoice-info-card">
          <div className="section-header">
            <h3>Linked Clinical Records</h3>
            <p>Associated encounter or hospital stay.</p>
          </div>

          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Linked Appointment</span>
              <span className="detail-value">
                {appointment ? (
                  <span>
                    Appt #{appointment.id}{" "}
                    {appointment.appointmentCode ? `(${appointment.appointmentCode})` : ""}{" "}
                    — {formatDate(appointment.appointmentDate)}
                    {appointment.doctorName ? ` with ${appointment.doctorName}` : ""}
                  </span>
                ) : (
                  "Not linked"
                )}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Linked Admission</span>
              <span className="detail-value">
                {admission ? (
                  <span>
                    Adm #{admission.id}{" "}
                    {admission.admissionCode ? `(${admission.admissionCode})` : ""}{" "}
                    — Room {admission.roomNumber || "N/A"}
                    {admission.bedNumber ? `, Bed ${admission.bedNumber}` : ""}{" "}
                    ({formatDate(admission.admissionDate)})
                  </span>
                ) : (
                  "Not linked"
                )}
              </span>
            </div>

            <div className="detail-row" style={{ alignItems: "flex-start" }}>
              <span className="detail-label">Billing Notes</span>
              <span className="detail-value" style={{ wordBreak: "break-word" }}>
                {invoice.billingNotes ? invoice.billingNotes : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 2: INVOICE LINE ITEMS */}
      <section className="dashboard-section">
        <div
          className="section-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3>Invoice Items</h3>
            <p>Itemized services, consultations, lab tests, and procedures.</p>
          </div>

          {canManageItems ? (
            <button
              type="button"
              className="primary-button"
              onClick={handleOpenAddModal}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span>+</span> Add Item
            </button>
          ) : (
            itemRestrictionNotice && (
              <span className="action-badge-readonly">
                {itemRestrictionNotice}
              </span>
            )
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "50px" }}>#</th>
                <th style={{ minWidth: "140px" }}>Item Type</th>
                <th style={{ minWidth: "220px" }}>Description</th>
                <th style={{ width: "90px", textAlign: "right" }}>Quantity</th>
                <th style={{ width: "120px", textAlign: "right" }}>Unit Price</th>
                <th style={{ width: "120px", textAlign: "right" }}>Total</th>
                <th style={{ width: "140px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ color: "#6b7280" }}>{index + 1}</td>
                    <td>
                      <span className="item-type-tag">
                        {item.itemType || item.item_type || "General"}
                      </span>
                    </td>
                    <td>{item.description}</td>
                    <td style={{ textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>
                      {formatCurrency(item.unitPrice !== undefined ? item.unitPrice : item.unit_price)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600" }}>
                      {formatCurrency(item.totalPrice !== undefined ? item.totalPrice : item.total_price)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {canManageItems ? (
                        <div className="item-actions-cell">
                          <button
                            type="button"
                            className="small-button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit this line item"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="small-button danger-button"
                            onClick={() => handleOpenRemoveModal(item)}
                            title="Remove this line item"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="action-badge-readonly">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    <p>No line items found for this invoice.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION 3: FINANCIAL SUMMARY */}
        <div className="financial-summary-wrapper">
          <div className="financial-summary-card">
            <div className="financial-summary-row">
              <span>Subtotal:</span>
              <strong>{formatCurrency(invoice.subtotal)}</strong>
            </div>

            {Number(invoice.discount) > 0 && (
              <div className="financial-summary-row" style={{ color: "#16a34a" }}>
                <span>Discount:</span>
                <span>- {formatCurrency(invoice.discount)}</span>
              </div>
            )}

            {Number(invoice.tax) > 0 && (
              <div className="financial-summary-row">
                <span>Tax:</span>
                <span>+ {formatCurrency(invoice.tax)}</span>
              </div>
            )}

            <div className="financial-summary-row total-row">
              <span>Total Amount:</span>
              <span className="total-amount">
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>

            <div className="financial-summary-row" style={{ color: "#16a34a" }}>
              <span>Paid Amount:</span>
              <span>{formatCurrency(invoice.paidAmount)}</span>
            </div>

            <div
              className="financial-summary-row balance-row"
              style={{
                color: Number(invoice.balanceAmount) > 0 ? "#dc2626" : "#16a34a",
                fontWeight: "600",
              }}
            >
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balanceAmount)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: PAYMENT HISTORY */}
      <section className="dashboard-section">
        <div
          className="section-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3>Payment History</h3>
            <p>Record of transactions and payments credited toward this invoice.</p>
          </div>

          {canRecordPayment ? (
            <button
              type="button"
              className="primary-button"
              onClick={handleOpenPaymentModal}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span>+</span> Record Payment
            </button>
          ) : (
            paymentRestrictionNotice && (
              <span className="action-badge-readonly">
                {paymentRestrictionNotice}
              </span>
            )
          )}
        </div>

        {payments.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: "140px" }}>Payment #</th>
                  <th style={{ minWidth: "110px", textAlign: "right" }}>Amount</th>
                  <th style={{ minWidth: "120px" }}>Method</th>
                  <th style={{ minWidth: "120px" }}>Date</th>
                  <th style={{ minWidth: "130px" }}>Reference #</th>
                  <th style={{ minWidth: "150px" }}>Notes</th>
                  <th style={{ minWidth: "130px" }}>Received By</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => (
                  <tr key={payment.id || idx}>
                    <td className="font-mono">
                      {payment.paymentNumber || `PAY-${payment.id}`}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: "600",
                        color: "#16a34a",
                      }}
                    >
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>
                      <span className="payment-method-badge">
                        {payment.paymentMethod || "CASH"}
                      </span>
                    </td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td className="font-mono">
                      {payment.referenceNumber || "—"}
                    </td>
                    <td>{payment.notes || "—"}</td>
                    <td>{payment.receivedByName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "20px 0" }}>
            <p>No payments recorded.</p>
          </div>
        )}
      </section>

      {/* ================================================================
          MODAL 1: ADD ITEM
          ================================================================ */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
          >
            <div className="modal-header">
              <h3 id="add-item-title">Add Invoice Line Item</h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseModal}
                disabled={modalSubmitting}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAddItem} noValidate>
              <div className="modal-body">
                {modalError && (
                  <div className="modal-alert modal-alert-error" role="alert">
                    <strong>Error:</strong> {modalError}
                  </div>
                )}

                {/* Item Type */}
                <div className="form-field">
                  <label htmlFor="add-itemType">
                    Item Type <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    id="add-itemType"
                    value={itemFormData.itemType}
                    onChange={(e) => handleFormFieldChange("itemType", e.target.value)}
                    disabled={modalSubmitting}
                  >
                    {ALLOWED_ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {formValidationErrors.itemType && (
                    <p className="form-error">{formValidationErrors.itemType}</p>
                  )}
                </div>

                {/* Description */}
                <div className="form-field">
                  <label htmlFor="add-description">
                    Description <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    id="add-description"
                    type="text"
                    placeholder="e.g. General Consultation or Lab Chemistry Panel"
                    value={itemFormData.description}
                    maxLength={255}
                    onChange={(e) =>
                      handleFormFieldChange("description", e.target.value)
                    }
                    disabled={modalSubmitting}
                    autoFocus
                  />
                  {formValidationErrors.description && (
                    <p className="form-error">{formValidationErrors.description}</p>
                  )}
                  <span style={{ fontSize: "11px", color: "#6b7280", textAlign: "right" }}>
                    {itemFormData.description.length}/255 characters
                  </span>
                </div>

                {/* Quantity & Unit Price Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-field">
                    <label htmlFor="add-quantity">
                      Quantity <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      id="add-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={itemFormData.quantity}
                      onChange={(e) =>
                        handleFormFieldChange("quantity", e.target.value)
                      }
                      disabled={modalSubmitting}
                    />
                    {formValidationErrors.quantity && (
                      <p className="form-error">{formValidationErrors.quantity}</p>
                    )}
                  </div>

                  <div className="form-field">
                    <label htmlFor="add-unitPrice">
                      Unit Price ($) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      id="add-unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={itemFormData.unitPrice}
                      onChange={(e) =>
                        handleFormFieldChange("unitPrice", e.target.value)
                      }
                      disabled={modalSubmitting}
                    />
                    {formValidationErrors.unitPrice && (
                      <p className="form-error">{formValidationErrors.unitPrice}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseModal}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? "Adding..." : "Add Line Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 2: EDIT ITEM
          ================================================================ */}
      {editingItem && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-item-title"
          >
            <div className="modal-header">
              <h3 id="edit-item-title">Edit Line Item #{editingItem.id}</h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseModal}
                disabled={modalSubmitting}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEditItem} noValidate>
              <div className="modal-body">
                {modalError && (
                  <div className="modal-alert modal-alert-error" role="alert">
                    <strong>Error:</strong> {modalError}
                  </div>
                )}

                {/* Item Type */}
                <div className="form-field">
                  <label htmlFor="edit-itemType">
                    Item Type <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    id="edit-itemType"
                    value={itemFormData.itemType}
                    onChange={(e) => handleFormFieldChange("itemType", e.target.value)}
                    disabled={modalSubmitting}
                  >
                    {ALLOWED_ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {formValidationErrors.itemType && (
                    <p className="form-error">{formValidationErrors.itemType}</p>
                  )}
                </div>

                {/* Description */}
                <div className="form-field">
                  <label htmlFor="edit-description">
                    Description <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    id="edit-description"
                    type="text"
                    placeholder="Item description"
                    value={itemFormData.description}
                    maxLength={255}
                    onChange={(e) =>
                      handleFormFieldChange("description", e.target.value)
                    }
                    disabled={modalSubmitting}
                    autoFocus
                  />
                  {formValidationErrors.description && (
                    <p className="form-error">{formValidationErrors.description}</p>
                  )}
                  <span style={{ fontSize: "11px", color: "#6b7280", textAlign: "right" }}>
                    {itemFormData.description.length}/255 characters
                  </span>
                </div>

                {/* Quantity & Unit Price Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-field">
                    <label htmlFor="edit-quantity">
                      Quantity <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      id="edit-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={itemFormData.quantity}
                      onChange={(e) =>
                        handleFormFieldChange("quantity", e.target.value)
                      }
                      disabled={modalSubmitting}
                    />
                    {formValidationErrors.quantity && (
                      <p className="form-error">{formValidationErrors.quantity}</p>
                    )}
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-unitPrice">
                      Unit Price ($) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      id="edit-unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={itemFormData.unitPrice}
                      onChange={(e) =>
                        handleFormFieldChange("unitPrice", e.target.value)
                      }
                      disabled={modalSubmitting}
                    />
                    {formValidationErrors.unitPrice && (
                      <p className="form-error">{formValidationErrors.unitPrice}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseModal}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 3: REMOVE ITEM CONFIRMATION
          ================================================================ */}
      {removingItem && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-item-title"
          >
            <div className="modal-header">
              <h3 id="remove-item-title">Confirm Remove Line Item</h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseModal}
                disabled={modalSubmitting}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body">
              {modalError && (
                <div className="modal-alert modal-alert-error" role="alert">
                  <strong>Error:</strong> {modalError}
                </div>
              )}

              {items.length <= 1 ? (
                <div className="modal-alert modal-alert-warning">
                  <strong>Cannot Remove Item:</strong> An invoice must contain at least one line item. To remove this item, please add another line item first or cancel the invoice if permitted.
                </div>
              ) : (
                <p style={{ margin: 0, color: "#374151", fontSize: "14px", lineHeight: "1.6" }}>
                  Are you sure you want to remove this line item from invoice{" "}
                  <strong>{invoice.invoiceNumber || `INV-${invoice.id}`}</strong>?
                </p>
              )}

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ color: "#6b7280" }}>Item Description:</span>
                  <strong style={{ color: "#111827", textAlign: "right" }}>
                    {removingItem.description}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#6b7280" }}>Item Type:</span>
                  <span>{removingItem.itemType || removingItem.item_type || "General"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#6b7280" }}>Quantity & Price:</span>
                  <span>
                    {removingItem.quantity} × {formatCurrency(removingItem.unitPrice || removingItem.unit_price)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    paddingTop: "6px",
                    borderTop: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  <span>Line Total:</span>
                  <span>
                    {formatCurrency(removingItem.totalPrice || removingItem.total_price)}
                  </span>
                </div>
              </div>

              {items.length > 1 && (
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                  The subtotal and balance due will be authoritatively recalculated by the backend upon deletion.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseModal}
                disabled={modalSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-button-solid"
                onClick={handleConfirmRemoveItem}
                disabled={modalSubmitting || items.length <= 1}
              >
                {modalSubmitting ? "Removing..." : "Remove Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 4: RECORD PAYMENT
          ================================================================ */}
      {isPaymentModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-payment-title"
          >
            <div className="modal-header">
              <h3 id="record-payment-title">Record Payment</h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseModal}
                disabled={modalSubmitting}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} noValidate>
              <div className="modal-body">
                {modalError && (
                  <div className="modal-alert modal-alert-error" role="alert">
                    <strong>Payment Error:</strong> {modalError}
                  </div>
                )}

                {/* Contextual Invoice & Balance Summary */}
                <div className="payment-modal-summary">
                  <div className="payment-summary-col">
                    <span className="summary-label">Invoice #</span>
                    <span className="summary-value font-mono">
                      {invoice.invoiceNumber || `INV-${invoice.id}`}
                    </span>
                  </div>
                  <div className="payment-summary-col">
                    <span className="summary-label">Remaining Balance</span>
                    <span
                      className="summary-value"
                      style={{
                        fontWeight: "700",
                        color: currentBalance > 0 ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {formatCurrency(invoice.balanceAmount)}
                    </span>
                  </div>
                  <div className="payment-summary-col">
                    <span className="summary-label">Current Status</span>
                    <span className="summary-value">
                      <StatusBadge status={invoice.status} />
                    </span>
                  </div>
                </div>

                {/* Payment Amount */}
                <div className="form-field">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <label htmlFor="payment-amount" style={{ marginBottom: 0 }}>
                      Payment Amount ($) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    {currentBalance > 0 && (
                      <button
                        type="button"
                        className="balance-pill-button"
                        onClick={handleSetFullBalance}
                        disabled={modalSubmitting}
                        title="Autofill remaining balance"
                      >
                        Pay Full Balance ({formatCurrency(invoice.balanceAmount)})
                      </button>
                    )}
                  </div>
                  <input
                    id="payment-amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={currentBalance}
                    placeholder="0.00"
                    value={paymentFormData.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentFormData((prev) => ({ ...prev, amount: val }));
                      if (paymentValidationErrors.amount) {
                        setPaymentValidationErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.amount;
                          return copy;
                        });
                      }
                    }}
                    disabled={modalSubmitting}
                    required
                    autoFocus
                  />
                  {paymentValidationErrors.amount && (
                    <p className="form-error">{paymentValidationErrors.amount}</p>
                  )}
                  <span className="field-hint">
                    Maximum payable amount is the current invoice balance of{" "}
                    {formatCurrency(invoice.balanceAmount)}.
                  </span>
                </div>

                {/* Payment Method */}
                <div className="form-field">
                  <label htmlFor="payment-method">
                    Payment Method <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    id="payment-method"
                    name="paymentMethod"
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentFormData((prev) => ({ ...prev, paymentMethod: val }));
                      if (paymentValidationErrors.paymentMethod) {
                        setPaymentValidationErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.paymentMethod;
                          return copy;
                        });
                      }
                    }}
                    disabled={modalSubmitting}
                  >
                    {ALLOWED_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  {paymentValidationErrors.paymentMethod && (
                    <p className="form-error">{paymentValidationErrors.paymentMethod}</p>
                  )}
                </div>

                {/* Payment Date */}
                <div className="form-field">
                  <label htmlFor="payment-date">Payment Date</label>
                  <input
                    id="payment-date"
                    name="paymentDate"
                    type="date"
                    value={paymentFormData.paymentDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentFormData((prev) => ({ ...prev, paymentDate: val }));
                      if (paymentValidationErrors.paymentDate) {
                        setPaymentValidationErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.paymentDate;
                          return copy;
                        });
                      }
                    }}
                    disabled={modalSubmitting}
                  />
                  {paymentValidationErrors.paymentDate && (
                    <p className="form-error">{paymentValidationErrors.paymentDate}</p>
                  )}
                </div>

                {/* Reference Number */}
                <div className="form-field">
                  <label htmlFor="payment-ref">
                    Reference / Transaction # <span className="optional-text">(Optional)</span>
                  </label>
                  <input
                    id="payment-ref"
                    name="referenceNumber"
                    type="text"
                    placeholder="e.g. TXN-10928, Check #402, Auth Code"
                    maxLength={100}
                    value={paymentFormData.referenceNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentFormData((prev) => ({ ...prev, referenceNumber: val }));
                      if (paymentValidationErrors.referenceNumber) {
                        setPaymentValidationErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.referenceNumber;
                          return copy;
                        });
                      }
                    }}
                    disabled={modalSubmitting}
                  />
                  {paymentValidationErrors.referenceNumber && (
                    <p className="form-error">{paymentValidationErrors.referenceNumber}</p>
                  )}
                  <span className="field-hint">Max 100 characters.</span>
                </div>

                {/* Notes */}
                <div className="form-field">
                  <label htmlFor="payment-notes">
                    Notes <span className="optional-text">(Optional)</span>
                  </label>
                  <textarea
                    id="payment-notes"
                    name="notes"
                    rows={2}
                    placeholder="Additional payment notes or comments"
                    maxLength={500}
                    value={paymentFormData.notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentFormData((prev) => ({ ...prev, notes: val }));
                      if (paymentValidationErrors.notes) {
                        setPaymentValidationErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.notes;
                          return copy;
                        });
                      }
                    }}
                    disabled={modalSubmitting}
                  />
                  {paymentValidationErrors.notes && (
                    <p className="form-error">{paymentValidationErrors.notes}</p>
                  )}
                  <span className="field-hint">Max 500 characters.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseModal}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? "Recording Payment..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 5: CANCEL INVOICE CONFIRMATION
          ================================================================ */}
      {isCancelModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-invoice-title"
            aria-describedby="cancel-invoice-warning"
          >
            <div className="modal-header">
              <h3 id="cancel-invoice-title" style={{ color: "#b91c1c" }}>
                Cancel Invoice
              </h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseModal}
                disabled={modalSubmitting}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelInvoice} noValidate>
              <div className="modal-body">
                {modalError && (
                  <div className="modal-alert modal-alert-error" role="alert">
                    <strong>Error:</strong> {modalError}
                  </div>
                )}

                <div className="cancel-warning-banner" id="cancel-invoice-warning">
                  <strong>Warning:</strong> You are about to cancel this invoice. This will void the balance amount, prevent any future payments or line item adjustments, and permanently mark the record as CANCELLED in hospital audit logs. This cannot be treated as a normal edit and cannot be undone.
                </div>

                {/* Invoice Summary Box */}
                <div className="cancel-modal-summary">
                  <div className="cancel-summary-row">
                    <span className="cancel-summary-label">Invoice Number:</span>
                    <strong className="font-mono" style={{ color: "#111827" }}>
                      {invoice.invoiceNumber || `INV-${invoice.id}`}
                    </strong>
                  </div>

                  <div className="cancel-summary-row">
                    <span className="cancel-summary-label">Current Status:</span>
                    <span>
                      <StatusBadge status={invoice.status} />
                    </span>
                  </div>

                  <div className="cancel-summary-row">
                    <span className="cancel-summary-label">Patient:</span>
                    <span className="cancel-summary-value">
                      {patientDisplayName}
                    </span>
                  </div>

                  <div className="cancel-summary-row">
                    <span className="cancel-summary-label">Total Amount:</span>
                    <span style={{ fontWeight: "600", color: "#111827" }}>
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>

                  <div className="cancel-summary-row">
                    <span className="cancel-summary-label">Outstanding Balance:</span>
                    <span style={{ fontWeight: "600", color: "#b91c1c" }}>
                      {formatCurrency(invoice.balanceAmount)}
                    </span>
                  </div>
                </div>

                {/* Reason Textarea (Optional, max 500 chars) */}
                <div className="form-field">
                  <label htmlFor="cancel-reason">
                    Cancellation Reason <span className="optional-text">(Optional)</span>
                  </label>
                  <textarea
                    id="cancel-reason"
                    name="cancelReason"
                    rows={3}
                    placeholder="Enter reason for hospital records (e.g. entered in error, patient rescheduled, services voided)..."
                    maxLength={500}
                    value={cancelReason}
                    onChange={(e) => {
                      setCancelReason(e.target.value);
                      if (cancelValidationError) {
                        setCancelValidationError("");
                      }
                    }}
                    disabled={modalSubmitting}
                    autoFocus
                  />
                  {cancelValidationError && (
                    <p className="form-error">{cancelValidationError}</p>
                  )}
                  <span className="field-hint">
                    {cancelReason.length}/500 characters. Sourced for official hospital audit logging.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseModal}
                  disabled={modalSubmitting}
                >
                  Keep Invoice
                </button>
                <button
                  type="submit"
                  className="danger-button-solid"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden A4 Printable Invoice Document rendered during window.print() */}
      <PrintableInvoice invoice={invoice} />
    </div>
  );
}

export default InvoiceDetails;
