import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import {
  getPrescriptionById,
  updatePrescription,
  addPrescriptionItem,
  updatePrescriptionItem,
  removePrescriptionItem,
} from "../services/prescriptionService";

/**
 * Format date for HTML <input type="date"> (YYYY-MM-DD)
 */
function formatDateForInput(dateString) {
  if (!dateString) return "";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * EditPrescription Component
 *
 * Allows authorized users (Admin, Doctor) to update an existing patient prescription.
 * Loads composite prescription details, enforces backend status lifecycle rules,
 * permits updates to prescription date, clinical notes, status, and line items.
 */
function EditPrescription() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    prescriptionDate: "",
    diagnosisNotes: "",
    status: "ACTIVE",
  });

  // Track line items and original item IDs for diff tracking on submit
  const [items, setItems] = useState([]);
  const [originalItemIds, setOriginalItemIds] = useState([]);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);

  /**
   * Load existing prescription data by ID from backend.
   */
  const loadPrescriptionData = useCallback(async () => {
    const numericId = Number(id);
    if (!id || Number.isNaN(numericId) || numericId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError("");
      setNotFound(false);

      const data = await getPrescriptionById(id);
      if (!data) {
        setNotFound(true);
        setPrescription(null);
        return;
      }

      setPrescription(data);

      setFormData({
        prescriptionDate: formatDateForInput(
          data.prescriptionDate || data.prescription_date
        ),
        diagnosisNotes: data.diagnosisNotes || data.diagnosis_notes || "",
        status: data.status || "ACTIVE",
      });

      const loadedItems = Array.isArray(data.items) ? data.items : [];
      const normalizedItems = loadedItems.map((item) => ({
        id: item.id || null,
        medicineName: item.medicineName || item.medicine_name || "",
        dosage: item.dosage || "",
        frequency: item.frequency || "",
        duration: item.duration || "",
        quantity:
          item.quantity !== undefined && item.quantity !== null
            ? String(item.quantity)
            : "1",
        instructions: item.instructions || "",
      }));

      setItems(normalizedItems);
      setOriginalItemIds(
        loadedItems.filter((i) => Boolean(i.id)).map((i) => i.id)
      );
      setItemErrors(normalizedItems.map(() => ({})));
    } catch (err) {
      console.warn("Error loading prescription for edit:", err.message);
      if (err.status === 404 || err.message?.includes("not found")) {
        setNotFound(true);
        setFetchError("");
      } else {
        setFetchError(
          err.message || "Failed to load prescription. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPrescriptionData();
  }, [loadPrescriptionData]);

  /**
   * Handle changes to primary form input fields.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  /**
   * Add a new medication line item row.
   */
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: null,
        medicineName: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "1",
        instructions: "",
      },
    ]);
    setItemErrors((prev) => [...prev, {}]);
  };

  /**
   * Remove a medication line item row.
   */
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setItemErrors((prev) => prev.filter((_, idx) => idx !== index));
  };

  /**
   * Handle changes to a specific item row field.
   */
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });

    if (itemErrors[index] && itemErrors[index][field]) {
      setItemErrors((prev) => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index] = { ...copy[index], [field]: "" };
        }
        return copy;
      });
    }
  };

  /**
   * Validate form fields before submission.
   */
  const validateForm = useCallback(() => {
    const errors = {};
    const itemErrorList = [];

    // Date
    if (!formData.prescriptionDate) {
      errors.prescriptionDate = "Prescription date is required.";
    } else {
      const parsedDate = new Date(formData.prescriptionDate);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.prescriptionDate = "Prescription date must be a valid date.";
      }
    }

    // Diagnosis notes max 1000 chars
    if (formData.diagnosisNotes && formData.diagnosisNotes.length > 1000) {
      errors.diagnosisNotes = "Diagnosis notes must not exceed 1000 characters.";
    }

    // Status transition rules
    if (prescription?.status === "CANCELLED") {
      errors.status = "Cannot modify a cancelled prescription.";
    } else if (
      prescription?.status === "COMPLETED" &&
      formData.status === "ACTIVE"
    ) {
      errors.status = "Cannot revert a completed prescription back to active.";
    }

    // Items validation
    let hasItemErrors = false;
    items.forEach((item, index) => {
      const currentItemErrors = {};

      if (!item.medicineName || !item.medicineName.trim()) {
        currentItemErrors.medicineName = "Medicine name is required.";
        hasItemErrors = true;
      } else if (item.medicineName.trim().length > 255) {
        currentItemErrors.medicineName = "Medicine name cannot exceed 255 characters.";
        hasItemErrors = true;
      }

      if (!item.dosage || !item.dosage.trim()) {
        currentItemErrors.dosage = "Dosage is required (e.g. 500mg).";
        hasItemErrors = true;
      } else if (item.dosage.trim().length > 100) {
        currentItemErrors.dosage = "Dosage cannot exceed 100 characters.";
        hasItemErrors = true;
      }

      if (!item.frequency || !item.frequency.trim()) {
        currentItemErrors.frequency = "Frequency is required (e.g. Twice daily).";
        hasItemErrors = true;
      } else if (item.frequency.trim().length > 100) {
        currentItemErrors.frequency = "Frequency cannot exceed 100 characters.";
        hasItemErrors = true;
      }

      if (!item.duration || !item.duration.trim()) {
        currentItemErrors.duration = "Duration is required (e.g. 7 days).";
        hasItemErrors = true;
      } else if (item.duration.trim().length > 100) {
        currentItemErrors.duration = "Duration cannot exceed 100 characters.";
        hasItemErrors = true;
      }

      if (
        item.quantity !== undefined &&
        item.quantity !== null &&
        item.quantity !== ""
      ) {
        const qtyNum = Number(item.quantity);
        if (
          !Number.isInteger(qtyNum) ||
          qtyNum <= 0 ||
          Number.isNaN(qtyNum)
        ) {
          currentItemErrors.quantity = "Quantity must be a positive integer.";
          hasItemErrors = true;
        }
      }

      if (item.instructions && item.instructions.length > 500) {
        currentItemErrors.instructions = "Instructions must not exceed 500 characters.";
        hasItemErrors = true;
      }

      itemErrorList[index] = currentItemErrors;
    });

    setFieldErrors(errors);
    setItemErrors(itemErrorList);

    const hasPrimaryErrors = Object.keys(errors).length > 0;
    return !hasPrimaryErrors && !hasItemErrors;
  }, [formData, items, prescription]);

  /**
   * Submit form updates to backend API.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (prescription?.status === "CANCELLED") {
      setSubmitError("Cannot modify a cancelled prescription.");
      return;
    }

    if (!validateForm()) {
      setSubmitError("Please review and fix the validation errors below.");
      return;
    }

    try {
      setSaving(true);

      // 1. Update prescription primary fields (date, diagnosisNotes, status)
      await updatePrescription(id, {
        prescriptionDate: formData.prescriptionDate,
        diagnosisNotes: formData.diagnosisNotes,
        status: formData.status,
      });

      // 2. Process removed items
      const currentItemIds = new Set(
        items.filter((i) => Boolean(i.id)).map((i) => i.id)
      );
      const removedIds = originalItemIds.filter((origId) => !currentItemIds.has(origId));

      for (const removedId of removedIds) {
        await removePrescriptionItem(removedId);
      }

      // 3. Process updated and newly added items
      for (const item of items) {
        const itemPayload = {
          medicineName: item.medicineName.trim(),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration: item.duration.trim(),
          quantity: item.quantity ? Number(item.quantity) : null,
          instructions: item.instructions ? item.instructions.trim() : null,
        };

        if (item.id) {
          await updatePrescriptionItem(item.id, itemPayload);
        } else {
          await addPrescriptionItem(id, itemPayload);
        }
      }

      // Navigate to prescription details on success
      navigate(`/prescriptions/${id}`);
    } catch (err) {
      console.warn("Failed to update prescription:", err.message);
      setSubmitError(
        err.message || "An error occurred while updating the prescription. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Edit Prescription</h2>
            <p>Loading prescription details...</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(`/prescriptions/${id}`)}
            aria-label="Back to Prescription Details"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Cancel
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div className="empty-state">
            <p>Loading prescription information...</p>
          </div>
        </section>
      </div>
    );
  }

  // Not Found State
  if (notFound) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Edit Prescription</h2>
            <p>Update prescription records and medication items.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/prescriptions")}
            aria-label="Back to Prescriptions list"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Prescriptions
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div
            className="empty-state"
            style={{ padding: "36px 20px", textAlign: "center" }}
          >
            <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>
              Prescription Not Found
            </h3>
            <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto 20px" }}>
              The prescription you are attempting to edit does not exist or has been removed.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/prescriptions")}
              aria-label="Back to Prescriptions list"
            >
              Back to Prescriptions
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Error Loading Data State
  if (fetchError || !prescription) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Edit Prescription</h2>
            <p>Update prescription records and medication items.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/prescriptions")}
            aria-label="Back to Prescriptions list"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Prescriptions
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div
            className="empty-state"
            style={{ padding: "36px 20px", textAlign: "center" }}
          >
            <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>
              Unable to Load Prescription
            </h3>
            <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto 20px" }}>
              {fetchError || "An error occurred while loading prescription details."}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                className="primary-button"
                onClick={loadPrescriptionData}
                aria-label="Retry loading prescription"
              >
                Try Again
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/prescriptions")}
                aria-label="Back to Prescriptions list"
              >
                Back to Prescriptions
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const isCancelled = prescription.status === "CANCELLED";
  const isCompleted = prescription.status === "COMPLETED";

  const rxNumber =
    prescription.prescriptionNumber ||
    prescription.prescription_number ||
    `RX-${prescription.id}`;
  const patientName = prescription.patientName || "—";
  const patientCode =
    prescription.patientCode ||
    (prescription.patientId ? `P${prescription.patientId}` : "—");
  const doctorName = prescription.doctorName || "—";
  const doctorSpecialization =
    prescription.doctorSpecialization || prescription.specialization || "—";

  return (
    <div>
      {/* Top Heading */}
      <div className="page-heading-with-action page-heading">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h2>Edit Prescription {rxNumber}</h2>
            <StatusBadge status={prescription.status} />
          </div>
          <p>
            Updating prescription for patient <strong>{patientName}</strong> ({patientCode})
            prescribed by Dr. <strong>{doctorName}</strong>.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate(`/prescriptions/${id}`)}
          aria-label="Back to Prescription Details"
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Icon name="arrowLeft" size={14} /> Cancel & Return
          </span>
        </button>
      </div>

      {/* Global Error Banner */}
      {submitError && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          {submitError}
        </div>
      )}

      {/* Cancelled Warning Banner */}
      {isCancelled && (
        <div
          role="alert"
          style={{
            background: "#fffbebf5",
            border: "1px solid #fcd34d",
            color: "#92400e",
            padding: "14px 18px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          <strong>Notice:</strong> This prescription is cancelled and cannot be modified.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Section 1: Read-Only Overview & Protected Identifiers */}
        <section className="dashboard-section" style={{ marginBottom: "24px" }}>
          <div className="section-header">
            <h3>Prescription Metadata (Protected)</h3>
            <p>Patient and doctor identifiers are fixed and protected from reassignment.</p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <label htmlFor="read-rx-number" style={{ fontWeight: 600, fontSize: "13px", color: "#4b5563" }}>
                Prescription Number
              </label>
              <input
                id="read-rx-number"
                type="text"
                className="form-control"
                value={rxNumber}
                readOnly
                disabled
                style={{ background: "#f3f4f6", cursor: "not-allowed" }}
              />
            </div>

            <div>
              <label htmlFor="read-patient-name" style={{ fontWeight: 600, fontSize: "13px", color: "#4b5563" }}>
                Patient
              </label>
              <input
                id="read-patient-name"
                type="text"
                className="form-control"
                value={`${patientName} (${patientCode})`}
                readOnly
                disabled
                style={{ background: "#f3f4f6", cursor: "not-allowed" }}
              />
            </div>

            <div>
              <label htmlFor="read-doctor-name" style={{ fontWeight: 600, fontSize: "13px", color: "#4b5563" }}>
                Prescribing Doctor
              </label>
              <input
                id="read-doctor-name"
                type="text"
                className="form-control"
                value={`Dr. ${doctorName} (${doctorSpecialization})`}
                readOnly
                disabled
                style={{ background: "#f3f4f6", cursor: "not-allowed" }}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Prescription Information & Lifecycle */}
        <section className="dashboard-section" style={{ marginBottom: "24px" }}>
          <div className="section-header">
            <h3>Prescription Information</h3>
            <p>Update prescription date and operational status.</p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Prescription Date */}
            <div className="form-group">
              <label htmlFor="edit-prescription-date" style={{ fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Prescription Date <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="edit-prescription-date"
                type="date"
                name="prescriptionDate"
                className="form-control"
                value={formData.prescriptionDate}
                onChange={handleInputChange}
                disabled={isCancelled || saving}
                aria-invalid={Boolean(fieldErrors.prescriptionDate)}
                aria-describedby={fieldErrors.prescriptionDate ? "date-error" : undefined}
                required
              />
              {fieldErrors.prescriptionDate && (
                <span id="date-error" style={{ color: "#dc2626", fontSize: "13px", marginTop: "4px", display: "block" }}>
                  {fieldErrors.prescriptionDate}
                </span>
              )}
            </div>

            {/* Status */}
            <div className="form-group">
              <label htmlFor="edit-prescription-status" style={{ fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Status <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                id="edit-prescription-status"
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleInputChange}
                disabled={isCancelled || saving}
                aria-invalid={Boolean(fieldErrors.status)}
                aria-describedby={fieldErrors.status ? "status-error" : undefined}
                required
              >
                <option value="ACTIVE" disabled={isCompleted}>
                  ACTIVE {isCompleted ? "(Cannot revert completed to active)" : ""}
                </option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              {fieldErrors.status && (
                <span id="status-error" style={{ color: "#dc2626", fontSize: "13px", marginTop: "4px", display: "block" }}>
                  {fieldErrors.status}
                </span>
              )}
              {isCompleted && (
                <span style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Note: Completed prescriptions cannot be reverted back to Active.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Clinical Notes */}
        <section className="dashboard-section" style={{ marginBottom: "24px" }}>
          <div className="section-header">
            <h3>Clinical Notes & Diagnosis</h3>
            <p>Observations, diagnostic details, and general instructions recorded by the physician.</p>
          </div>

          <div className="form-group">
            <label htmlFor="edit-diagnosis-notes" style={{ fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Diagnosis / Clinical Notes
            </label>
            <textarea
              id="edit-diagnosis-notes"
              name="diagnosisNotes"
              rows={4}
              className="form-control"
              placeholder="Enter clinical observations, diagnosis summary, or general notes..."
              value={formData.diagnosisNotes}
              onChange={handleInputChange}
              disabled={isCancelled || saving}
              maxLength={1000}
              aria-invalid={Boolean(fieldErrors.diagnosisNotes)}
              aria-describedby={fieldErrors.diagnosisNotes ? "notes-error" : undefined}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              {fieldErrors.diagnosisNotes ? (
                <span id="notes-error" style={{ color: "#dc2626", fontSize: "13px" }}>
                  {fieldErrors.diagnosisNotes}
                </span>
              ) : (
                <span />
              )}
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                {formData.diagnosisNotes.length}/1000 characters
              </span>
            </div>
          </div>
        </section>

        {/* Section 4: Prescription Items */}
        <section className="dashboard-section" style={{ marginBottom: "24px" }}>
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
              <h3>Prescription Items</h3>
              <p>Add, modify, or remove prescribed medications.</p>
            </div>

            {!isCancelled && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleAddItem}
                disabled={saving}
                aria-label="Add medication item"
              >
                + Add Medicine
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div
              className="empty-state"
              style={{
                padding: "24px",
                border: "1px dashed #d1d5db",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 12px 0", color: "#6b7280" }}>
                No medication items present. Click "+ Add Medicine" to add prescribed medicines.
              </p>
              {!isCancelled && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleAddItem}
                  disabled={saving}
                  aria-label="Add medicine item"
                >
                  + Add Medicine Item
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {items.map((item, index) => {
                const errs = itemErrors[index] || {};
                return (
                  <div
                    key={item.id || `item-${index}`}
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "16px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#374151" }}>
                        Item #{index + 1} {item.id ? "(Saved)" : "(New)"}
                      </h4>

                      {!isCancelled && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={saving}
                          aria-label={`Remove medicine item ${index + 1}`}
                          style={{
                            color: "#dc2626",
                            borderColor: "#fca5a5",
                            padding: "4px 10px",
                            fontSize: "13px",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      {/* Medicine Name */}
                      <div>
                        <label
                          htmlFor={`medicineName-${index}`}
                          style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px" }}
                        >
                          Medicine Name <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          id={`medicineName-${index}`}
                          type="text"
                          className="form-control"
                          placeholder="e.g. Amoxicillin 500mg"
                          value={item.medicineName}
                          onChange={(e) => handleItemChange(index, "medicineName", e.target.value)}
                          disabled={isCancelled || saving}
                          aria-invalid={Boolean(errs.medicineName)}
                          required
                        />
                        {errs.medicineName && (
                          <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px", display: "block" }}>
                            {errs.medicineName}
                          </span>
                        )}
                      </div>

                      {/* Dosage */}
                      <div>
                        <label
                          htmlFor={`dosage-${index}`}
                          style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px" }}
                        >
                          Dosage <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          id={`dosage-${index}`}
                          type="text"
                          className="form-control"
                          placeholder="e.g. 1 capsule"
                          value={item.dosage}
                          onChange={(e) => handleItemChange(index, "dosage", e.target.value)}
                          disabled={isCancelled || saving}
                          aria-invalid={Boolean(errs.dosage)}
                          required
                        />
                        {errs.dosage && (
                          <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px", display: "block" }}>
                            {errs.dosage}
                          </span>
                        )}
                      </div>

                      {/* Frequency */}
                      <div>
                        <label
                          htmlFor={`frequency-${index}`}
                          style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px" }}
                        >
                          Frequency <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          id={`frequency-${index}`}
                          type="text"
                          className="form-control"
                          placeholder="e.g. Three times daily"
                          value={item.frequency}
                          onChange={(e) => handleItemChange(index, "frequency", e.target.value)}
                          disabled={isCancelled || saving}
                          aria-invalid={Boolean(errs.frequency)}
                          required
                        />
                        {errs.frequency && (
                          <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px", display: "block" }}>
                            {errs.frequency}
                          </span>
                        )}
                      </div>

                      {/* Duration */}
                      <div>
                        <label
                          htmlFor={`duration-${index}`}
                          style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px" }}
                        >
                          Duration <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          id={`duration-${index}`}
                          type="text"
                          className="form-control"
                          placeholder="e.g. 7 days"
                          value={item.duration}
                          onChange={(e) => handleItemChange(index, "duration", e.target.value)}
                          disabled={isCancelled || saving}
                          aria-invalid={Boolean(errs.duration)}
                          required
                        />
                        {errs.duration && (
                          <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px", display: "block" }}>
                            {errs.duration}
                          </span>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <label
                          htmlFor={`quantity-${index}`}
                          style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px" }}
                        >
                          Quantity
                        </label>
                        <input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          step="1"
                          className="form-control"
                          placeholder="e.g. 21"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          disabled={isCancelled || saving}
                          aria-invalid={Boolean(errs.quantity)}
                        />
                        {errs.quantity && (
                          <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px", display: "block" }}>
                            {errs.quantity}
                          </span>
                        )}
                      </div>

                      {/* Instructions */}
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label
                          htmlFor={`instructions-${index}`}
                          style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px" }}
                        >
                          Instructions (Optional)
                        </label>
                        <input
                          id={`instructions-${index}`}
                          type="text"
                          className="form-control"
                          placeholder="e.g. Take after meals with full glass of water"
                          value={item.instructions}
                          onChange={(e) => handleItemChange(index, "instructions", e.target.value)}
                          disabled={isCancelled || saving}
                          aria-invalid={Boolean(errs.instructions)}
                          maxLength={500}
                        />
                        {errs.instructions && (
                          <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px", display: "block" }}>
                            {errs.instructions}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 5: Form Actions */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            marginTop: "24px",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(`/prescriptions/${id}`)}
            disabled={saving}
            aria-label="Cancel editing prescription"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={isCancelled || saving}
            aria-label="Save prescription changes"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditPrescription;
