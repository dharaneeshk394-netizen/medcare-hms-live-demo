import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPatients } from "../services/patientService";
import { getMedicines, getMedicineById, dispenseMedicine } from "../services/pharmacyService";

function DispenseMedicine() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedPatientId = searchParams.get("patientId") || "";
  const preselectedMedicineId = searchParams.get("medicineId") || "";
  const preselectedPrescriptionId = searchParams.get("prescriptionId") || "";

  // Data lists
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [dataError, setDataError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    patientId: preselectedPatientId,
    medicineId: preselectedMedicineId,
    batchId: "",
    quantityDispensed: "1",
    prescriptionId: preselectedPrescriptionId,
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load patients and active medicines on mount
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setLoadingData(true);
        setDataError("");

        const [patientsRes, medicinesRes] = await Promise.all([
          getPatients(),
          getMedicines({ status: "ACTIVE" }),
        ]);

        if (isMounted) {
          const patientList = Array.isArray(patientsRes)
            ? patientsRes
            : Array.isArray(patientsRes?.data)
            ? patientsRes.data
            : [];
          setPatients(patientList);

          const medList = Array.isArray(medicinesRes) ? medicinesRes : [];
          setMedicines(medList);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load dispensing options:", err);
          setDataError(
            err.message || "Failed to load patients or medicines. Please refresh the page."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch batches when selected medicine changes
  useEffect(() => {
    let isMounted = true;

    async function loadBatchesForMedicine() {
      if (!formData.medicineId) {
        setBatches([]);
        return;
      }

      try {
        setLoadingBatches(true);
        const medDetails = await getMedicineById(formData.medicineId);

        if (isMounted) {
          const today = new Date().toISOString().slice(0, 10);
          // Filter to batches that are AVAILABLE, non-depleted, and not expired
          const validBatches = (medDetails?.batches || []).filter((b) => {
            const isNotExpired = b.expiryDate ? b.expiryDate >= today : true;
            return b.status === "AVAILABLE" && b.quantityInStock > 0 && isNotExpired;
          });

          setBatches(validBatches);

          // Auto-select first batch if available and none selected yet
          if (validBatches.length > 0) {
            setFormData((prev) => ({
              ...prev,
              batchId: String(validBatches[0].id),
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              batchId: "",
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Could not load batches for medicine:", err.message);
          setBatches([]);
        }
      } finally {
        if (isMounted) {
          setLoadingBatches(false);
        }
      }
    }

    loadBatchesForMedicine();

    return () => {
      isMounted = false;
    };
  }, [formData.medicineId]);

  // Selected batch object
  const selectedBatch = batches.find((b) => String(b.id) === String(formData.batchId));
  const batchUnitPrice = selectedBatch ? parseFloat(selectedBatch.sellingPrice || 0) : 0;
  const parsedQty = parseInt(formData.quantityDispensed, 10) || 0;
  const calculatedTotal = (batchUnitPrice * (parsedQty > 0 ? parsedQty : 0)).toFixed(2);

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

    const pId = Number(formData.patientId);
    if (!formData.patientId || !Number.isInteger(pId) || pId <= 0) {
      newErrors.patientId = "Please select a patient.";
    }

    const mId = Number(formData.medicineId);
    if (!formData.medicineId || !Number.isInteger(mId) || mId <= 0) {
      newErrors.medicineId = "Please select a medicine.";
    }

    const bId = Number(formData.batchId);
    if (!formData.batchId || !Number.isInteger(bId) || bId <= 0) {
      newErrors.batchId = "Please select an available inventory batch.";
    }

    if (!formData.quantityDispensed || formData.quantityDispensed.trim() === "") {
      newErrors.quantityDispensed = "Quantity to dispense is required.";
    } else {
      const qty = parseInt(formData.quantityDispensed, 10);
      if (Number.isNaN(qty) || qty <= 0) {
        newErrors.quantityDispensed = "Quantity must be a positive integer greater than zero.";
      } else if (selectedBatch && qty > selectedBatch.quantityInStock) {
        newErrors.quantityDispensed = `Requested ${qty} units exceeds available batch stock (${selectedBatch.quantityInStock} units).`;
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
        patientId: parseInt(formData.patientId, 10),
        medicineId: parseInt(formData.medicineId, 10),
        batchId: parseInt(formData.batchId, 10),
        quantityDispensed: parseInt(formData.quantityDispensed, 10),
        prescriptionId: formData.prescriptionId ? parseInt(formData.prescriptionId, 10) : null,
        notes: formData.notes.trim() || null,
      };

      await dispenseMedicine(payload);
      navigate("/pharmacy");
    } catch (err) {
      console.error("Error dispensing medicine:", err);
      setSubmitError(
        err.message || "Failed to dispense medicine. Please check stock and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <h2>Dispense Medicine</h2>
        <p>Dispense medications directly to a patient from available inventory batches.</p>
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

        {dataError && (
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
            <strong>Warning: </strong> {dataError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* Patient Selector */}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="patientId">Select Patient *</label>
              <select
                id="patientId"
                name="patientId"
                value={formData.patientId}
                onChange={handleChange}
                disabled={isSubmitting || loadingData}
              >
                <option value="">
                  {loadingData
                    ? "Loading patient directory..."
                    : patients.length === 0
                    ? "No patients registered"
                    : "Select a patient"}
                </option>
                {patients.map((pat) => {
                  const patCode = pat.patientId || pat.patient_id || `PT-${pat.id}`;
                  return (
                    <option key={pat.id} value={pat.id}>
                      [{patCode}] {pat.name} - Phone: {pat.phone || "N/A"}
                    </option>
                  );
                })}
              </select>
              {errors.patientId && <p className="form-error">{errors.patientId}</p>}
            </div>

            {/* Medicine Selector */}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="medicineId">Select Medicine *</label>
              <select
                id="medicineId"
                name="medicineId"
                value={formData.medicineId}
                onChange={handleChange}
                disabled={isSubmitting || loadingData}
              >
                <option value="">
                  {loadingData
                    ? "Loading active medicine catalog..."
                    : medicines.length === 0
                    ? "No medicines available"
                    : "Select medicine to dispense"}
                </option>
                {medicines.map((med) => {
                  const code = med.medicineCode || `MED-${String(med.id).padStart(6, "0")}`;
                  const stockLabel = `Available Stock: ${med.totalStock ?? 0}`;
                  return (
                    <option key={med.id} value={med.id}>
                      [{code}] {med.name} - {stockLabel}
                    </option>
                  );
                })}
              </select>
              {errors.medicineId && <p className="form-error">{errors.medicineId}</p>}
            </div>

            {/* Batch Selector */}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="batchId">Select Inventory Batch *</label>
              <select
                id="batchId"
                name="batchId"
                value={formData.batchId}
                onChange={handleChange}
                disabled={isSubmitting || loadingBatches || !formData.medicineId}
              >
                {!formData.medicineId ? (
                  <option value="">Select a medicine first</option>
                ) : loadingBatches ? (
                  <option value="">Loading batches...</option>
                ) : batches.length === 0 ? (
                  <option value="">No available, non-expired batches found for this medicine</option>
                ) : (
                  batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.batchNumber} | Expiry: {b.expiryDate} | Stock: {b.quantityInStock} units | Price: ${parseFloat(b.sellingPrice).toFixed(2)}
                    </option>
                  ))
                )}
              </select>
              {errors.batchId && <p className="form-error">{errors.batchId}</p>}
            </div>

            {/* Quantity to Dispense */}
            <div className="form-field">
              <label htmlFor="quantityDispensed">Quantity to Dispense *</label>
              <input
                id="quantityDispensed"
                name="quantityDispensed"
                type="number"
                min="1"
                max={selectedBatch?.quantityInStock || 9999}
                value={formData.quantityDispensed}
                onChange={handleChange}
                disabled={isSubmitting || !formData.batchId}
              />
              {errors.quantityDispensed && (
                <p className="form-error">{errors.quantityDispensed}</p>
              )}
            </div>

            {/* Associated Prescription ID (Optional) */}
            <div className="form-field">
              <label htmlFor="prescriptionId">Prescription # (Optional)</label>
              <input
                id="prescriptionId"
                name="prescriptionId"
                type="number"
                min="1"
                value={formData.prescriptionId}
                onChange={handleChange}
                placeholder="e.g. 5"
                disabled={isSubmitting}
              />
            </div>

            {/* Notes */}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="notes">Dispensing Notes / Instructions</label>
              <input
                id="notes"
                name="notes"
                type="text"
                value={formData.notes}
                onChange={handleChange}
                placeholder="e.g. Dispensed directly to patient for 5-day cycle"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Pricing Preview Summary Card */}
          {selectedBatch && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", color: "#4b5563" }}>
                  Unit Price: <strong>${batchUnitPrice.toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Selected Batch: <strong>{selectedBatch.batchNumber}</strong> (Available Stock: {selectedBatch.quantityInStock})
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                  Calculated Total
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e40af" }}>
                  ${calculatedTotal}
                </div>
              </div>
            </div>
          )}

          <div className="form-actions" style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting || loadingData || !formData.batchId || batches.length === 0}
            >
              {isSubmitting ? "Dispensing..." : "Dispense Medicine"}
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

export default DispenseMedicine;
