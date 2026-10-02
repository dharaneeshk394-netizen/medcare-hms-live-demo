import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getPatients } from "../services/patientService";
import { getDoctors } from "../services/doctorService";
import {
  getAppointmentById,
  updateAppointment,
} from "../services/appointmentService";

function EditAppointment() {
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
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
    status: "Scheduled",
  });

  useEffect(() => {
    const loadAppointmentData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          appointmentData,
          patientsData,
          doctorsData,
        ] = await Promise.all([
          getAppointmentById(id),
          getPatients(),
          getDoctors(),
        ]);

        setPatients(patientsData);
        setDoctors(doctorsData);

        setFormData({
          patientId: String(
            appointmentData.patientId
          ),
          doctorId: String(
            appointmentData.doctorId
          ),
          appointmentDate:
            appointmentData.appointmentDate
              ? appointmentData.appointmentDate.slice(
                  0,
                  10
                )
              : "",
          appointmentTime:
            appointmentData.appointmentTime
              ? appointmentData.appointmentTime.slice(
                  0,
                  5
                )
              : "",
          reason: appointmentData.reason || "",
          status:
            appointmentData.status || "Scheduled",
        });
      } catch (error) {
        console.warn(
          "Error loading appointment:",
          error.message
        );

        setError(
          error.message ||
            "Failed to load appointment."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAppointmentData();
  }, [id]);

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
      setError(
        "Please select an appointment date."
      );
      return;
    }

    if (!formData.appointmentTime) {
      setError(
        "Please select an appointment time."
      );
      return;
    }

    try {
      setSaving(true);

      await updateAppointment(id, formData);

      navigate("/appointments");
    } catch (error) {
      console.warn(
        "Error updating appointment:",
        error.message
      );

      setError(
        error.message ||
          "Failed to update appointment. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <h2>Edit Appointment</h2>

          <p>
            Update the appointment details.
          </p>
        </div>

        <section className="dashboard-section">
          <div className="empty-state">
            <p>
              Loading appointment details...
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (error && !formData.patientId) {
    return (
      <div>
        <div className="page-heading">
          <h2>Edit Appointment</h2>

          <p>
            Update the appointment details.
          </p>
        </div>

        <section className="dashboard-section">
          <p className="form-error">
            {error}
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate("/appointments")
              }
            >
              Back to Appointments
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Edit Appointment</h2>

        <p>
          Update the appointment details.
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
                    {patient.patientId} -{" "}
                    {patient.name}
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
                    {doctor.doctorId} -{" "}
                    {doctor.name} (
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
                ? "Updating..."
                : "Update Appointment"}
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

export default EditAppointment;