import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMedicines, addBatch } from "../services/pharmacyService";

function AddBatch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedMedId = searchParams.get("medicineId") || "";

  // Medicine list state
  const [medicines, setMedicines] = useState([]);
  const [loadingMedicines, setLoadingMedicines] = useState(true);
  const [medicinesError, setMedicinesError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    medicineId: preselectedMedId,
    batchNumber: "",
    quantity: "",
    expiryDate: "",
    purchasePrice: "0",
    sellingPrice: "",
    supplierName: "",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Today's date in YYYY-MM-DD format for min date attribute
  const todayStr = new Date().toISOString().split("T")[0];

  // Load active medicines on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchMedicines() {
      try {
        setLoadingMedicines(true);
        setMedicinesError("");
        const list = await getMedicines({ status: "ACTIVE" });
        if (isMounted) {
          setMedicines(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load active medicines:", err);
          setMedicinesError(
            err.message || "Failed to load medicine list. Please refresh the page."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingMedicines(false);
        }
      }
    }

    fetchMedicines();

    return () => {
      isMounted = false;
    };
  }, []);

  // When medicine list loads or preselectedMedId changes, auto-fill sellingPrice if empty
  useEffect(() => {
    if (formData.medicineId && medicines.length > 0 && !formData.sellingPrice) {
      const selected = medicines.find(
        (m) => String(m.id) === String(formData.medicineId)
      );
      if (selected && selected.unitPrice !== undefined) {
        setFormData((prev) => ({
          ...prev,
          sellingPrice: typeof selected.unitPrice === "number" ? selected.unitPrice.toFixed(2) : String(selected.unitPrice),
        }));
      }
    }
  }, [formData.medicineId, medicines, formData.sellingPrice]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // If user selected a different medicine and selling price is not manually customized yet
      if (name === "medicineId" && value) {
        const selected = medicines.find((m) => String(m.id) === String(value));
        if (selected && selected.unitPrice !== undefined) {
          updated.sellingPrice = typeof selected.unitPrice === "number" ? selected.unitPrice.toFixed(2) : String(selected.unitPrice);
        }
      }

      return updated;
    });

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

    const medIdNum = Number(formData.medicineId);
    if (!formData.medicineId || !Number.isInteger(medIdNum) || medIdNum <= 0) {
      newErrors.medicineId = "Please select a valid medicine from the list.";
    }

    if (!formData.batchNumber.trim()) {
      newErrors.batchNumber = "Batch number is required.";
    }

    if (formData.quantity === "" || formData.quantity === null || formData.quantity === undefined) {
      newErrors.quantity = "Batch quantity is required.";
    } else {
      const qty = parseInt(formData.quantity, 10);
      if (Number.isNaN(qty) || qty < 0) {
        newErrors.quantity = "Quantity must be a non-negative integer (0 or more).";
      }
    }

    if (!formData.expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(formData.expiryDate.trim())) {
      newErrors.expiryDate = "Valid expiry date in YYYY-MM-DD format is required.";
    }

    if (formData.purchasePrice !== "" && formData.purchasePrice !== null && formData.purchasePrice !== undefined) {
      const pPrice = parseFloat(formData.purchasePrice);
      if (Number.isNaN(pPrice) || pPrice < 0) {
        newErrors.purchasePrice = "Purchase price must be a non-negative number.";
      }
    }

    if (formData.sellingPrice === "" || formData.sellingPrice === null || formData.sellingPrice === undefined) {
      newErrors.sellingPrice = "Selling price is required.";
    } else {
      const sPrice = parseFloat(formData.sellingPrice);
      if (Number.isNaN(sPrice) || sPrice < 0) {
        newErrors.sellingPrice = "Selling price must be a non-negative number.";
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
        medicineId: parseInt(formData.medicineId, 10),
        batchNumber: formData.batchNumber.trim().toUpperCase(),
        quantity: parseInt(formData.quantity, 10),
        expiryDate: formData.expiryDate.trim(),
        purchasePrice: formData.purchasePrice !== "" ? parseFloat(formData.purchasePrice) : 0,
        sellingPrice: parseFloat(formData.sellingPrice),
        supplierName: formData.supplierName.trim() || null,
      };

      await addBatch(payload);
      navigate("/pharmacy");
    } catch (err) {
      console.error("Error adding inventory batch:", err);
      if (err.status === 409 || (err.message && err.message.toLowerCase().includes("already exists"))) {
        setSubmitError(`Batch '${formData.batchNumber.trim().toUpperCase()}' already exists for this medicine. Please use a unique batch number.`);
      } else {
        setSubmitError(err.message || "Failed to add inventory batch. Please verify inputs and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <h2>Add Inventory Batch</h2>
        <p>Record a new shipment or batch of medicines into stock.</p>
      </div>

      <section className="dashboard-section">
        {/* Error Alert Banner */}
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

        {medicinesError && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "20px",
              backgroundColor: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: "6px",
              color: "#92400e",
              fontSize: "14px",
            }}
          >
            <strong>Warning: </strong> {medicinesError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* Medicine Selector */}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="medicineId">Select Medicine *</label>
              <select
                id="medicineId"
                name="medicineId"
                value={formData.medicineId}
                onChange={handleChange}
                disabled={isSubmitting || loadingMedicines}
              >
                <option value="">
                  {loadingMedicines
                    ? "Loading active medicine catalog..."
                    : medicines.length === 0
                    ? "No active medicines available"
                    : "Select a medicine from catalog"}
                </option>
                {medicines.map((med) => {
                  const code = med.medicineCode || `MED-${String(med.id).padStart(6, "0")}`;
                  const stockLabel = `Stock: ${med.totalStock ?? 0}`;
                  const genLabel = med.genericName ? ` (${med.genericName})` : "";
                  return (
                    <option key={med.id} value={med.id}>
                      [{code}] {med.name}{genLabel} - {stockLabel}
                    </option>
                  );
                })}
              </select>
              {errors.medicineId && <p className="form-error">{errors.medicineId}</p>}
            </div>

            {/* Batch Number */}
            <div className="form-field">
              <label htmlFor="batchNumber">Batch Number *</label>
              <input
                id="batchNumber"
                name="batchNumber"
                type="text"
                value={formData.batchNumber}
                onChange={handleChange}
                placeholder="e.g. BAT-2026-001"
                disabled={isSubmitting}
              />
              {errors.batchNumber && <p className="form-error">{errors.batchNumber}</p>}
            </div>

            {/* Quantity */}
            <div className="form-field">
              <label htmlFor="quantity">Quantity Received (Units) *</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g. 100"
                disabled={isSubmitting}
              />
              {errors.quantity && <p className="form-error">{errors.quantity}</p>}
            </div>

            {/* Expiry Date */}
            <div className="form-field">
              <label htmlFor="expiryDate">Expiry Date *</label>
              <input
                id="expiryDate"
                name="expiryDate"
                type="date"
                min={todayStr}
                value={formData.expiryDate}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.expiryDate && <p className="form-error">{errors.expiryDate}</p>}
            </div>

            {/* Purchase Price */}
            <div className="form-field">
              <label htmlFor="purchasePrice">Purchase Cost / Unit ($)</label>
              <input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.purchasePrice && <p className="form-error">{errors.purchasePrice}</p>}
            </div>

            {/* Selling Price */}
            <div className="form-field">
              <label htmlFor="sellingPrice">Selling Price / Unit ($) *</label>
              <input
                id="sellingPrice"
                name="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.sellingPrice && <p className="form-error">{errors.sellingPrice}</p>}
            </div>

            {/* Supplier Name */}
            <div className="form-field">
              <label htmlFor="supplierName">Supplier / Distributor</label>
              <input
                id="supplierName"
                name="supplierName"
                type="text"
                value={formData.supplierName}
                onChange={handleChange}
                placeholder="e.g. PharmaCorp Supplies Ltd"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting || loadingMedicines}
            >
              {isSubmitting ? "Adding Batch..." : "Add Batch"}
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

export default AddBatch;
