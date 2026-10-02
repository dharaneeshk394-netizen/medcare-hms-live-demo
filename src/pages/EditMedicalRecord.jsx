import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getMedicalRecordById, updateMedicalRecord } from "../services/medicalRecordService";

function EditMedicalRecord() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [recordInfo, setRecordInfo] = useState(null);

  const [formData, setFormData] = useState({
    recordDate: "",
    recordType: "General",
    chiefComplaint: "",
    diagnosis: "",
    clinicalNotes: "",
    treatmentPlan: "",
    status: "ACTIVE",
  });

  // Doctor ownership check if user is a doctor
  const userDoctorId = user?.doctorId || user?.doctor_id;
  const isDoctorRole = user?.role === "doctor";

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const record = await getMedicalRecordById(id);
      if (!record) {
        setLoadError("Medical record not found.");
        setRecordInfo(null);
      } else {
        // Enforce doctor ownership if user is a doctor
        if (isDoctorRole && userDoctorId && Number(record.doctorId) !== Number(userDoctorId)) {
          setLoadError("Access denied: Doctors can only edit their own medical records.");
          setRecordInfo(null);
          return;
        }

        setRecordInfo(record);
        setFormData({
          recordDate: record.recordDate || new Date().toISOString().slice(0, 10),
          recordType: record.recordType || "General",
          chiefComplaint: record.chiefComplaint || "",
          diagnosis: record.diagnosis || "",
          clinicalNotes: record.clinicalNotes || "",
          treatmentPlan: record.treatmentPlan || "",
          status: record.status || "ACTIVE",
        });
      }
    } catch (err) {
      console.error("Failed to load medical record for editing:", err);
      setLoadError(
        err.message || "Failed to load medical record. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id, isDoctorRole, userDoctorId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.recordDate) {
      errors.recordDate = "Record date is required";
    }

    if (!formData.diagnosis || !formData.diagnosis.trim()) {
      errors.diagnosis = "Diagnosis is required";
    } else if (formData.diagnosis.trim().length > 1000) {
      errors.diagnosis = "Diagnosis must not exceed 1000 characters";
    }

    if (formData.chiefComplaint && formData.chiefComplaint.length > 1000) {
      errors.chiefComplaint = "Chief complaint must not exceed 1000 characters";
    }

    if (formData.clinicalNotes && formData.clinicalNotes.length > 4000) {
      errors.clinicalNotes = "Clinical notes must not exceed 4000 characters";
    }

    if (formData.treatmentPlan && formData.treatmentPlan.length > 2000) {
      errors.treatmentPlan = "Treatment plan must not exceed 2000 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        recordDate: formData.recordDate,
        recordType: formData.recordType,
        chiefComplaint: formData.chiefComplaint.trim() || null,
        diagnosis: formData.diagnosis.trim(),
        clinicalNotes: formData.clinicalNotes.trim() || null,
        treatmentPlan: formData.treatmentPlan.trim() || null,
        status: formData.status,
      };

      await updateMedicalRecord(id, payload);
      navigate(`/medical-records/${id}`);
    } catch (err) {
      console.error("Failed to update medical record:", err);
      setSubmitError(
        err.message || "Failed to update medical record. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state" style={{ padding: "60px", textAlign: "center", color: "#6b7280" }}>
          Loading medical record for editing...
        </div>
      </div>
    );
  }

  if (loadError || !recordInfo) {
    return (
      <div className="page-container">
        <div className="error-card" style={{ padding: "40px", textAlign: "center" }}>
          <h2 style={{ color: "#ef4444", marginBottom: "12px" }}>
            {loadError || "Record Not Found"}
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "20px" }}>
            Unable to open medical record for editing.
          </p>
          <button
            type="button"
            className="action-button secondary-button"
            onClick={() => navigate("/medical-records")}
          >
            Back to Medical Records
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" id="edit-medical-record-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Edit Medical Record #{recordInfo.recordNumber || id}
          </h1>
          <p className="page-subtitle">
            Update clinical assessment, notes, diagnosis, or status
          </p>
        </div>

        <button
          type="button"
          className="action-button secondary-button"
          onClick={() => navigate(`/medical-records/${id}`)}
        >
          Cancel
        </button>
      </div>

      {/* Error Alert Banner */}
      {submitError && (
        <div className="error-banner" style={{ marginBottom: "20px" }}>
          <span>{submitError}</span>
        </div>
      )}

      {/* Read-only Patient & Doctor Overview */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          marginBottom: "20px",
          backgroundColor: "#f9fafb",
          display: "flex",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ color: "#6b7280", fontSize: "12px" }}>PATIENT</strong>
          <div style={{ fontWeight: 600, color: "#111827" }}>
            {recordInfo.patientName || "N/A"} ({recordInfo.patientCode || recordInfo.patientId})
          </div>
        </div>

        <div>
          <strong style={{ color: "#6b7280", fontSize: "12px" }}>DOCTOR</strong>
          <div style={{ fontWeight: 600, color: "#111827" }}>
            {recordInfo.doctorName || "N/A"} ({recordInfo.doctorSpecialization || "Doctor"})
          </div>
        </div>

        {recordInfo.appointmentId && (
          <div>
            <strong style={{ color: "#6b7280", fontSize: "12px" }}>LINKED APPOINTMENT</strong>
            <div style={{ fontWeight: 600, color: "#111827" }}>
              Appt #{recordInfo.appointmentCode || recordInfo.appointmentId}
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="form-card" id="edit-medical-record-form">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* Record Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="recordDate">
              Record Date <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              id="recordDate"
              name="recordDate"
              className={`form-control ${fieldErrors.recordDate ? "is-invalid" : ""}`}
              value={formData.recordDate}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {fieldErrors.recordDate && (
              <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>
                {fieldErrors.recordDate}
              </span>
            )}
          </div>

          {/* Record Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="recordType">
              Record Type
            </label>
            <select
              id="recordType"
              name="recordType"
              className="form-control"
              value={formData.recordType}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="General">General</option>
              <option value="Consultation">Consultation</option>
              <option value="Lab Result">Lab Result</option>
              <option value="Operative Note">Operative Note</option>
              <option value="Progress Note">Progress Note</option>
              <option value="Discharge Summary">Discharge Summary</option>
            </select>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label" htmlFor="status">
              Record Status
            </label>
            <select
              id="status"
              name="status"
              className="form-control"
              value={formData.status}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="ACTIVE">Active</option>
              <option value="AMENDED">Amended</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Clinical Text Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
          {/* Chief Complaint */}
          <div className="form-group">
            <label className="form-label" htmlFor="chiefComplaint">
              Chief Complaint
            </label>
            <textarea
              id="chiefComplaint"
              name="chiefComplaint"
              className={`form-control ${fieldErrors.chiefComplaint ? "is-invalid" : ""}`}
              rows={3}
              placeholder="Primary symptoms..."
              value={formData.chiefComplaint}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {fieldErrors.chiefComplaint && (
              <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>
                {fieldErrors.chiefComplaint}
              </span>
            )}
          </div>

          {/* Diagnosis */}
          <div className="form-group">
            <label className="form-label" htmlFor="diagnosis">
              Diagnosis <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              id="diagnosis"
              name="diagnosis"
              className={`form-control ${fieldErrors.diagnosis ? "is-invalid" : ""}`}
              rows={3}
              placeholder="Primary diagnosis..."
              value={formData.diagnosis}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {fieldErrors.diagnosis && (
              <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>
                {fieldErrors.diagnosis}
              </span>
            )}
          </div>

          {/* Clinical Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="clinicalNotes">
              Clinical Notes
            </label>
            <textarea
              id="clinicalNotes"
              name="clinicalNotes"
              className={`form-control ${fieldErrors.clinicalNotes ? "is-invalid" : ""}`}
              rows={4}
              placeholder="Detailed observations and findings..."
              value={formData.clinicalNotes}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {fieldErrors.clinicalNotes && (
              <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>
                {fieldErrors.clinicalNotes}
              </span>
            )}
          </div>

          {/* Treatment Plan */}
          <div className="form-group">
            <label className="form-label" htmlFor="treatmentPlan">
              Treatment Plan
            </label>
            <textarea
              id="treatmentPlan"
              name="treatmentPlan"
              className={`form-control ${fieldErrors.treatmentPlan ? "is-invalid" : ""}`}
              rows={3}
              placeholder="Recommended therapies, lifestyle adjustments, follow-up..."
              value={formData.treatmentPlan}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {fieldErrors.treatmentPlan && (
              <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>
                {fieldErrors.treatmentPlan}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            className="action-button secondary-button"
            onClick={() => navigate(`/medical-records/${id}`)}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="action-button primary-button"
            disabled={isSubmitting}
            id="update-medical-record-btn"
          >
            {isSubmitting ? "Updating Record..." : "Update Medical Record"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditMedicalRecord;
