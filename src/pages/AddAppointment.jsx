import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getPatients } from "../services/patientService";
import { getDoctors } from "../services/doctorService";
import { createAppointment } from "../services/appointmentService";

function AddAppointment() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
    status: "Scheduled",
  });

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        setError("");

        const [patientsData, doctorsData] = await Promise.all([
          getPatients(),
          getDoctors(),
        ]);

        setPatients(patientsData);
        setDoctors(doctorsData);
      } catch (error) {
        console.warn(
          "API not reachable for appointment form data:",
          error.message
        );

        setError(
          error.message ||
            "Failed to load patients and doctors."
        );
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
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

    if (!formData.appointmentDate) {
      setError("Please select an appointment date.");
      return;
    }

    if (!formData.appointmentTime) {
      setError("Please select an appointment time.");
      return;
    }

    try {
      setSaving(true);

      await createAppointment(formData);

      navigate("/appointments");
    } catch (error) {
      console.warn(
        "Error creating appointment:",
        error.message
      );

      setError(
        error.message ||
          "Failed to create appointment. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <h2>Add Appointment</h2>

          <p>
            Create a new patient appointment.
          </p>
        </div>

        <section className="dashboard-section">
          <div className="empty-state">
            <p>Loading patients and doctors...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Add Appointment</h2>

        <p>
          Create a new patient appointment.
        </p>
      </div>

      <section className="dashboard-section">
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label
                htmlFor="patientId"
                className="form-label"
              >
                Patient
              </label>

              <select
                id="patientId"
                name="patientId"
                value={formData.patientId}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select Patient
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.patientId} - {patient.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label
                htmlFor="doctorId"
                className="form-label"
              >
                Doctor
              </label>

              <select
                id="doctorId"
                name="doctorId"
                value={formData.doctorId}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select Doctor
                </option>

                {doctors.map((doctor) => (
                  <option
                    key={doctor.id}
                    value={doctor.id}
                  >
                    {doctor.doctorId} - {doctor.name} (
                    {doctor.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label
                htmlFor="appointmentDate"
                className="form-label"
              >
                Appointment Date
              </label>

              <input
                id="appointmentDate"
                type="date"
                name="appointmentDate"
                value={formData.appointmentDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label
                htmlFor="appointmentTime"
                className="form-label"
              >
                Appointment Time
              </label>

              <input
                id="appointmentTime"
                type="time"
                name="appointmentTime"
                value={formData.appointmentTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label
                htmlFor="status"
                className="form-label"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Scheduled">
                  Scheduled
                </option>

                <option value="Confirmed">
                  Confirmed
                </option>

                <option value="Completed">
                  Completed
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            <div className="form-group">
              <label
                htmlFor="reason"
                className="form-label"
              >
                Reason
              </label>

              <input
                id="reason"
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Enter appointment reason"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Appointment"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate("/appointments")
              }
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

export default AddAppointment;