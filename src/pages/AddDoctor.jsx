import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createDoctor } from "../services/doctorService";

function AddDoctor() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    phone: "",
    email: "",
    department: "",
    status: "Active",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setSubmitError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Doctor name is required.";
    }

    if (!formData.specialization.trim()) {
      newErrors.specialization =
        "Specialization is required.";
    }

    if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone =
        "Enter a valid 10-digit phone number.";
    }

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (!formData.department.trim()) {
      newErrors.department =
        "Department is required.";
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitError("");

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      await createDoctor({
        name: formData.name.trim(),
        specialization: formData.specialization.trim(),
        phone: formData.phone,
        email: formData.email.trim(),
        department: formData.department.trim(),
        status: formData.status,
      });

      navigate("/doctors");
    } catch (error) {
      console.warn("Error creating doctor:", error.message);

      setSubmitError(
        error.message ||
          "Failed to create doctor. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <h2>Add Doctor</h2>

        <p>
          Create a new doctor record.
        </p>
      </div>

      <section className="dashboard-section">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">
                Doctor Name *
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter doctor name"
                disabled={isSubmitting}
              />

              {errors.name && (
                <p className="form-error">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="specialization">
                Specialization *
              </label>

              <input
                id="specialization"
                name="specialization"
                type="text"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="Enter specialization"
                disabled={isSubmitting}
              />

              {errors.specialization && (
                <p className="form-error">
                  {errors.specialization}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="phone">
                Phone *
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit phone"
                disabled={isSubmitting}
              />

              {errors.phone && (
                <p className="form-error">
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="doctor@example.com"
                disabled={isSubmitting}
              />

              {errors.email && (
                <p className="form-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="department">
                Department *
              </label>

              <input
                id="department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter department"
                disabled={isSubmitting}
              />

              {errors.department && (
                <p className="form-error">
                  {errors.department}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="status">
                Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          {submitError && (
            <p className="form-error">
              {submitError}
            </p>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/doctors")}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Adding Doctor..."
                : "Add Doctor"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddDoctor;