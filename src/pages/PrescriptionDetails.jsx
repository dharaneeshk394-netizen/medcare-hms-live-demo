import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import PrintablePrescription from "../components/PrintablePrescription";
import { useAuth } from "../context/AuthContext";
import {
  getPrescriptionById,
  cancelPrescription,
} from "../services/prescriptionService";

/**
 * Format date string into readable localized format.
 *
 * @param {string} dateString
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * PrescriptionDetails Component
 *
 * Displays composite details for a single prescription fetched from the backend API.
 * Includes patient info, doctor info, linked appointment info, diagnosis notes,
 * and prescribed medication line items.
 */
function PrescriptionDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Cancellation Modal & Submission States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");

  const handleOpenCancelModal = () => {
    setCancelError("");
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = useCallback(() => {
    if (cancelling) return;
    setShowCancelModal(false);
    setCancelError("");
  }, [cancelling]);

  const handleConfirmCancel = async () => {
    if (cancelling) return;

    try {
      setCancelling(true);
      setCancelError("");

      const updated = await cancelPrescription(id);
      if (updated && typeof updated === "object") {
        setPrescription(updated);
      } else {
        setPrescription((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
      }

      setCancelSuccess("Prescription cancelled successfully.");
      setShowCancelModal(false);
    } catch (err) {
      console.warn("Failed to cancel prescription:", err.message);
      setCancelError(
        err.message || "Failed to cancel prescription. Please try again."
      );
    } finally {
      setCancelling(false);
    }
  };

  /**
   * Fetch prescription composite details by ID.
   */
  const loadPrescription = useCallback(async () => {
    const numericId = Number(id);
    if (!id || Number.isNaN(numericId) || numericId <= 0) {
      setError("Invalid prescription ID provided.");
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotFound(false);

      const data = await getPrescriptionById(id);
      if (!data) {
        setNotFound(true);
        setPrescription(null);
      } else {
        setPrescription(data);
      }
    } catch (err) {
      console.warn("Failed to load prescription details:", err.message);
      if (err.status === 404 || err.message?.includes("not found")) {
        setNotFound(true);
        setError("");
      } else {
        setError(
          err.message ||
            "Failed to load prescription details. Please check the ID or try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPrescription();
  }, [loadPrescription]);

  // Keyboard accessibility: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showCancelModal && !cancelling) {
        handleCloseCancelModal();
      }
    };
    if (showCancelModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCancelModal, cancelling, handleCloseCancelModal]);

  // Loading State
  if (loading) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Prescription Details</h2>
            <p>Loading prescription information...</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/prescriptions")}
            aria-label="Back to Prescriptions list"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Prescriptions
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div className="empty-state">
            <p>Loading prescription details...</p>
          </div>
        </section>
      </div>
    );
  }

  // Not Found State
  if (notFound) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Prescription Details</h2>
            <p>View patient prescription and medication details.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/prescriptions")}
            aria-label="Back to Prescriptions list"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Prescriptions
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div
            className="empty-state"
            style={{ padding: "36px 20px", textAlign: "center" }}
          >
            <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>
              Prescription Not Found
            </h3>
            <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto 20px" }}>
              The requested prescription does not exist or has been removed.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/prescriptions")}
              aria-label="Back to Prescriptions list"
            >
              Back to Prescriptions
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Error State
  if (error || !prescription) {
    return (
      <div>
        <div className="page-heading-with-action page-heading">
          <div>
            <h2>Prescription Details</h2>
            <p>View patient prescription and medication details.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/prescriptions")}
            aria-label="Back to Prescriptions list"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Prescriptions
            </span>
          </button>
        </div>

        <section className="dashboard-section">
          <div
            className="empty-state"
            style={{ padding: "36px 20px", textAlign: "center" }}
          >
            <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>
              Unable to Load Prescription
            </h3>
            <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto 20px" }}>
              {error || "An error occurred while retrieving prescription details."}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                className="primary-button"
                onClick={loadPrescription}
                aria-label="Retry loading prescription details"
              >
                Try Again
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/prescriptions")}
                aria-label="Back to Prescriptions list"
              >
                Back to Prescriptions
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const items = Array.isArray(prescription.items) ? prescription.items : [];
  const rxNumber =
    prescription.prescriptionNumber ||
    prescription.prescription_number ||
    `RX-${prescription.id}`;
  const rxDate = formatDate(
    prescription.prescriptionDate || prescription.prescription_date
  );

  const patientName = prescription.patientName || "—";
  const patientCode =
    prescription.patientCode ||
    prescription.patient_code ||
    (prescription.patientId ? `P${prescription.patientId}` : "—");
  const patientPhone = prescription.patientPhone || "—";
  const patientEmail = prescription.patientEmail || "—";

  const demographics = [
    prescription.patientAge ? `${prescription.patientAge} yrs` : null,
    prescription.patientGender,
    prescription.patientBloodGroup ? `Blood: ${prescription.patientBloodGroup}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const doctorName = prescription.doctorName || "—";
  const doctorSpecialization =
    prescription.doctorSpecialization || prescription.specialization || "—";
  const doctorCode =
    prescription.doctorCode ||
    (prescription.doctorId ? `DOC-${prescription.doctorId}` : "—");
  const doctorPhone = prescription.doctorPhone || "—";

  const hasAppointment = Boolean(
    prescription.appointmentId || prescription.appointmentCode
  );
  const appointmentCode =
    prescription.appointmentCode ||
    (prescription.appointmentId ? `APT-${prescription.appointmentId}` : "—");
  const appointmentDate = formatDate(
    prescription.appointmentDate || prescription.appointment_date
  );

  const userRole = user?.role?.toLowerCase();
  const isAuthorizedRole = userRole === "admin" || userRole === "doctor";

  const canEdit = isAuthorizedRole && prescription.status !== "CANCELLED";
  const canCancel = isAuthorizedRole && prescription.status === "ACTIVE";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-heading-with-action page-heading">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h2>Prescription {rxNumber}</h2>
            <StatusBadge status={prescription.status} />
          </div>
          <p>
            Issued on {rxDate} for patient {patientName} by Dr. {doctorName}.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handlePrint}
            aria-label="Print Prescription"
            id="print-prescription-button"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="printer" size={14} /> Print Prescription
            </span>
          </button>

          {canEdit && (
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate(`/prescriptions/${prescription.id}/edit`)}
              aria-label="Edit Prescription"
            >
              Edit Prescription
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              className="danger-button-solid"
              onClick={handleOpenCancelModal}
              aria-label="Cancel Prescription"
            >
              Cancel Prescription
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/prescriptions")}
            aria-label="Back to Prescriptions list"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Prescriptions
            </span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {cancelSuccess && (
        <div
          className="modal-alert modal-alert-success"
          role="status"
          style={{ marginBottom: "20px" }}
        >
          <strong>Success:</strong> {cancelSuccess}
        </div>
      )}

      {/* Error Banner when Modal is Closed */}
      {cancelError && !showCancelModal && (
        <div
          className="modal-alert modal-alert-error"
          role="alert"
          style={{ marginBottom: "20px" }}
        >
          <strong>Error:</strong> {cancelError}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="modal-backdrop"
          onClick={handleCloseCancelModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17, 24, 39, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="modal-header">
              <h3 id="cancel-modal-title">Confirm Prescription Cancellation</h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseCancelModal}
                disabled={cancelling}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body">
              {cancelError && (
                <div className="modal-alert modal-alert-error" role="alert">
                  <strong>Error:</strong> {cancelError}
                </div>
              )}

              <div className="cancel-warning-banner">
                <strong>Warning:</strong> Prescription cancellation is a permanent lifecycle change and cannot be reversed or undone.
              </div>

              <div className="cancel-modal-summary">
                <div className="cancel-summary-row">
                  <span style={{ color: "#6b7280" }}>Prescription #</span>
                  <span className="font-mono"><strong>{rxNumber}</strong></span>
                </div>
                <div className="cancel-summary-row">
                  <span style={{ color: "#6b7280" }}>Patient Name</span>
                  <span><strong>{patientName}</strong></span>
                </div>
                <div className="cancel-summary-row">
                  <span style={{ color: "#6b7280" }}>Prescribing Doctor</span>
                  <span><strong>Dr. {doctorName}</strong></span>
                </div>
                <div className="cancel-summary-row">
                  <span style={{ color: "#6b7280" }}>Issued Date</span>
                  <span>{rxDate}</span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "14px", color: "#4b5563" }}>
                Are you sure you want to cancel this active prescription?
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseCancelModal}
                disabled={cancelling}
                aria-label="Keep prescription active and close dialog"
              >
                Keep Active
              </button>

              <button
                type="button"
                className="danger-button-solid"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                aria-label="Confirm prescription cancellation"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Cards for Prescription, Patient, Doctor & Appointment Overview */}
      <div className="invoice-detail-grid">
        {/* Prescription Metadata Card */}
        <section className="dashboard-section invoice-info-card">
          <div className="section-header">
            <h3>Prescription Overview</h3>
            <p>Metadata and issue status.</p>
          </div>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Prescription #</span>
              <span className="detail-value font-mono"><strong>{rxNumber}</strong></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Prescription Date</span>
              <span className="detail-value">{rxDate}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <StatusBadge status={prescription.status} />
              </span>
            </div>
          </div>
        </section>

        {/* Patient Details Card */}
        <section className="dashboard-section invoice-info-card">
          <div className="section-header">
            <h3>Patient Information</h3>
            <p>Patient identifiers and profile.</p>
          </div>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Patient Name</span>
              <span className="detail-value"><strong>{patientName}</strong></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Patient Code / ID</span>
              <span className="detail-value font-mono">{patientCode}</span>
            </div>
            {demographics && (
              <div className="detail-row">
                <span className="detail-label">Demographics</span>
                <span className="detail-value">{demographics}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{patientPhone}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{patientEmail}</span>
            </div>
          </div>
        </section>

        {/* Doctor Details Card */}
        <section className="dashboard-section invoice-info-card">
          <div className="section-header">
            <h3>Doctor Information</h3>
            <p>Prescribing physician details.</p>
          </div>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Doctor Name</span>
              <span className="detail-value"><strong>{doctorName}</strong></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Specialization</span>
              <span className="detail-value">{doctorSpecialization}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Doctor Code</span>
              <span className="detail-value font-mono">{doctorCode}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{doctorPhone}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Appointment Information Section */}
      <section className="dashboard-section" style={{ marginBottom: "24px" }}>
        <div className="section-header">
          <h3>Linked Appointment</h3>
          <p>Associated consultation or clinical appointment.</p>
        </div>
        {hasAppointment ? (
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Appointment #</span>
              <span className="detail-value font-mono"><strong>{appointmentCode}</strong></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Appointment Date</span>
              <span className="detail-value">{appointmentDate}</span>
            </div>
          </div>
        ) : (
          <div style={{ color: "#6b7280", fontStyle: "italic" }}>
            No linked appointment associated with this prescription.
          </div>
        )}
      </section>

      {/* Diagnosis / Notes Section */}
      <section className="dashboard-section" style={{ marginBottom: "24px" }}>
        <div className="section-header">
          <h3>Diagnosis & Clinical Notes</h3>
          <p>Clinical observations and diagnosis details recorded by the physician.</p>
        </div>
        <div
          style={{
            background: "#f9fafb",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#374151",
              whiteSpace: "pre-wrap",
              lineHeight: "1.5",
              fontSize: "14px",
            }}
          >
            {prescription.diagnosisNotes ||
              prescription.diagnosis_notes ||
              "No diagnosis or clinical notes provided for this prescription."}
          </p>
        </div>
      </section>

      {/* Prescription Line Items Table */}
      <section className="dashboard-section">
        <div className="section-header">
          <h3>Prescribed Medications</h3>
          <p>Complete list of prescribed medicines, dosage instructions, and duration.</p>
        </div>

        {items.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Medicine Name</th>
                  <th scope="col">Dosage</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.medicineName || item.medicine_name || "—"}</strong>
                    </td>
                    <td>{item.dosage || "—"}</td>
                    <td>{item.frequency || "—"}</td>
                    <td>{item.duration || "—"}</td>
                    <td>
                      {item.quantity !== undefined && item.quantity !== null
                        ? item.quantity
                        : "—"}
                    </td>
                    <td>{item.instructions || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "24px" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>
              No medication line items attached to this prescription.
            </p>
          </div>
        )}
      </section>

      {/* Dedicated Printable A4 Document (Active only during print media) */}
      <PrintablePrescription prescription={prescription} />
    </div>
  );
}

export default PrescriptionDetails;
