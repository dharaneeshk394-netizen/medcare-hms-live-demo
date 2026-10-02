import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getDoctorById,
  updateDoctor,
} from "../services/doctorService";

function EditDoctor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDoctor() {
      try {
        setIsLoading(true);
        setLoadError("");

        const doctor = await getDoctorById(id);

        if (!isMounted) {
          return;
        }

        if (!doctor) {
          setLoadError("Doctor not found.");
          setFormData(null);
          return;
        }

        setFormData({
          name: doctor.name || "",
          specialization: doctor.specialization || "",
          phone: doctor.phone || "",
          email: doctor.email || "",
          department: doctor.department || "",
          status: doctor.status || "Active",
        });
      } catch (error) {
        console.warn("Error loading doctor:", error.message);

        if (isMounted) {
          setLoadError(
            error.message ||
              "Failed to load doctor."
          );

          setFormData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDoctor();

    return () => {
      isMounted = false;
    };
  }, [id]);

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

      await updateDoctor(id, {
        name: formData.name.trim(),
        specialization: formData.specialization.trim(),
        phone: formData.phone,
        email: formData.email.trim(),
        department: formData.department.trim(),
        status: formData.status,
      });

      navigate("/doctors");
    } catch (error) {
      console.warn("Error updating doctor:", error.message);

      setSubmitError(
        error.message ||
          "Failed to update doctor. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-section">
        <h2>Loading Doctor...</h2>

        <p>
          Please wait while the doctor record is
          loaded.
        </p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="dashboard-section">
        <h2>Doctor not found</h2>

        <p>
          {loadError ||
            "The requested doctor could not be found."}
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("/doctors")}
        >
          Back to Doctors
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Edit Doctor</h2>

        <p>
          Update the doctor record.
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
                ? "Saving Changes..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default EditDoctor;