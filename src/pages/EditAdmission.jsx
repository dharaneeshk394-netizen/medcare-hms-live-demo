import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getPatients } from "../services/patientService";
import { getDoctors } from "../services/doctorService";
import {
  getAdmissionById,
  updateAdmission,
} from "../services/admissionService";

function EditAdmission() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    admissionDate: "",
    expectedDischargeDate: "",
    actualDischargeDate: "",
    roomNumber: "",
    bedNumber: "",
    diagnosis: "",
    status: "Admitted",
  });

  useEffect(() => {
    const loadAdmissionData = async () => {
      try {
        setLoading(true);
        setError("");

        const [admissionData, patientsData, doctorsData] = await Promise.all([
          getAdmissionById(id),
          getPatients(),
          getDoctors(),
        ]);

        setPatients(Array.isArray(patientsData) ? patientsData : []);
        setDoctors(Array.isArray(doctorsData) ? doctorsData : []);

        setFormData({
          patientId: String(admissionData.patientId || ""),
          doctorId: String(admissionData.doctorId || ""),
          admissionDate: admissionData.admissionDate
            ? admissionData.admissionDate.slice(0, 10)
            : "",
          expectedDischargeDate: admissionData.expectedDischargeDate
            ? admissionData.expectedDischargeDate.slice(0, 10)
            : "",
          actualDischargeDate: admissionData.actualDischargeDate
            ? admissionData.actualDischargeDate.slice(0, 10)
            : "",
          roomNumber: admissionData.roomNumber || "",
          bedNumber: admissionData.bedNumber || "",
          diagnosis: admissionData.diagnosis || "",
          status: admissionData.status || "Admitted",
        });
      } catch (err) {
        console.warn("Error loading admission:", err.message);
        setError(err.message || "Failed to load admission details.");
      } finally {
        setLoading(false);
      }
    };

    loadAdmissionData();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.patientId) {
      setError("Please select a patient.");
      return;
    }

    if (!formData.doctorId) {
      setError("Please select a doctor.");
      return;
    }

    if (!formData.admissionDate) {
      setError("Please select an admission date.");
      return;
    }

    try {
      setSaving(true);
      await updateAdmission(id, formData);
      navigate("/admissions");
    } catch (err) {
      console.warn("Error updating admission:", err.message);
      setError(
        err.message || "Failed to update admission. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <h2>Edit Admission</h2>
          <p>Update patient admission and bed allocation details.</p>
        </div>

        <section className="dashboard-section">
          <div className="empty-state">
            <p>Loading admission details...</p>
          </div>
        </section>
      </div>
    );
  }

  if (error && !formData.patientId) {
    return (
      <div>
        <div className="page-heading">
          <h2>Edit Admission</h2>
          <p>Update patient admission and bed allocation details.</p>
        </div>

        <section className="dashboard-section">
          <p className="form-error">{error}</p>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/admissions")}
            >
              Back to Admissions
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Edit Admission</h2>
        <p>Update patient admission and bed allocation details.</p>
      </div>

      <section className="dashboard-section">
        <form onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <div className="form-grid">
            {/* Patient Selection (Required) */}
            <div className="form-group">
              <label htmlFor="patientId" className="form-label">
                Patient <span style={{ color: "#dc2626" }}>*</span>
              </label>

              <select
                id="patientId"
                name="patientId"
                value={formData.patientId}
                onChange={handleChange}
                required
              >
                <option value="">Select Patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.patientId || `P${patient.id}`} - {patient.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Selection (Required) */}
            <div className="form-group">
              <label htmlFor="doctorId" className="form-label">
                Doctor <span style={{ color: "#dc2626" }}>*</span>
              </label>

              <select
                id="doctorId"
                name="doctorId"
                value={formData.doctorId}
                onChange={handleChange}
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.doctorId || `D${doctor.id}`} - {doctor.name} (
                    {doctor.specialization || "General"})
                  </option>
                ))}
              </select>
            </div>

            {/* Admission Date (Required) */}
            <div className="form-group">
              <label htmlFor="admissionDate" className="form-label">
                Admission Date <span style={{ color: "#dc2626" }}>*</span>
              </label>

              <input
                id="admissionDate"
                type="date"
                name="admissionDate"
                value={formData.admissionDate}
                onChange={handleChange}
                required
              />
            </div>

            {/* Expected Discharge Date (Optional) */}
            <div className="form-group">
              <label htmlFor="expectedDischargeDate" className="form-label">
                Expected Discharge Date
              </label>

              <input
                id="expectedDischargeDate"
                type="date"
                name="expectedDischargeDate"
                value={formData.expectedDischargeDate}
                onChange={handleChange}
              />
            </div>

            {/* Actual Discharge Date (Optional) */}
            <div className="form-group">
              <label htmlFor="actualDischargeDate" className="form-label">
                Actual Discharge Date
              </label>

              <input
                id="actualDischargeDate"
                type="date"
                name="actualDischargeDate"
                value={formData.actualDischargeDate}
                onChange={handleChange}
              />
            </div>

            {/* Room Number (Optional) */}
            <div className="form-group">
              <label htmlFor="roomNumber" className="form-label">
                Room Number
              </label>

              <input
                id="roomNumber"
                type="text"
                name="roomNumber"
                value={formData.roomNumber}
                onChange={handleChange}
                placeholder="e.g. 302, ICU-1"
              />
            </div>

            {/* Bed Number (Optional) */}
            <div className="form-group">
              <label htmlFor="bedNumber" className="form-label">
                Bed Number
              </label>

              <input
                id="bedNumber"
                type="text"
                name="bedNumber"
                value={formData.bedNumber}
                onChange={handleChange}
                placeholder="e.g. Bed A, Bed 4"
              />
            </div>

            {/* Status (Optional) */}
            <div className="form-group">
              <label htmlFor="status" className="form-label">
                Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Admitted">Admitted</option>
                <option value="Discharged">Discharged</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>

            {/* Diagnosis (Optional) */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="diagnosis" className="form-label">
                Diagnosis
              </label>

              <input
                id="diagnosis"
                type="text"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                placeholder="Enter diagnosis or admission reason"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? "Updating..." : "Update Admission"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/admissions")}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default EditAdmission;
