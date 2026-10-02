import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getPatients } from "../services/patientService";
import { getDoctors } from "../services/doctorService";
import { getAppointments } from "../services/appointmentService";
import { createPrescription } from "../services/prescriptionService";

function AddPrescription() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Date helper for YYYY-MM-DD
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Form State
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    appointmentId: "",
    prescriptionDate: today,
    diagnosisNotes: "",
  });

  // Dynamic Prescription Items State
  const [items, setItems] = useState([
    {
      medicineName: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: "1",
      instructions: "",
    },
  ]);

  // Dependent data lists
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // UI / Async State
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Role detection
  const isDoctorRole = user?.role === "doctor";

  /**
   * Load required dropdown data (patients, doctors, appointments) on mount.
   */
  useEffect(() => {
    let isMounted = true;

    const loadFormData = async () => {
      try {
        setLoadingData(true);
        setSubmitError("");

        const [patientsRes, doctorsRes, appointmentsRes] =
          await Promise.allSettled([
            getPatients(),
            getDoctors(),
            getAppointments(),
          ]);

        if (!isMounted) return;

        let patientsList = [];
        if (patientsRes.status === "fulfilled") {
          patientsList = Array.isArray(patientsRes.value)
            ? patientsRes.value
            : patientsRes.value?.data || [];
          setPatients(patientsList);
        } else {
          console.warn(
            "Could not load patients list:",
            patientsRes.reason?.message
          );
        }

        let doctorsList = [];
        if (doctorsRes.status === "fulfilled") {
          doctorsList = Array.isArray(doctorsRes.value)
            ? doctorsRes.value
            : doctorsRes.value?.data || [];
          setDoctors(doctorsList);
        } else {
          console.warn(
            "Could not load doctors list:",
            doctorsRes.reason?.message
          );
        }

        if (appointmentsRes.status === "fulfilled") {
          const apptsList = Array.isArray(appointmentsRes.value)
            ? appointmentsRes.value
            : appointmentsRes.value?.data || [];
          setAppointments(apptsList);
        } else {
          console.warn(
            "Could not load appointments list:",
            appointmentsRes.reason?.message
          );
        }

        // If logged in as Doctor, auto-select their doctor record
        if (isDoctorRole) {
          const userDoctorId = user?.doctorId || user?.doctor_id;
          const userDoctor = doctorsList.find(
            (doc) =>
              Number(doc.id) === Number(userDoctorId) ||
              Number(doc.userId || doc.user_id) === Number(user?.id)
          );

          if (userDoctor) {
            setFormData((prev) => ({
              ...prev,
              doctorId: String(userDoctor.id),
            }));
          } else if (userDoctorId) {
            setFormData((prev) => ({
              ...prev,
              doctorId: String(userDoctorId),
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Failed to load prescription form dependencies:", err.message);
          setSubmitError(
            err.message ||
              "Failed to load required dropdown records. Please try again."
          );
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
  }, [isDoctorRole, user]);

  /**
   * Filter appointments for the selected patient.
   */
  const patientAppointments = useMemo(() => {
    if (!formData.patientId) return [];
    return appointments.filter(
      (appt) =>
        Number(appt.patientId || appt.patient_id) === Number(formData.patientId)
    );
  }, [appointments, formData.patientId]);

  /**
   * Handle changes to primary form input fields.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Reset appointment if patient changes and current appointment is invalid
      if (name === "patientId" && prev.appointmentId) {
        const isValidAppt = appointments.some(
          (a) =>
            Number(a.id) === Number(prev.appointmentId) &&
            Number(a.patientId || a.patient_id) === Number(value)
        );
        if (!isValidAppt) {
          updated.appointmentId = "";
        }
      }

      return updated;
    });

    // Clear field-specific error
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  /**
   * Add a new blank medicine item.
   */
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineName: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "1",
        instructions: "",
      },
    ]);
  };

  /**
   * Remove a medicine item by index.
   */
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setItemErrors((prev) => prev.filter((_, idx) => idx !== index));
  };

  /**
   * Handle changes to medicine item fields.
   */
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });

    // Clear item error if present
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
   * Client-side validation.
   */
  const validateForm = useCallback(() => {
    const errors = {};
    const itemErrorList = [];

    // Patient
    if (!formData.patientId) {
      errors.patientId = "Patient selection is required.";
    }

    // Doctor
    if (!formData.doctorId) {
      errors.doctorId = "Doctor selection is required.";
    }

    // Date
    if (!formData.prescriptionDate) {
      errors.prescriptionDate = "Prescription date is required.";
    } else {
      const parsedDate = new Date(formData.prescriptionDate);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.prescriptionDate = "Prescription date must be a valid date (YYYY-MM-DD).";
      }
    }

    // Diagnosis / Notes length limit (1000 characters)
    if (formData.diagnosisNotes && formData.diagnosisNotes.length > 1000) {
      errors.diagnosisNotes = "Diagnosis notes must not exceed 1000 characters.";
    }

    // Validate medicine items
    let hasItemErrors = false;
    items.forEach((item, index) => {
      const currentItemErrors = {};

      if (!item.medicineName || !item.medicineName.trim()) {
        currentItemErrors.medicineName = "Medicine name is required.";
        hasItemErrors = true;
      } else if (item.medicineName.trim().length > 255) {
        currentItemErrors.medicineName = "Medicine name must not exceed 255 characters.";
        hasItemErrors = true;
      }

      if (!item.dosage || !item.dosage.trim()) {
        currentItemErrors.dosage = "Dosage is required (e.g. 500mg).";
        hasItemErrors = true;
      } else if (item.dosage.trim().length > 100) {
        currentItemErrors.dosage = "Dosage must not exceed 100 characters.";
        hasItemErrors = true;
      }

      if (!item.frequency || !item.frequency.trim()) {
        currentItemErrors.frequency = "Frequency is required (e.g. Twice daily).";
        hasItemErrors = true;
      } else if (item.frequency.trim().length > 100) {
        currentItemErrors.frequency = "Frequency must not exceed 100 characters.";
        hasItemErrors = true;
      }

      if (!item.duration || !item.duration.trim()) {
        currentItemErrors.duration = "Duration is required (e.g. 7 days).";
        hasItemErrors = true;
      } else if (item.duration.trim().length > 100) {
        currentItemErrors.duration = "Duration must not exceed 100 characters.";
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
          !/^[1-9]\d*$/.test(String(item.quantity).trim())
        ) {
          currentItemErrors.quantity = "Quantity must be a positive integer (> 0).";
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

    return Object.keys(errors).length === 0 && !hasItemErrors;
  }, [formData, items]);

  /**
   * Handle form submission.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    if (!validateForm()) {
      setSubmitError("Please fix the validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build clean payload without server-controlled fields
      const payload = {
        patientId: Number(formData.patientId),
        doctorId: Number(formData.doctorId),
        prescriptionDate: formData.prescriptionDate,
      };

      if (formData.appointmentId) {
        payload.appointmentId = Number(formData.appointmentId);
      }

      if (formData.diagnosisNotes && formData.diagnosisNotes.trim()) {
        payload.diagnosisNotes = formData.diagnosisNotes.trim();
      }

      // Add items if available
      if (items.length > 0) {
        payload.items = items.map((item) => {
          const itemPayload = {
            medicineName: item.medicineName.trim(),
            dosage: item.dosage.trim(),
            frequency: item.frequency.trim(),
            duration: item.duration.trim(),
          };

          if (
            item.quantity !== "" &&
            item.quantity !== null &&
            item.quantity !== undefined
          ) {
            itemPayload.quantity = Number(item.quantity);
          }

          if (item.instructions && item.instructions.trim()) {
            itemPayload.instructions = item.instructions.trim();
          }

          return itemPayload;
        });
      }

      const createdRx = await createPrescription(payload);

      setSuccessMessage("Prescription created successfully!");

      // Navigate back to Prescriptions List page after brief feedback
      setTimeout(() => {
        if (createdRx && (createdRx.id || createdRx.data?.id)) {
          // If created Rx has ID and details route exists in future, could navigate to /prescriptions/:id
          navigate("/prescriptions");
        } else {
          navigate("/prescriptions");
        }
      }, 800);
    } catch (err) {
      console.warn("Error creating prescription:", err);

      let msg = err.message || "Failed to create prescription. Please check input parameters.";

      if (err.status === 403) {
        msg = "Access denied: You do not have permission to create this prescription.";
      } else if (err.status === 401) {
        msg = "Session expired. Please log in again.";
      } else if (err.status === 400) {
        msg = err.message || "Invalid request data. Please review the form fields.";
      }

      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading">
        <h2>Create Prescription</h2>
        <p>Issue a new medical prescription for a patient.</p>
      </div>

      {/* Main Section */}
      <section className="dashboard-section">
        {loadingData ? (
          <div className="empty-state">
            <p>Loading patient and doctor records...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Global Error Banner */}
            {submitError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                }}
              >
                <strong>Error: </strong> {submitError}
              </div>
            )}

            {/* Success Feedback Banner */}
            {successMessage && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                }}
              >
                {successMessage}
              </div>
            )}

            {/* Header / Primary Form Section */}
            <div className="form-section-header">
              <h3>Prescription Details</h3>
              <p>Select patient, attending doctor, and prescription date.</p>
            </div>

            <div className="form-grid" style={{ marginBottom: "24px" }}>
              {/* Patient Selector */}
              <div className="form-field">
                <label htmlFor="patientId">
                  Patient <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  id="patientId"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map((p) => {
                    const code = p.patientCode || p.patient_code;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {code ? `(${code})` : ""}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.patientId && (
                  <p className="form-error">{fieldErrors.patientId}</p>
                )}
              </div>

              {/* Doctor Selector */}
              <div className="form-field">
                <label htmlFor="doctorId">
                  Doctor <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  id="doctorId"
                  name="doctorId"
                  value={formData.doctorId}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isDoctorRole}
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map((d) => {
                    const docName = d.fullName || d.full_name || d.name || `Doctor #${d.id}`;
                    const spec = d.specialization ? ` - ${d.specialization}` : "";
                    return (
                      <option key={d.id} value={d.id}>
                        {docName}
                        {spec}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.doctorId && (
                  <p className="form-error">{fieldErrors.doctorId}</p>
                )}
              </div>

              {/* Optional Appointment Selector */}
              <div className="form-field">
                <label htmlFor="appointmentId">
                  Linked Appointment <span style={{ color: "#6b7280", fontWeight: "normal" }}>(Optional)</span>
                </label>
                <select
                  id="appointmentId"
                  name="appointmentId"
                  value={formData.appointmentId}
                  onChange={handleInputChange}
                  disabled={isSubmitting || !formData.patientId}
                >
                  <option value="">-- None / Direct Prescription --</option>
                  {patientAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      Appt #{appt.id} - {appt.appointmentDate || appt.appointment_date} ({appt.status || "Scheduled"})
                    </option>
                  ))}
                </select>
                {!formData.patientId && (
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    Select a patient first to filter appointments.
                  </span>
                )}
              </div>

              {/* Prescription Date */}
              <div className="form-field">
                <label htmlFor="prescriptionDate">
                  Prescription Date <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="prescriptionDate"
                  type="date"
                  name="prescriptionDate"
                  value={formData.prescriptionDate}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
                {fieldErrors.prescriptionDate && (
                  <p className="form-error">{fieldErrors.prescriptionDate}</p>
                )}
              </div>
            </div>

            {/* Diagnosis / Notes */}
            <div className="form-field" style={{ marginBottom: "28px" }}>
              <label htmlFor="diagnosisNotes">
                Diagnosis / Clinical Notes <span style={{ color: "#6b7280", fontWeight: "normal" }}>(Optional)</span>
              </label>
              <textarea
                id="diagnosisNotes"
                name="diagnosisNotes"
                rows="3"
                value={formData.diagnosisNotes}
                onChange={handleInputChange}
                disabled={isSubmitting}
                placeholder="Enter clinical diagnosis or general notes for this prescription..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "7px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {fieldErrors.diagnosisNotes && (
                <p className="form-error">{fieldErrors.diagnosisNotes}</p>
              )}
            </div>

            {/* Prescription Line Items Section */}
            <div
              className="form-section-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e5e7eb",
                paddingTop: "20px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3>Prescription Items</h3>
                <p>Add required medications, dosages, frequency, and instructions.</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleAddItem}
                disabled={isSubmitting}
              >
                + Add Medication
              </button>
            </div>

            {/* Items Container */}
            <div className="invoice-items-container">
              {items.length === 0 ? (
                <div className="empty-state" style={{ padding: "24px", background: "#f9fafb", borderRadius: "8px" }}>
                  <p>No medications added yet. Click "+ Add Medication" to add an item.</p>
                </div>
              ) : (
                items.map((item, index) => {
                  const errs = itemErrors[index] || {};

                  return (
                    <div key={index} className="invoice-item-card">
                      <div className="invoice-item-header">
                        <span className="invoice-item-number">Medication #{index + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="small-button danger-button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isSubmitting}
                            aria-label={`Remove medication #${index + 1}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="invoice-item-inputs">
                        {/* Medicine Name */}
                        <div className="form-field" style={{ flex: "2", minWidth: "200px" }}>
                          <label htmlFor={`med-name-${index}`}>
                            Medicine Name <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            id={`med-name-${index}`}
                            type="text"
                            placeholder="e.g. Amoxicillin, Paracetamol"
                            value={item.medicineName}
                            onChange={(e) => handleItemChange(index, "medicineName", e.target.value)}
                            disabled={isSubmitting}
                          />
                          {errs.medicineName && <p className="form-error">{errs.medicineName}</p>}
                        </div>

                        {/* Dosage */}
                        <div className="form-field" style={{ flex: "1", minWidth: "120px" }}>
                          <label htmlFor={`med-dosage-${index}`}>
                            Dosage <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            id={`med-dosage-${index}`}
                            type="text"
                            placeholder="e.g. 500mg, 10ml"
                            value={item.dosage}
                            onChange={(e) => handleItemChange(index, "dosage", e.target.value)}
                            disabled={isSubmitting}
                          />
                          {errs.dosage && <p className="form-error">{errs.dosage}</p>}
                        </div>

                        {/* Frequency */}
                        <div className="form-field" style={{ flex: "1", minWidth: "140px" }}>
                          <label htmlFor={`med-freq-${index}`}>
                            Frequency <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            id={`med-freq-${index}`}
                            type="text"
                            placeholder="e.g. Twice daily, 8 hourly"
                            value={item.frequency}
                            onChange={(e) => handleItemChange(index, "frequency", e.target.value)}
                            disabled={isSubmitting}
                          />
                          {errs.frequency && <p className="form-error">{errs.frequency}</p>}
                        </div>

                        {/* Duration */}
                        <div className="form-field" style={{ flex: "1", minWidth: "120px" }}>
                          <label htmlFor={`med-dur-${index}`}>
                            Duration <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            id={`med-dur-${index}`}
                            type="text"
                            placeholder="e.g. 7 days, 2 weeks"
                            value={item.duration}
                            onChange={(e) => handleItemChange(index, "duration", e.target.value)}
                            disabled={isSubmitting}
                          />
                          {errs.duration && <p className="form-error">{errs.duration}</p>}
                        </div>

                        {/* Quantity */}
                        <div className="form-field" style={{ width: "90px" }}>
                          <label htmlFor={`med-qty-${index}`}>Quantity</label>
                          <input
                            id={`med-qty-${index}`}
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            disabled={isSubmitting}
                          />
                          {errs.quantity && <p className="form-error">{errs.quantity}</p>}
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="form-field" style={{ marginTop: "12px" }}>
                        <label htmlFor={`med-inst-${index}`}>
                          Special Instructions <span style={{ color: "#6b7280", fontWeight: "normal" }}>(Optional)</span>
                        </label>
                        <input
                          id={`med-inst-${index}`}
                          type="text"
                          placeholder="e.g. Take after meals with plenty of water"
                          value={item.instructions}
                          onChange={(e) => handleItemChange(index, "instructions", e.target.value)}
                          disabled={isSubmitting}
                        />
                        {errs.instructions && <p className="form-error">{errs.instructions}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/prescriptions")}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Prescription..." : "Save Prescription"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default AddPrescription;
