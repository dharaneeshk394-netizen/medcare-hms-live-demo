import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { getPatients } from "../services/patientService";
import { getAppointments } from "../services/appointmentService";
import { getAdmissions } from "../services/admissionService";
import { createInvoice } from "../services/billingService";

/**
 * Standard backend-supported invoice item types.
 */
const ITEM_TYPES = [
  "Consultation",
  "Room Charge",
  "Procedure",
  "Medication",
  "Lab Test",
  "General",
  "Other",
];

function CreateInvoice() {
  const navigate = useNavigate();

  // Helper for today's date in YYYY-MM-DD
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    patientId: "",
    appointmentId: "",
    admissionId: "",
    invoiceDate: today,
    dueDate: defaultDueDate,
    discount: "0",
    tax: "0",
    billingNotes: "",
  });

  // Line items state (at least one item required)
  const [items, setItems] = useState([
    {
      itemType: "General",
      description: "",
      quantity: 1,
      unitPrice: "",
    },
  ]);

  // Dependent data lists
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [admissions, setAdmissions] = useState([]);

  // UI state
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);
  const [submitError, setSubmitError] = useState("");

  /**
   * Load patients and optional linked entities on mount.
   */
  useEffect(() => {
    let isMounted = true;

    const loadFormData = async () => {
      try {
        setLoadingData(true);
        setSubmitError("");

        const [patientsRes, appointmentsRes, admissionsRes] =
          await Promise.allSettled([
            getPatients(),
            getAppointments(),
            getAdmissions(),
          ]);

        if (isMounted) {
          if (patientsRes.status === "fulfilled") {
            const list = Array.isArray(patientsRes.value)
              ? patientsRes.value
              : patientsRes.value?.data || [];
            setPatients(list);
          } else {
            console.warn(
              "Could not load patients list:",
              patientsRes.reason?.message
            );
            setSubmitError("Failed to load patient records. Please try again.");
          }

          if (appointmentsRes.status === "fulfilled") {
            const list = Array.isArray(appointmentsRes.value)
              ? appointmentsRes.value
              : appointmentsRes.value?.data || [];
            setAppointments(list);
          }

          if (admissionsRes.status === "fulfilled") {
            const list = Array.isArray(admissionsRes.value)
              ? admissionsRes.value
              : admissionsRes.value?.data || [];
            setAdmissions(list);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Failed to load invoice form dependencies:", err.message);
          setSubmitError(err.message || "Failed to load required data.");
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    };

    loadFormData();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Filter appointments and admissions for the selected patient.
   */
  const patientAppointments = useMemo(() => {
    if (!formData.patientId) return [];
    return appointments.filter(
      (appt) =>
        Number(appt.patientId || appt.patient_id) === Number(formData.patientId)
    );
  }, [appointments, formData.patientId]);

  const patientAdmissions = useMemo(() => {
    if (!formData.patientId) return [];
    return admissions.filter(
      (adm) =>
        Number(adm.patientId || adm.patient_id) === Number(formData.patientId)
    );
  }, [admissions, formData.patientId]);

  /**
   * Handle changes to top-level form fields.
   */
  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // If patient changes, reset linked records if they no longer match
      if (name === "patientId") {
        updated.appointmentId = "";
        updated.admissionId = "";
      }

      return updated;
    });

    // Clear specific field error
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setSubmitError("");
  };

  /**
   * Handle changes to an individual line item.
   */
  const handleItemChange = (index, field, value) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });

    // Clear error for this item field
    if (itemErrors[index] && itemErrors[index][field]) {
      setItemErrors((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], [field]: "" };
        }
        return next;
      });
    }
    setSubmitError("");
  };

  /**
   * Add a new line item.
   */
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: "General",
        description: "",
        quantity: 1,
        unitPrice: "",
      },
    ]);
    setItemErrors((prev) => [...prev, {}]);
  };

  /**
   * Remove a line item at the given index.
   * Guarantees that at least one item remains.
   */
  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;

    setItems((prev) => prev.filter((_, i) => i !== index));
    setItemErrors((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Validate form inputs client-side before submission.
   */
  const validateForm = () => {
    const errors = {};
    const newItemErrors = [];
    let hasItemErrors = false;

    // 1. Patient validation
    if (!formData.patientId) {
      errors.patientId = "Please select a patient.";
    }

    // 2. Dates validation
    if (!formData.invoiceDate) {
      errors.invoiceDate = "Invoice date is required.";
    }

    if (formData.dueDate && formData.invoiceDate) {
      if (new Date(formData.dueDate) < new Date(formData.invoiceDate)) {
        errors.dueDate = "Due date cannot be earlier than invoice date.";
      }
    }

    // 3. Discount validation
    const discountVal = Number(formData.discount);
    if (Number.isNaN(discountVal) || discountVal < 0) {
      errors.discount = "Discount must be a valid non-negative number.";
    }

    // 4. Tax validation
    const taxVal = Number(formData.tax);
    if (Number.isNaN(taxVal) || taxVal < 0) {
      errors.tax = "Tax must be a valid non-negative number.";
    }

    // 5. Billing notes validation
    if (formData.billingNotes && formData.billingNotes.length > 1000) {
      errors.billingNotes = "Billing notes must not exceed 1000 characters.";
    }

    // 6. Line items validation (at least one item required)
    if (!items || items.length === 0) {
      errors.items = "At least one line item is required.";
    } else {
      items.forEach((item, index) => {
        const itemError = {};

        if (!item.description || !item.description.trim()) {
          itemError.description = "Description is required.";
        } else if (item.description.trim().length > 255) {
          itemError.description = "Description must be under 255 characters.";
        }

        const qty = parseInt(item.quantity, 10);
        if (!Number.isInteger(qty) || qty < 1) {
          itemError.quantity = "Qty must be at least 1.";
        }

        const price = Number(item.unitPrice);
        if (item.unitPrice === "" || Number.isNaN(price) || price < 0) {
          itemError.unitPrice = "Price must be >= 0.";
        }

        if (Object.keys(itemError).length > 0) {
          hasItemErrors = true;
        }
        newItemErrors[index] = itemError;
      });
    }

    setItemErrors(newItemErrors);
    setFieldErrors(errors);

    return Object.keys(errors).length === 0 && !hasItemErrors;
  };

  /**
   * Handle form submission to create invoice.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    // Construct submit payload containing only client-provided inputs
    // The backend PostgreSQL and service layer calculate subtotal, total, balance, status, etc.
    const payload = {
      patientId: Number(formData.patientId),
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || null,
      discount: Number(formData.discount) || 0,
      tax: Number(formData.tax) || 0,
      billingNotes: formData.billingNotes.trim() || null,
      items: items.map((item) => ({
        itemType: item.itemType,
        description: item.description.trim(),
        quantity: parseInt(item.quantity, 10),
        unitPrice: parseFloat(item.unitPrice) || 0,
      })),
    };

    if (formData.appointmentId) {
      payload.appointmentId = Number(formData.appointmentId);
    }
    if (formData.admissionId) {
      payload.admissionId = Number(formData.admissionId);
    }

    try {
      setIsSubmitting(true);

      const response = await createInvoice(payload);

      // Determine created invoice ID from response
      const createdId =
        response?.id || response?.data?.id || response?.invoice?.id;

      if (createdId) {
        navigate(`/billing/invoices/${createdId}`);
      } else {
        navigate("/billing");
      }
    } catch (err) {
      console.warn("Failed to create invoice:", err.message);
      setSubmitError(
        err.message || "Failed to create invoice. Please check the details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div>
        <div className="page-heading">
          <h2>Create Invoice</h2>
          <p>Generate a new patient invoice with associated services and charges.</p>
        </div>

        <section className="dashboard-section">
          <div className="empty-state">
            <p>Loading patient records and form data...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading">
        <h2>Create Invoice</h2>
        <p>Generate a new patient invoice with associated services and charges.</p>
      </div>

      {/* Main Invoice Form Section */}
      <section className="dashboard-section">
        <form onSubmit={handleSubmit} noValidate>
          {/* Top-Level Submission Error */}
          {submitError && (
            <div
              className="form-error"
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              role="alert"
            >
              <strong>Error: </strong>
              {submitError}
            </div>
          )}

          {/* SECTION 1: INVOICE INFORMATION */}
          <div className="form-section-header">
            <h3>1. Invoice Information</h3>
            <p>Select the recipient patient and invoice scheduling dates.</p>
          </div>

          <div className="form-grid">
            {/* Patient Selection (Required) */}
            <div className="form-group form-field">
              <label htmlFor="patientId" className="form-label">
                Patient <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                id="patientId"
                name="patientId"
                value={formData.patientId}
                onChange={handleFieldChange}
                required
                aria-invalid={Boolean(fieldErrors.patientId)}
                aria-describedby={
                  fieldErrors.patientId ? "patientId-error" : undefined
                }
              >
                <option value="">Select Patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.patientId || patient.patientCode || `P${patient.id}`} - {patient.name}
                  </option>
                ))}
              </select>
              {fieldErrors.patientId && (
                <p id="patientId-error" className="form-error">
                  {fieldErrors.patientId}
                </p>
              )}
            </div>

            {/* Invoice Date (Required) */}
            <div className="form-group form-field">
              <label htmlFor="invoiceDate" className="form-label">
                Invoice Date <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="invoiceDate"
                type="date"
                name="invoiceDate"
                value={formData.invoiceDate}
                onChange={handleFieldChange}
                required
                aria-invalid={Boolean(fieldErrors.invoiceDate)}
                aria-describedby={
                  fieldErrors.invoiceDate ? "invoiceDate-error" : undefined
                }
              />
              {fieldErrors.invoiceDate && (
                <p id="invoiceDate-error" className="form-error">
                  {fieldErrors.invoiceDate}
                </p>
              )}
            </div>

            {/* Due Date (Optional/Required) */}
            <div className="form-group form-field">
              <label htmlFor="dueDate" className="form-label">
                Due Date
              </label>
              <input
                id="dueDate"
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.dueDate)}
                aria-describedby={
                  fieldErrors.dueDate ? "dueDate-error" : undefined
                }
              />
              {fieldErrors.dueDate && (
                <p id="dueDate-error" className="form-error">
                  {fieldErrors.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: LINKED CLINICAL RECORDS */}
          <div className="form-section-header" style={{ marginTop: "28px" }}>
            <h3>2. Linked Records (Optional)</h3>
            <p>Optionally connect this invoice to an existing appointment or admission.</p>
          </div>

          <div className="form-grid">
            {/* Linked Appointment */}
            <div className="form-group form-field">
              <label htmlFor="appointmentId" className="form-label">
                Linked Appointment
              </label>
              <select
                id="appointmentId"
                name="appointmentId"
                value={formData.appointmentId}
                onChange={handleFieldChange}
                disabled={!formData.patientId}
              >
                <option value="">
                  {!formData.patientId
                    ? "Select a patient first"
                    : patientAppointments.length === 0
                    ? "No appointments for this patient"
                    : "None (Standalone Invoice)"}
                </option>
                {patientAppointments.map((appt) => (
                  <option key={appt.id} value={appt.id}>
                    Appt #{appt.id} - {appt.appointmentDate} (
                    {appt.doctorName || appt.reason || "Scheduled"})
                  </option>
                ))}
              </select>
            </div>

            {/* Linked Admission */}
            <div className="form-group form-field">
              <label htmlFor="admissionId" className="form-label">
                Linked Admission
              </label>
              <select
                id="admissionId"
                name="admissionId"
                value={formData.admissionId}
                onChange={handleFieldChange}
                disabled={!formData.patientId}
              >
                <option value="">
                  {!formData.patientId
                    ? "Select a patient first"
                    : patientAdmissions.length === 0
                    ? "No admissions for this patient"
                    : "None (Standalone Invoice)"}
                </option>
                {patientAdmissions.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    Adm #{adm.id} - Room {adm.roomNumber || "N/A"} (
                    {adm.admissionDate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 3: INVOICE LINE ITEMS */}
          <div className="form-section-header" style={{ marginTop: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>3. Invoice Items</h3>
                <p>Add at least one billable item, procedure, or service.</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleAddItem}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>+</span> Add Line Item
              </button>
            </div>
          </div>

          {fieldErrors.items && (
            <p className="form-error" style={{ marginBottom: "12px" }}>
              {fieldErrors.items}
            </p>
          )}

          {/* Line Items Container */}
          <div className="invoice-items-container">
            {items.map((item, index) => {
              const err = itemErrors[index] || {};

              return (
                <div key={index} className="invoice-item-card">
                  <div className="invoice-item-header">
                    <span className="invoice-item-number">Item #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="small-button danger-button"
                        onClick={() => handleRemoveItem(index)}
                        aria-label={`Remove Item ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="invoice-item-inputs">
                    {/* Item Type */}
                    <div className="form-field" style={{ minWidth: "160px" }}>
                      <label htmlFor={`itemType-${index}`}>Item Type</label>
                      <select
                        id={`itemType-${index}`}
                        value={item.itemType}
                        onChange={(e) =>
                          handleItemChange(index, "itemType", e.target.value)
                        }
                      >
                        {ITEM_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="form-field" style={{ flex: "2", minWidth: "200px" }}>
                      <label htmlFor={`description-${index}`}>
                        Description <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        id={`description-${index}`}
                        type="text"
                        value={item.description}
                        placeholder="e.g. General Physician Consultation, Blood Test"
                        maxLength={255}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        aria-invalid={Boolean(err.description)}
                      />
                      {err.description && (
                        <p className="form-error">{err.description}</p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="form-field" style={{ width: "90px" }}>
                      <label htmlFor={`quantity-${index}`}>
                        Qty <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        aria-invalid={Boolean(err.quantity)}
                      />
                      {err.quantity && (
                        <p className="form-error">{err.quantity}</p>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="form-field" style={{ width: "120px" }}>
                      <label htmlFor={`unitPrice-${index}`}>
                        Unit Price ($) <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        id={`unitPrice-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, "unitPrice", e.target.value)
                        }
                        aria-invalid={Boolean(err.unitPrice)}
                      />
                      {err.unitPrice && (
                        <p className="form-error">{err.unitPrice}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION 4: ADJUSTMENTS (DISCOUNT & TAX) */}
          <div className="form-section-header" style={{ marginTop: "28px" }}>
            <h3>4. Adjustments</h3>
            <p>
              Specify any invoice discounts or tax adjustments. Financial totals
              and balances are calculated authoritatively by the billing system.
            </p>
          </div>

          <div className="form-grid">
            {/* Discount */}
            <div className="form-group form-field">
              <label htmlFor="discount" className="form-label">
                Discount ($)
              </label>
              <input
                id="discount"
                type="number"
                name="discount"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.discount}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.discount)}
              />
              {fieldErrors.discount && (
                <p className="form-error">{fieldErrors.discount}</p>
              )}
            </div>

            {/* Tax */}
            <div className="form-group form-field">
              <label htmlFor="tax" className="form-label">
                Tax ($)
              </label>
              <input
                id="tax"
                type="number"
                name="tax"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.tax}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.tax)}
              />
              {fieldErrors.tax && (
                <p className="form-error">{fieldErrors.tax}</p>
              )}
            </div>
          </div>

          {/* SECTION 5: BILLING NOTES */}
          <div className="form-section-header" style={{ marginTop: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <h3>5. Billing Notes</h3>
                <p>Billing-specific terms, instructions, or internal memos.</p>
              </div>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                {formData.billingNotes.length}/1000 characters
              </span>
            </div>
          </div>

          <div className="form-field" style={{ marginTop: "12px" }}>
            <textarea
              id="billingNotes"
              name="billingNotes"
              rows={3}
              maxLength={1000}
              value={formData.billingNotes}
              onChange={handleFieldChange}
              placeholder="Add any billing or payment instructions (non-clinical)..."
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "7px",
                fontFamily: "inherit",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
            {fieldErrors.billingNotes && (
              <p className="form-error">{fieldErrors.billingNotes}</p>
            )}
          </div>

          {/* SECTION 6: FORM ACTIONS */}
          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Invoice..." : "Create Invoice"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/billing")}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CreateInvoice;
