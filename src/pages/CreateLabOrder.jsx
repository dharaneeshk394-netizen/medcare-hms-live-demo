import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../services/patientService";
import { getDoctors } from "../services/doctorService";
import { getLabTests, createLabOrder } from "../services/labService";

function CreateLabOrder() {
  const navigate = useNavigate();

  // Data sources
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  // Form State
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState([]);

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial patients, doctors, and active lab catalog tests
  useEffect(() => {
    let isMounted = true;

    async function loadFormPrerequisites() {
      try {
        setLoadingData(true);
        setDataError("");

        const [patientsRes, doctorsRes, testsRes] = await Promise.all([
          getPatients(),
          getDoctors(),
          getLabTests({ status: "ACTIVE" }),
        ]);

        if (isMounted) {
          const patientList = Array.isArray(patientsRes)
            ? patientsRes
            : Array.isArray(patientsRes?.data)
            ? patientsRes.data
            : [];
          setPatients(patientList);

          const doctorList = Array.isArray(doctorsRes)
            ? doctorsRes
            : Array.isArray(doctorsRes?.data)
            ? doctorsRes.data
            : [];
          setDoctors(doctorList);

          const testList = Array.isArray(testsRes) ? testsRes : [];
          setAvailableTests(testList);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load prerequisites for lab order:", err);
          setDataError(err.message || "Failed to load patient, doctor, or test catalog lists.");
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    }

    loadFormPrerequisites();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleTest = (testId) => {
    setSelectedTestIds((prev) => {
      if (prev.includes(testId)) {
        return prev.filter((id) => id !== testId);
      }
      return [...prev, testId];
    });

    if (errors.tests) {
      setErrors((prev) => ({ ...prev, tests: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const pId = Number(patientId);
    if (!patientId || !Number.isInteger(pId) || pId <= 0) {
      newErrors.patientId = "Please select a patient.";
    }

    if (selectedTestIds.length === 0) {
      newErrors.tests = "Please select at least one diagnostic lab test.";
    }

    if (clinicalNotes && clinicalNotes.length > 1000) {
      newErrors.clinicalNotes = "Clinical notes cannot exceed 1000 characters.";
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
        patientId: parseInt(patientId, 10),
        doctorId: doctorId ? parseInt(doctorId, 10) : null,
        priority,
        clinicalNotes: clinicalNotes.trim() || null,
        items: selectedTestIds.map((id) => ({ testId: id })),
      };

      const createdOrder = await createLabOrder(payload);
      if (createdOrder?.id) {
        navigate(`/laboratory/orders/${createdOrder.id}`);
      } else {
        navigate("/laboratory");
      }
    } catch (err) {
      console.error("Error creating lab order:", err);
      setSubmitError(err.message || "Failed to submit lab order. Please verify your entries.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTestsDetails = availableTests.filter((t) => selectedTestIds.includes(t.id));
  const estimatedTotal = selectedTestsDetails.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);

  return (
    <div>
      <div className="page-heading">
        <h2>Create Laboratory Order</h2>
        <p>Order diagnostic tests, laboratory panels, and specimen investigations for a patient.</p>
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
            {/* Patient Select */}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="patientSelect">Select Patient *</label>
              <select
                id="patientSelect"
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  if (errors.patientId) setErrors((prev) => ({ ...prev, patientId: "" }));
                }}
                disabled={isSubmitting || loadingData}
              >
                <option value="">
                  {loadingData
                    ? "Loading registered patient directory..."
                    : patients.length === 0
                    ? "No patients registered"
                    : "Select Patient"}
                </option>
                {patients.map((p) => {
                  const code = p.patientId || p.patient_id || `PT-${p.id}`;
                  return (
                    <option key={p.id} value={p.id}>
                      [{code}] {p.name} — Phone: {p.phone || "N/A"} — Gender: {p.gender || "N/A"}
                    </option>
                  );
                })}
              </select>
              {errors.patientId && <p className="form-error">{errors.patientId}</p>}
            </div>

            {/* Requesting Doctor */}
            <div className="form-field">
              <label htmlFor="doctorSelect">Requesting Physician</label>
              <select
                id="doctorSelect"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={isSubmitting || loadingData}
              >
                <option value="">Hospital Duty Physician (Unassigned)</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name} ({d.specialization || "General Medicine"})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="form-field">
              <label htmlFor="prioritySelect">Clinical Priority *</label>
              <select
                id="prioritySelect"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Routine">Routine (Standard Turnaround)</option>
                <option value="Urgent">Urgent (Priority Processing)</option>
                <option value="STAT">STAT (Immediate Emergency Analysis)</option>
              </select>
            </div>

            {/* Clinical Notes */}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="clinicalNotes">Clinical Notes & Indications</label>
              <textarea
                id="clinicalNotes"
                rows="2"
                placeholder="e.g. Fasting sample requested, pre-operative screening, suspected anemia..."
                value={clinicalNotes}
                onChange={(e) => {
                  setClinicalNotes(e.target.value);
                  if (errors.clinicalNotes) setErrors((prev) => ({ ...prev, clinicalNotes: "" }));
                }}
                disabled={isSubmitting}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
              {errors.clinicalNotes && <p className="form-error">{errors.clinicalNotes}</p>}
            </div>
          </div>

          {/* Test Catalog Selection Section */}
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <label style={{ fontSize: "15px", fontWeight: 600 }}>
                Select Diagnostic Tests * ({selectedTestIds.length} selected)
              </label>
              <span style={{ fontSize: "14px", color: "#4b5563" }}>
                Estimated Catalog Total: <strong style={{ color: "#1e40af" }}>${estimatedTotal.toFixed(2)}</strong>
              </span>
            </div>

            {errors.tests && (
              <p className="form-error" style={{ marginBottom: "12px" }}>
                {errors.tests}
              </p>
            )}

            {loadingData ? (
              <div className="empty-state">
                <p>Loading available diagnostic tests...</p>
              </div>
            ) : availableTests.length === 0 ? (
              <div className="empty-state">
                <p>No active diagnostic tests available in the catalog.</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "12px",
                  maxHeight: "340px",
                  overflowY: "auto",
                  padding: "4px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  backgroundColor: "#f9fafb",
                }}
              >
                {availableTests.map((t) => {
                  const isChecked = selectedTestIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => !isSubmitting && handleToggleTest(t.id)}
                      style={{
                        padding: "12px",
                        backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
                        border: isChecked ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        borderRadius: "6px",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        transition: "all 0.15s ease-in-out",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ marginTop: "3px", cursor: "pointer" }}
                        disabled={isSubmitting}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: isChecked ? "#1e40af" : "#111827" }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                          [{t.testCode}] • {t.category} • Sample: {t.sampleType}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#047857", marginTop: "4px" }}>
                          ${parseFloat(t.price || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions" style={{ marginTop: "28px", display: "flex", gap: "12px" }}>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting || loadingData || selectedTestIds.length === 0}
            >
              {isSubmitting ? "Submitting Order..." : "Create Lab Order"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/laboratory")}
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

export default CreateLabOrder;
