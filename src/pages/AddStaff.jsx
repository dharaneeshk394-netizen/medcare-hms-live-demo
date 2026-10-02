import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createStaff } from "../services/staffService";
import { getDepartments } from "../services/departmentService";

function AddStaff() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    designation: "",
    departmentId: "",
    phone: "",
    email: "",
    dateOfJoining: today,
    employmentStatus: "ACTIVE",
  });

  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDepts() {
      try {
        const response = await getDepartments();
        if (!isMounted) return;
        const list = Array.isArray(response) ? response : response?.data || [];
        setDepartments(list);
      } catch (err) {
        console.warn("Failed to load departments:", err);
      }
    }
    loadDepts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
    setSubmitError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    } else if (formData.firstName.trim().length > 50) {
      newErrors.firstName = "First name must not exceed 50 characters.";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    } else if (formData.lastName.trim().length > 50) {
      newErrors.lastName = "Last name must not exceed 50 characters.";
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required.";
    } else if (formData.designation.trim().length > 100) {
      newErrors.designation = "Designation must not exceed 100 characters.";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      newErrors.phone = "Enter a valid 10-digit phone number.";
    }

    if (formData.email && formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = "Enter a valid email address.";
      } else if (formData.email.trim().length > 150) {
        newErrors.email = "Email must not exceed 150 characters.";
      }
    }

    if (!formData.dateOfJoining) {
      newErrors.dateOfJoining = "Date of joining is required.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await createStaff({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        designation: formData.designation.trim(),
        departmentId: formData.departmentId ? Number(formData.departmentId) : null,
        phone: formData.phone.trim(),
        email: formData.email ? formData.email.trim() : null,
        dateOfJoining: formData.dateOfJoining,
        employmentStatus: formData.employmentStatus,
      });

      navigate("/staff");
    } catch (err) {
      console.warn("Error creating staff:", err.message);
      if (err.data?.errors && Array.isArray(err.data.errors)) {
        const backendErrors = {};
        err.data.errors.forEach((errItem) => {
          if (errItem.field) {
            backendErrors[errItem.field] = errItem.message;
          }
        });
        setErrors(backendErrors);
      }
      setSubmitError(err.message || "Failed to create staff member. Please check details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <h2>Add Staff Member</h2>
        <p>Register a new hospital staff member into the system.</p>
      </div>

      <section className="dashboard-section">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* First Name */}
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
                placeholder="e.g. Sarah"
                disabled={isSubmitting}
                required
              />
              {errors.firstName && <p className="form-error">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
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
                placeholder="e.g. Connor"
                disabled={isSubmitting}
                required
              />
              {errors.lastName && <p className="form-error">{errors.lastName}</p>}
            </div>

            {/* Designation */}
            <div className="form-field">
              <label htmlFor="designation">
                Designation / Role *
              </label>
              <input
                id="designation"
                name="designation"
                type="text"
                value={formData.designation}
                onChange={handleChange}
                placeholder="e.g. Senior Registered Nurse, Radiologist..."
                disabled={isSubmitting}
                required
              />
              {errors.designation && <p className="form-error">{errors.designation}</p>}
            </div>

            {/* Department */}
            <div className="form-field">
              <label htmlFor="departmentId">
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">-- None / General Hospital --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && <p className="form-error">{errors.departmentId}</p>}
            </div>

            {/* Phone */}
            <div className="form-field">
              <label htmlFor="phone">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                disabled={isSubmitting}
                required
              />
              {errors.phone && <p className="form-error">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div className="form-field">
              <label htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="staff.member@hospital.com"
                disabled={isSubmitting}
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            {/* Date of Joining */}
            <div className="form-field">
              <label htmlFor="dateOfJoining">
                Date of Joining *
              </label>
              <input
                id="dateOfJoining"
                name="dateOfJoining"
                type="date"
                value={formData.dateOfJoining}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
              {errors.dateOfJoining && <p className="form-error">{errors.dateOfJoining}</p>}
            </div>

            {/* Employment Status */}
            <div className="form-field">
              <label htmlFor="employmentStatus">
                Employment Status *
              </label>
              <select
                id="employmentStatus"
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              {errors.employmentStatus && <p className="form-error">{errors.employmentStatus}</p>}
            </div>
          </div>

          {submitError && (
            <p className="form-error" style={{ marginTop: "16px" }}>
              {submitError}
            </p>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/staff")}
              disabled={isSubmitting}
              id="cancel-add-staff-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
              id="submit-add-staff-button"
            >
              {isSubmitting ? "Adding Staff..." : "Add Staff Member"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddStaff;
