import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getDepartmentById,
  updateDepartment,
} from "../services/departmentService";

function EditDepartment() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDepartment() {
      try {
        setLoading(true);
        setError("");

        const department =
          await getDepartmentById(id);

        setFormData({
          name: department.name || "",
          description:
            department.description || "",
          status:
            department.status || "Active",
        });
      } catch (error) {
        console.warn(
          "Error loading department:",
          error.message
        );

        setError(
          error.message ||
            "Failed to load department."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDepartment();
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

    if (!formData.name.trim()) {
      setError("Department name is required.");
      return;
    }

    try {
      setSaving(true);

      await updateDepartment(id, {
        name: formData.name.trim(),
        description:
          formData.description.trim(),
        status: formData.status,
      });

      navigate("/departments");
    } catch (error) {
      console.warn(
        "Error updating department:",
        error.message
      );

      setError(
        error.message ||
          "Failed to update department. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <h2>Edit Department</h2>

          <p>
            Loading department information...
          </p>
        </div>

        <section className="dashboard-section">
          <p>Loading...</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Edit Department</h2>

        <p>
          Update department information.
        </p>
      </div>

      <section className="dashboard-section">
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="name">
              Department Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter department name"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter department description"
              rows="4"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">
              Status
            </label>

            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={saving}
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : "Update Department"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate("/departments")
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

export default EditDepartment;