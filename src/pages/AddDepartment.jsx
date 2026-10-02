import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createDepartment } from "../services/departmentService";

function AddDepartment() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setLoading(true);

      await createDepartment({
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      });

      navigate("/departments");
    } catch (error) {
      console.warn(
        "Error creating department:",
        error.message
      );

      setError(
        error.message ||
          "Failed to create department. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <h2>Add Department</h2>

        <p>
          Add a new department to the hospital.
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : "Save Department"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate("/departments")
              }
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddDepartment;