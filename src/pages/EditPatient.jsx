import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getPatientById,
  updatePatient,
} from "../services/patientService";

function EditPatient() {
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

    async function loadPatient() {
      try {
        setIsLoading(true);
        setLoadError("");

        const patient = await getPatientById(id);

        if (!isMounted) {
          return;
        }

        if (!patient) {
          setLoadError("Patient not found.");
          setFormData(null);
          return;
        }

        /*
         * The backend stores one "name" field.
         * The frontend form uses firstName and lastName.
         * Split the backend name for the form.
         */
        const nameParts = patient.name
          ? patient.name.trim().split(/\s+/)
          : [];

        const firstName = nameParts.shift() || "";
        const lastName = nameParts.join(" ");

        setFormData({
          firstName,
          lastName,
          age: String(patient.age ?? ""),
          gender: patient.gender || "",
          phone: patient.phone || "",
          email: patient.email || "",
          bloodGroup: patient.bloodGroup || "",
          status: patient.status || "Active",
        });
      } catch (error) {
        console.warn("Error loading patient:", error.message);

        if (isMounted) {
          setLoadError(
            error.message ||
              "Failed to load patient."
          );
          setFormData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPatient();

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

    if (!formData.firstName.trim()) {
      newErrors.firstName =
        "First name is required.";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName =
        "Last name is required.";
    }

    if (!formData.age) {
      newErrors.age = "Age is required.";
    } else if (
      Number(formData.age) < 1 ||
      Number(formData.age) > 120
    ) {
      newErrors.age =
        "Enter an age between 1 and 120.";
    }

    if (!formData.gender) {
      newErrors.gender =
        "Gender is required.";
    }

    if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone =
        "Enter a valid 10-digit phone number.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (!formData.bloodGroup) {
      newErrors.bloodGroup =
        "Blood group is required.";
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

      /*
       * Convert the frontend form structure:
       *
       * firstName + lastName
       *
       * into the backend structure:
       *
       * name
       */
      const patientData = {
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        age: Number(formData.age),
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        bloodGroup: formData.bloodGroup,
        status: formData.status,
      };

      await updatePatient(id, patientData);

      navigate("/patients");
    } catch (error) {
      console.warn("Error updating patient:", error.message);

      setSubmitError(
        error.message ||
          "Failed to update patient. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-section">
        <h2>Loading Patient...</h2>

        <p>
          Please wait while the patient record is
          loaded.
        </p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="dashboard-section">
        <h2>Patient not found</h2>

        <p>
          {loadError ||
            "The requested patient could not be found."}
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("/patients")}
        >
          Back to Patients
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Edit Patient</h2>

        <p>
          Update the patient record.
        </p>
      </div>

      <section className="dashboard-section">
        <form
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="firstName">
                First Name *
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isSubmitting}
              />

              {errors.firstName && (
                <p className="form-error">
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="lastName">
                Last Name *
              </label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isSubmitting}
              />

              {errors.lastName && (
                <p className="form-error">
                  {errors.lastName}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="age">
                Age *
              </label>

              <input
                id="age"
                name="age"
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                disabled={isSubmitting}
              />

              {errors.age && (
                <p className="form-error">
                  {errors.age}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="gender">
                Gender *
              </label>

              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">
                  Select gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>
              </select>

              {errors.gender && (
                <p className="form-error">
                  {errors.gender}
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
                Email *
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
              <label htmlFor="bloodGroup">
                Blood Group *
              </label>

              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">
                  Select blood group
                </option>

                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>

              {errors.bloodGroup && (
                <p className="form-error">
                  {errors.bloodGroup}
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
              onClick={() =>
                navigate("/patients")
              }
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

export default EditPatient;