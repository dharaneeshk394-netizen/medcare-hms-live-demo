import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import {
  deleteDepartment,
  getDepartments,
} from "../services/departmentService";

function Departments() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();

      setDepartments(data);
      setError("");
    } catch (error) {
      console.warn(
        "API connection failed for departments:",
        error.message
      );

      setError(
        error.message ||
          "Failed to load departments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this department?"
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setError("");

      await deleteDepartment(id);

      setDepartments(
        (previousDepartments) =>
          previousDepartments.filter(
            (department) =>
              department.id !== id
          )
      );
    } catch (error) {
      console.warn(
        "Error deleting department:",
        error.message
      );

      setError(
        error.message ||
          "Failed to delete department. Please try again."
      );
    }
  };

  return (
    <div>
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Departments</h2>
          <p>Manage hospital departments and services.</p>
        </div>
        {user?.role === "admin" && (
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/departments/add")}
            id="add-department-btn"
          >
            + Add Department
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="small-button secondary-button"
            onClick={loadDepartments}
          >
            Retry
          </button>
        </div>
      )}

      <section className="dashboard-section">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <p>
                Loading departments...
              </p>
            </div>
          ) : departments.length === 0 ? (
            <div className="empty-state">
              <p>
                No departments found.
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Department ID</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {departments.map(
                  (department) => (
                    <tr
                      key={department.id}
                    >
                      <td>
                        {
                          department.departmentId
                        }
                      </td>

                      <td>
                        <strong>
                          {department.name}
                        </strong>
                      </td>

                      <td>
                        {department.description ||
                          "-"}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            department.status
                          }
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
                                  `/departments/edit/${department.id}`
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                handleDelete(
                                  department.id
                                )
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
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export default Departments;