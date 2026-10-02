import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getPatients } from "../services/patientService";
import { getDoctors } from "../services/doctorService";
import { getAppointments } from "../services/appointmentService";
import { createMedicalRecord } from "../services/medicalRecordService";

function AddMedicalRecord() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Form State
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    appointmentId: "",
    recordDate: today,
    recordType: "General",
    chiefComplaint: "",
    diagnosis: "",
    clinicalNotes: "",
    treatmentPlan: "",
  });

  // Dependent data lists
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // UI / Async State
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const isDoctorRole = user?.role === "doctor";
  const userDoctorId = user?.doctorId || user?.doctor_id;

  // Load dropdown data
  useEffect(() => {
    let isMounted = true;

    const loadFormData = async () => {
      try {
        setLoadingData(true);
        setSubmitError("");

        const [patientsRes, doctorsRes, appointmentsRes] = await Promise.allSettled([
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
        }

        let doctorsList = [];
        if (doctorsRes.status === "fulfilled") {
          doctorsList = Array.isArray(doctorsRes.value)
            ? doctorsRes.value
            : doctorsRes.value?.data || [];
          setDoctors(doctorsList);
        }

        if (appointmentsRes.status === "fulfilled") {
          const apptsList = Array.isArray(appointmentsRes.value)
            ? appointmentsRes.value
            : appointmentsRes.value?.data || [];
          setAppointments(apptsList);
        }

        // Auto-select doctor if logged-in user is a doctor
        if (isDoctorRole && userDoctorId) {
          const matchedDoctor = doctorsList.find(
            (d) => Number(d.id) === Number(userDoctorId) || String(d.doctorId) === String(userDoctorId)
          );
          if (matchedDoctor) {
            setFormData((prev) => ({ ...prev, doctorId: String(matchedDoctor.id) }));
          } else {
            setFormData((prev) => ({ ...prev, doctorId: String(userDoctorId) }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setSubmitError(err.message || "Failed to load dropdown options");
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
  }, [isDoctorRole, userDoctorId]);

  // Filter appointments when patient is selected
  const availableAppointments = useMemo(() => {
    if (!formData.patientId) return appointments;
    return appointments.filter(
      (a) => Number(a.patientId || a.patient_id) === Number(formData.patientId)
    );
  }, [appointments, formData.patientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // If patient changes, reset appointment if selected appointment doesn't match
      if (name === "patientId" && prev.appointmentId) {
        const appt = appointments.find((a) => Number(a.id) === Number(prev.appointmentId));
        if (appt && Number(appt.patientId || appt.patient_id) !== Number(value)) {
          updated.appointmentId = "";
        }
      }

      return updated;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.patientId) {
      errors.patientId = "Please select a patient";
    }

    if (!formData.doctorId) {
      errors.doctorId = "Please select a doctor";
    }

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
        patientId: Number(formData.patientId),
        doctorId: Number(formData.doctorId),
        appointmentId: formData.appointmentId ? Number(formData.appointmentId) : null,
        recordDate: formData.recordDate,
        recordType: formData.recordType,
        chiefComplaint: formData.chiefComplaint.trim() || null,
        diagnosis: formData.diagnosis.trim(),
        clinicalNotes: formData.clinicalNotes.trim() || null,
        treatmentPlan: formData.treatmentPlan.trim() || null,
      };

      const createdRecord = await createMedicalRecord(payload);

      if (createdRecord?.id) {
        navigate(`/medical-records/${createdRecord.id}`);
      } else {
        navigate("/medical-records");
      }
    } catch (err) {
      console.error("Failed to create medical record:", err);
      setSubmitError(
        err.message || "Failed to create medical record. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="page-container">
        <div className="loading-state" style={{ padding: "60px", textAlign: "center", color: "#6b7280" }}>
          Loading options for medical record creation...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Medical Record</h1>
          <p className="page-subtitle">
            Enter clinical assessment, chief complaint, diagnosis, and treatment plan
          </p>
        </div>

        <button
          type="button"
          className="action-button secondary-button"
          onClick={() => navigate("/medical-records")}
        >
          Cancel
        </button>
      </div>

      {/* Submit Error Banner */}
      {submitError && (
        <div className="error-banner" style={{ marginBottom: "20px" }}>
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card" id="add-medical-record-form">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* Patient Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="patientId">
              Patient <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              id="patientId"
              name="patientId"
              className={`form-control ${fieldErrors.patientId ? "is-invalid" : ""}`}
              value={formData.patientId}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.patient_id ? `(${p.patient_id})` : `(ID: ${p.id})`}
                </option>
              ))}
            </select>
            {fieldErrors.patientId && (
              <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>
                {fieldErrors.patientId}
              </span>
            )}
          </div>

          {/* Doctor Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="doctorId">
              Doctor <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              id="doctorId"
              name="doctorId"
              className={`form-control ${fieldErrors.doctorId ? "is-invalid" : ""}`}
              value={formData.doctorId}
              onChange={handleChange}
              disabled={isSubmitting || (isDoctorRole && Boolean(userDoctorId))}
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.specialization ? `- ${d.specialization}` : ""}
                </option>
              ))}
            </select>
            {fieldErrors.doctorId && (
              <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>
                {fieldErrors.doctorId}
              </span>
            )}
          </div>

          {/* Linked Appointment */}
          <div className="form-group">
            <label className="form-label" htmlFor="appointmentId">
              Linked Appointment (Optional)
            </label>
            <select
              id="appointmentId"
              name="appointmentId"
              className="form-control"
              value={formData.appointmentId}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">-- None / Direct Visit --</option>
              {availableAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  Appt #{a.appointment_id || a.id} ({a.appointmentDate || a.appointment_date || "Date N/A"}) - {a.reason || "General"}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Primary symptoms, duration, and patient-reported issues..."
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
              placeholder="Primary clinical diagnosis and ICD findings..."
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
              placeholder="Detailed examination notes, physical observations, and vital history..."
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
              placeholder="Recommended therapies, medication orders, lifestyle recommendations, and follow-up schedules..."
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
            onClick={() => navigate("/medical-records")}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="action-button primary-button"
            disabled={isSubmitting}
            id="save-medical-record-btn"
          >
            {isSubmitting ? "Saving Record..." : "Save Medical Record"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddMedicalRecord;
