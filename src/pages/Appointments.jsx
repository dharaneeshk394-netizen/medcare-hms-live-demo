import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { downloadExport } from "../utils/exportUtils";
import {
  deleteAppointment,
  getAppointments,
} from "../services/appointmentService";

function Appointments() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExportAppointments = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      setExportError("");
      const url = `/api/v1/appointments/export`;
      const defaultFilename = `medcare-appointments-${new Date().toISOString().split("T")[0]}.csv`;
      await downloadExport(url, defaultFilename);
    } catch (err) {
      console.error("Failed to export appointments:", err);
      setExportError(err.message || "Failed to export appointments CSV.");
    } finally {
      setExporting(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const data = await getAppointments();

      setAppointments(data);
      setError("");
    } catch (error) {
      console.warn("API connection failed for appointments:", error.message);

      setError(
        error.message || "Failed to load appointments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this appointment?"
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setError("");

      await deleteAppointment(id);

      setAppointments((previousAppointments) =>
        previousAppointments.filter(
          (appointment) => appointment.id !== id
        )
      );
    } catch (error) {
      console.warn("Error deleting appointment:", error.message);

      setError(
        error.message ||
          "Failed to delete appointment. Please try again."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) {
      return "-";
    }

    const [hours, minutes] = time.split(":");

    const date = new Date();

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Appointments</h2>
          <p>Schedule and manage patient appointments.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportAppointments}
            disabled={loading || exporting}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Export all appointments to CSV"
          >
            <Icon name="download" size={15} /> {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/appointments/add")}
            id="add-appointment-btn"
          >
            + Add Appointment
          </button>
        </div>
      </div>

      {exportError && (
        <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
          <Icon name="warning" size={16} inline style={{ marginRight: "6px" }} />
          {exportError}
        </div>
      )}

      {error && (
        <div className="alert-banner alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="small-button secondary-button"
            onClick={loadAppointments}
          >
            Retry
          </button>
        </div>
      )}

      <section className="dashboard-section">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <p>Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <p>No appointments found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      {appointment.appointmentId}
                    </td>

                    <td>
                      <strong>
                        {appointment.patientName}
                      </strong>
                    </td>

                    <td>
                      {appointment.doctorName}
                    </td>

                    <td>
                      {appointment.specialization || "-"}
                    </td>

                    <td>
                      {formatDate(
                        appointment.appointmentDate
                      )}
                    </td>

                    <td>
                      {formatTime(
                        appointment.appointmentTime
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        status={appointment.status}
                      />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          navigate(
                            `/appointments/edit/${appointment.id}`
                          )
                        }
                      >
                        Edit
                      </button>

                      {user?.role === "admin" && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            handleDelete(appointment.id)
                          }
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export default Appointments;