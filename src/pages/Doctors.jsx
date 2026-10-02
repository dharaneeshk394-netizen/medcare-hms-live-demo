import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import {
  deleteDoctor,
  getDoctors,
} from "../services/doctorService";

function Doctors() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDoctors = async () => {
    try {
      const data = await getDoctors();

      setDoctors(data);
      setError("");
    } catch (error) {
      console.warn("API connection failed for doctors:", error.message);

      setError(
        error.message || "Failed to load doctors"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this doctor?"
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setError("");

      await deleteDoctor(id);

      setDoctors((previousDoctors) =>
        previousDoctors.filter(
          (doctor) => doctor.id !== id
        )
      );
    } catch (error) {
      console.warn("Failed to delete doctor:", error.message);

      setError(
        error.message ||
          "Failed to delete doctor. Please try again."
      );
    }
  };

  return (
    <div>
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Doctors</h2>
          <p>View and manage hospital doctors and their specializations.</p>
        </div>
        {user?.role === "admin" && (
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/doctors/add")}
            id="add-doctor-btn"
          >
            + Add Doctor
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="small-button secondary-button"
            onClick={loadDoctors}
          >
            Retry
          </button>
        </div>
      )}

      <section className="dashboard-section">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <p>Loading doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="empty-state">
              <p>No doctors found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Doctor ID</th>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>{doctor.doctorId}</td>

                    <td>
                      <strong>{doctor.name}</strong>
                    </td>

                    <td>
                      {doctor.specialization}
                    </td>

                    <td>
                      {doctor.department || "-"}
                    </td>

                    <td>{doctor.phone}</td>

                    <td>
                      <StatusBadge
                        status={doctor.status}
                      />
                    </td>

                    <td>
                      {user?.role === "admin" ? (
                        <>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              navigate(
                                `/doctors/edit/${doctor.id}`
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              handleDelete(doctor.id)
                            }
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        "-"
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

export default Doctors;