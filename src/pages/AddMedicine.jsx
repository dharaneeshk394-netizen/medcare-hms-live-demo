import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMedicine } from "../services/pharmacyService";

function AddMedicine() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    genericName: "",
    category: "",
    dosageForm: "",
    strength: "",
    unitPrice: "",
    reorderLevel: "10",
    status: "ACTIVE",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    "Antibiotic",
    "Analgesic",
    "Antiviral",
    "Cardiovascular",
    "Antihistamine",
    "Antacid",
    "Antidiabetic",
    "General",
    "Other",
  ];

  const dosageForms = [
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Ointment",
    "Drops",
    "Inhaler",
    "Other",
  ];

  const statuses = ["ACTIVE", "INACTIVE", "DISCONTINUED"];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    setSubmitError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Medicine name is required.";
    }

    if (!formData.category) {
      newErrors.category = "Category is required.";
    }

    if (!formData.dosageForm) {
      newErrors.dosageForm = "Dosage form is required.";
    }

    if (formData.unitPrice === "" || formData.unitPrice === null || formData.unitPrice === undefined) {
      newErrors.unitPrice = "Unit price is required.";
    } else {
      const price = parseFloat(formData.unitPrice);
      if (Number.isNaN(price) || price < 0) {
        newErrors.unitPrice = "Unit price must be a non-negative number.";
      }
    }

    if (formData.reorderLevel !== "" && formData.reorderLevel !== null && formData.reorderLevel !== undefined) {
      const reorder = parseInt(formData.reorderLevel, 10);
      if (Number.isNaN(reorder) || reorder < 0) {
        newErrors.reorderLevel = "Reorder level must be a non-negative integer.";
      }
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

      const payload = {
        name: formData.name.trim(),
        genericName: formData.genericName.trim() || null,
        category: formData.category,
        dosageForm: formData.dosageForm,
        strength: formData.strength.trim() || null,
        unitPrice: parseFloat(formData.unitPrice),
        reorderLevel: formData.reorderLevel !== "" ? parseInt(formData.reorderLevel, 10) : 10,
        status: formData.status || "ACTIVE",
      };

      await createMedicine(payload);
      navigate("/pharmacy");
    } catch (err) {
      console.error("Error creating medicine:", err);
      setSubmitError(
        err.message || "Failed to create medicine. Please check your inputs and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <h2>Add Medicine</h2>
        <p>Register a new medicine entry in the pharmacy catalog.</p>
      </div>

      <section className="dashboard-section">
        {submitError && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "20px",
              backgroundColor: "#fee2e2",
              border: "1px solid #f87171",
              borderRadius: "6px",
              color: "#991b1b",
              fontSize: "14px",
            }}
          >
            <strong>Error: </strong> {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* Medicine Name */}
            <div className="form-field">
              <label htmlFor="name">Medicine Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Amoxicillin 500mg"
                disabled={isSubmitting}
              />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            {/* Generic Name */}
            <div className="form-field">
              <label htmlFor="genericName">Generic Name</label>
              <input
                id="genericName"
                name="genericName"
                type="text"
                value={formData.genericName}
                onChange={handleChange}
                placeholder="e.g. Amoxicillin Trihydrate"
                disabled={isSubmitting}
              />
            </div>

            {/* Category */}
            <div className="form-field">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <p className="form-error">{errors.category}</p>}
            </div>

            {/* Dosage Form */}
            <div className="form-field">
              <label htmlFor="dosageForm">Dosage Form *</label>
              <select
                id="dosageForm"
                name="dosageForm"
                value={formData.dosageForm}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">Select Dosage Form</option>
                {dosageForms.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
              {errors.dosageForm && <p className="form-error">{errors.dosageForm}</p>}
            </div>

            {/* Strength */}
            <div className="form-field">
              <label htmlFor="strength">Strength / Dosage</label>
              <input
                id="strength"
                name="strength"
                type="text"
                value={formData.strength}
                onChange={handleChange}
                placeholder="e.g. 500mg, 10mg/ml"
                disabled={isSubmitting}
              />
            </div>

            {/* Unit Price */}
            <div className="form-field">
              <label htmlFor="unitPrice">Unit Price ($) *</label>
              <input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.unitPrice && <p className="form-error">{errors.unitPrice}</p>}
            </div>

            {/* Reorder Level */}
            <div className="form-field">
              <label htmlFor="reorderLevel">Reorder Threshold (Units)</label>
              <input
                id="reorderLevel"
                name="reorderLevel"
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={handleChange}
                placeholder="10"
                disabled={isSubmitting}
              />
              {errors.reorderLevel && <p className="form-error">{errors.reorderLevel}</p>}
            </div>

            {/* Status */}
            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Medicine"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/pharmacy")}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddMedicine;
