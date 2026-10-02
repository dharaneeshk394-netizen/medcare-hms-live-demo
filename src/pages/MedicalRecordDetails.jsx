import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getMedicalRecordById } from "../services/medicalRecordService";

function MedicalRecordDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = user?.role === "admin" || user?.role === "doctor";

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getMedicalRecordById(id);
      if (!data) {
        setError("Medical record not found");
        setRecord(null);
      } else {
        setRecord(data);
      }
    } catch (err) {
      console.error("Failed to load medical record details:", err);
      setError(
        err.message || "Failed to load medical record. Please try again."
      );
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state" style={{ padding: "60px", textAlign: "center", color: "#6b7280" }}>
          Loading medical record details...
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="page-container">
        <div className="error-card" style={{ padding: "40px", textAlign: "center" }}>
          <h2 style={{ color: "#ef4444", marginBottom: "12px" }}>
            {error || "Record Not Found"}
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "20px" }}>
            The requested medical record could not be retrieved.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              type="button"
              className="action-button secondary-button"
              onClick={() => navigate("/medical-records")}
            >
              Back to Medical Records
            </button>
            <button
              type="button"
              className="action-button primary-button"
              onClick={loadDetails}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" id="medical-record-details-page">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {record.recordNumber || `MR-${String(record.id).padStart(6, "0")}`}
            </h1>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            >
              {record.recordType || "General"}
            </span>
            <StatusBadge status={record.status || "ACTIVE"} />
          </div>
          <p className="page-subtitle" style={{ marginTop: "4px" }}>
            Record Date: {record.recordDate || "N/A"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            className="action-button secondary-button"
            onClick={() => navigate("/medical-records")}
            id="back-to-list-btn"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back
            </span>
          </button>

          {canEdit && (
            <button
              type="button"
              className="action-button primary-button"
              onClick={() => navigate(`/medical-records/${record.id}/edit`)}
              id="edit-medical-record-btn"
            >
              Edit Record
            </button>
          )}
        </div>
      </div>

      {/* Grid Layout: Patient, Doctor, Linked Appointment */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Patient Card */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#1f2937", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Icon name="user" size={18} /> Patient Information
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <div>
              <strong style={{ color: "#4b5563" }}>Name:</strong>{" "}
              <span style={{ fontWeight: 600 }}>{record.patientName || "N/A"}</span>
            </div>
            <div>
              <strong style={{ color: "#4b5563" }}>Patient ID:</strong>{" "}
              <span>{record.patientCode || record.patientId || "N/A"}</span>
            </div>
            <div>
              <strong style={{ color: "#4b5563" }}>Age / Gender:</strong>{" "}
              <span>
                {record.patientAge ? `${record.patientAge} yrs` : "N/A"} / {record.patientGender || "N/A"}
              </span>
            </div>
            {record.patientBloodGroup && (
              <div>
                <strong style={{ color: "#4b5563" }}>Blood Group:</strong>{" "}
                <span>{record.patientBloodGroup}</span>
              </div>
            )}
            {record.patientPhone && (
              <div>
                <strong style={{ color: "#4b5563" }}>Phone:</strong>{" "}
                <span>{record.patientPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Card */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#1f2937", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Icon name="stethoscope" size={18} /> Attending Doctor
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <div>
              <strong style={{ color: "#4b5563" }}>Doctor:</strong>{" "}
              <span style={{ fontWeight: 600 }}>{record.doctorName || "N/A"}</span>
            </div>
            <div>
              <strong style={{ color: "#4b5563" }}>Doctor Code:</strong>{" "}
              <span>{record.doctorCode || record.doctorId || "N/A"}</span>
            </div>
            <div>
              <strong style={{ color: "#4b5563" }}>Specialization:</strong>{" "}
              <span>{record.doctorSpecialization || "General Medicine"}</span>
            </div>
            {record.doctorDepartment && (
              <div>
                <strong style={{ color: "#4b5563" }}>Department:</strong>{" "}
                <span>{record.doctorDepartment}</span>
              </div>
            )}
          </div>
        </div>

        {/* Linked Appointment Card */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#1f2937", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Icon name="calendar" size={18} /> Linked Appointment
            </span>
          </h3>
          {record.appointmentId ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              <div>
                <strong style={{ color: "#4b5563" }}>Appt #:</strong>{" "}
                <span style={{ fontWeight: 600 }}>{record.appointmentCode || `#${record.appointmentId}`}</span>
              </div>
              <div>
                <strong style={{ color: "#4b5563" }}>Appt Date:</strong>{" "}
                <span>{record.appointmentDate || "N/A"}</span>
              </div>
              {record.appointmentReason && (
                <div>
                  <strong style={{ color: "#4b5563" }}>Reason:</strong>{" "}
                  <span>{record.appointmentReason}</span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "#9ca3af", fontSize: "14px", fontStyle: "italic", margin: 0 }}>
              No linked appointment (Direct Walk-in / Unlinked Record)
            </p>
          )}
        </div>
      </div>

      {/* Clinical Notes & Findings Section */}
      <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px", color: "#111827", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Icon name="clipboard" size={20} /> Clinical Findings & Record Content
          </span>
        </h2>

        {/* Chief Complaint */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Chief Complaint
          </h4>
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
              fontSize: "15px",
              color: record.chiefComplaint ? "#1f2937" : "#9ca3af",
              whiteSpace: "pre-wrap",
            }}
          >
            {record.chiefComplaint || "No chief complaint recorded."}
          </div>
        </div>

        {/* Diagnosis */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Diagnosis <span style={{ color: "#ef4444" }}>*</span>
          </h4>
          <div
            style={{
              padding: "14px 16px",
              backgroundColor: "#f0fdf4",
              borderRadius: "6px",
              border: "1px solid #bbf7d0",
              fontSize: "15px",
              fontWeight: 500,
              color: "#166534",
              whiteSpace: "pre-wrap",
            }}
          >
            {record.diagnosis}
          </div>
        </div>

        {/* Clinical Notes */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Clinical Notes
          </h4>
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
              fontSize: "15px",
              color: record.clinicalNotes ? "#1f2937" : "#9ca3af",
              whiteSpace: "pre-wrap",
            }}
          >
            {record.clinicalNotes || "No additional clinical notes."}
          </div>
        </div>

        {/* Treatment Plan */}
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Treatment Plan
          </h4>
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
              fontSize: "15px",
              color: record.treatmentPlan ? "#1f2937" : "#9ca3af",
              whiteSpace: "pre-wrap",
            }}
          >
            {record.treatmentPlan || "No specific treatment plan provided."}
          </div>
        </div>
      </div>

      {/* Metadata & Audit Footer */}
      <div style={{ fontSize: "13px", color: "#6b7280", display: "flex", gap: "20px", flexWrap: "wrap", padding: "12px 0" }}>
        <div>
          <strong>Created By:</strong> {record.createdByName || "System"}
        </div>
        <div>
          <strong>Created At:</strong> {record.createdAt ? new Date(record.createdAt).toLocaleString() : "N/A"}
        </div>
        <div>
          <strong>Last Updated:</strong> {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "N/A"}
        </div>
      </div>
    </div>
  );
}

export default MedicalRecordDetails;
