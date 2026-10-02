import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import PrintableLabReport from "../components/PrintableLabReport";
import {
  getLabOrderById,
  recordSpecimen,
  recordResults,
  cancelLabOrder,
} from "../services/labService";

function LabOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role ? String(user.role).toLowerCase() : "";

  const canCollectSample = ["admin", "doctor", "receptionist"].includes(userRole);
  const canEnterResults = ["admin", "doctor"].includes(userRole);
  const canCancelOrder = ["admin", "doctor"].includes(userRole);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Action states
  const [isCollectingSample, setIsCollectingSample] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Result entry modal state
  const [editingItem, setEditingItem] = useState(null);
  const [resultValue, setResultValue] = useState("");
  const [resultFlag, setResultFlag] = useState("NORMAL");
  const [resultRemarks, setResultRemarks] = useState("");
  const [resultError, setResultError] = useState("");
  const [isSavingResult, setIsSavingResult] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getLabOrderById(id);
      if (!data) {
        setError("Lab order record not found.");
      } else {
        setOrder(data);
      }
    } catch (err) {
      console.error("Failed to load lab order details:", err);
      setError(err.message || "Failed to load lab order details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id, loadOrder]);

  const handleMarkSampleCollected = async () => {
    try {
      setIsCollectingSample(true);
      setError("");
      setSuccessMsg("");
      await recordSpecimen(id);
      setSuccessMsg("Specimen collection successfully recorded.");
      await loadOrder();
    } catch (err) {
      console.error("Failed to record specimen:", err);
      setError(err.message || "Failed to record specimen collection.");
    } finally {
      setIsCollectingSample(false);
    }
  };

  const handleOpenResultModal = (item) => {
    setEditingItem(item);
    setResultValue(item.resultValue || "");
    setResultFlag(item.resultFlag || "NORMAL");
    setResultRemarks(item.remarks || "");
    setResultError("");
    setSuccessMsg("");
  };

  const handleCloseResultModal = () => {
    setEditingItem(null);
    setResultValue("");
    setResultFlag("NORMAL");
    setResultRemarks("");
    setResultError("");
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    setResultError("");

    if (!resultValue.trim()) {
      setResultError("Result value is required.");
      return;
    }

    try {
      setIsSavingResult(true);
      await recordResults(id, {
        items: [
          {
            itemId: editingItem.id,
            resultValue: resultValue.trim(),
            resultFlag,
            remarks: resultRemarks.trim() || null,
          },
        ],
      });

      setSuccessMsg(`Result for ${editingItem.testName} saved successfully.`);
      handleCloseResultModal();
      await loadOrder();
    } catch (err) {
      console.error("Failed to record result:", err);
      setResultError(err.message || "Failed to submit result.");
    } finally {
      setIsSavingResult(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsCancelling(true);
      setError("");
      await cancelLabOrder(id, cancelReason.trim() || "Cancelled by physician");
      setShowCancelModal(false);
      setSuccessMsg("Lab order has been cancelled.");
      await loadOrder();
    } catch (err) {
      console.error("Failed to cancel order:", err);
      setError(err.message || "Failed to cancel lab order.");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "STAT":
        return { backgroundColor: "#fee2e2", color: "#991b1b", border: "1px solid #f87171" };
      case "Urgent":
        return { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
    }
  };

  const getResultFlagBadge = (flag) => {
    switch (flag) {
      case "CRITICAL":
        return (
          <span style={{ backgroundColor: "#991b1b", color: "#ffffff", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>
            CRITICAL
          </span>
        );
      case "ABNORMAL":
        return (
          <span style={{ backgroundColor: "#fed7aa", color: "#9a3412", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
            ABNORMAL
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
            NORMAL
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading laboratory order details...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div>
        <div className="page-heading">
          <h2>Lab Order Details</h2>
        </div>
        <div
          style={{
            padding: "16px",
            backgroundColor: "#fee2e2",
            border: "1px solid #f87171",
            borderRadius: "6px",
            color: "#991b1b",
            marginBottom: "16px",
          }}
        >
          <strong>Error: </strong> {error}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/laboratory")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Icon name="arrowLeft" size={14} /> Back to Laboratory
          </span>
        </button>
      </div>
    );
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  const isTerminal = order.status === "COMPLETED" || order.status === "CANCELLED";

  return (
    <div>
      {/* Page Heading & Action Toolbar */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>
            Lab Order:{" "}
            <span style={{ color: "#1e40af" }}>
              {order.orderNumber || `ORD-LAB-${String(order.id).padStart(6, "0")}`}
            </span>
          </h2>
          <p>Diagnostic investigation requisition, specimen tracking, and analysis results.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {canCollectSample && order.status === "PENDING" && (
            <button
              type="button"
              className="primary-button"
              style={{ backgroundColor: "#047857" }}
              onClick={handleMarkSampleCollected}
              disabled={isCollectingSample}
            >
              {isCollectingSample ? "Recording..." : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="droplet" size={16} /> Mark Sample Collected
                </span>
              )}
            </button>
          )}

          {canCancelOrder && !isTerminal && (
            <button
              type="button"
              className="secondary-button"
              style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Order
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={() => window.print()}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="print" size={14} /> Print Lab Report
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={loadOrder}
          >
            Refresh
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/laboratory")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Laboratory
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: "6px",
            color: "#065f46",
            fontSize: "14px",
          }}
        >
          <strong>Success: </strong> {successMsg}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            backgroundColor: "#fee2e2",
            border: "1px solid #f87171",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "14px",
          }}
        >
          <strong>Error: </strong> {error}
        </div>
      )}

      {/* Order & Specimen Overview Grid */}
      <section className="dashboard-section" style={{ marginBottom: "24px" }}>
        <h3 style={{ marginBottom: "16px", fontSize: "18px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
          Requisition Overview
        </h3>

        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Patient</span>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>{order.patientName}</div>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              [{order.patientCode}] • {order.patientGender || "N/A"}, {order.patientAge ? `${order.patientAge} yrs` : ""}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Requesting Physician</span>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>
              {order.doctorName ? `Dr. ${order.doctorName}` : "Hospital Physician"}
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              {order.doctorSpecialization || "General Medicine"}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Priority & Status</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, ...getPriorityStyle(order.priority) }}>
                {order.priority}
              </span>
              <StatusBadge status={order.status || "PENDING"} />
            </div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Specimen Status</span>
            <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "2px" }}>
              {order.sampleCollectedAt ? (
                <span style={{ color: "#047857", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="checkCircle" size={16} /> Collected at {formatDateTime(order.sampleCollectedAt)}
                </span>
              ) : (
                <span style={{ color: "#b45309", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="clock" size={16} /> Specimen Pending Collection
                </span>
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Requisition Date</span>
            <div style={{ fontWeight: 500, fontSize: "14px" }}>{formatDateTime(order.createdAt)}</div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Total Requisition Amount</span>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e40af" }}>
              ${parseFloat(order.totalPrice || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {order.clinicalNotes && (
          <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Clinical Indications</span>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", whiteSpace: "pre-wrap" }}>{order.clinicalNotes}</p>
          </div>
        )}
      </section>

      {/* Ordered Test Items Table */}
      <section className="dashboard-section">
        <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>
          Diagnostic Tests & Analysis Results ({items.length})
        </h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Test Code</th>
                <th>Diagnostic Test</th>
                <th>Category</th>
                <th>Sample</th>
                <th>Reference Range</th>
                <th>Result Value</th>
                <th>Flag</th>
                <th>Remarks</th>
                <th>Status</th>
                {canEnterResults && !isTerminal && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: "#1e40af" }}>{item.testCode}</td>
                  <td>
                    <strong>{item.testName}</strong>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>${parseFloat(item.price || 0).toFixed(2)}</div>
                  </td>
                  <td>{item.testCategory}</td>
                  <td>{item.sampleType}</td>
                  <td>
                    {item.referenceRange ? (
                      <span>
                        {item.referenceRange} {item.testUnit && `(${item.testUnit})`}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>-</span>
                    )}
                  </td>
                  <td>
                    {item.resultValue ? (
                      <strong style={{ fontSize: "15px", color: item.resultFlag === "NORMAL" ? "#111827" : "#b91c1c" }}>
                        {item.resultValue} {item.testUnit}
                      </strong>
                    ) : (
                      <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Awaiting results</span>
                    )}
                  </td>
                  <td>
                    {item.resultValue ? getResultFlagBadge(item.resultFlag) : <span style={{ color: "#9ca3af" }}>-</span>}
                  </td>
                  <td style={{ fontSize: "13px", color: "#4b5563" }}>
                    {item.remarks || "-"}
                  </td>
                  <td>
                    <StatusBadge status={item.status || "PENDING"} />
                  </td>
                  {canEnterResults && !isTerminal && (
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => handleOpenResultModal(item)}
                      >
                        {item.resultValue ? "Edit Result" : "Enter Result"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Result Entry Modal */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Record Result — {editingItem.testName}
              </h3>
              <button
                type="button"
                onClick={handleCloseResultModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div style={{ padding: "10px", backgroundColor: "#f3f4f6", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
              <div>Standard Reference Range: <strong>{editingItem.referenceRange || "Standard clinical baseline"}</strong></div>
              {editingItem.testUnit && <div>Unit: <strong>{editingItem.testUnit}</strong></div>}
            </div>

            {resultError && (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: "16px",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #f87171",
                  borderRadius: "6px",
                  color: "#991b1b",
                  fontSize: "13px",
                }}
              >
                {resultError}
              </div>
            )}

            <form onSubmit={handleSaveResult}>
              <div className="form-field" style={{ marginBottom: "14px" }}>
                <label htmlFor="modalResultVal">Observed Result Value *</label>
                <input
                  id="modalResultVal"
                  type="text"
                  placeholder={editingItem.testUnit ? `e.g. 14.5 ${editingItem.testUnit}` : "e.g. Negative, 120, Normal"}
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  disabled={isSavingResult}
                  autoFocus
                />
              </div>

              <div className="form-field" style={{ marginBottom: "14px" }}>
                <label htmlFor="modalResultFlag">Evaluation Flag *</label>
                <select
                  id="modalResultFlag"
                  value={resultFlag}
                  onChange={(e) => setResultFlag(e.target.value)}
                  disabled={isSavingResult}
                >
                  <option value="NORMAL">NORMAL (Within reference range)</option>
                  <option value="ABNORMAL">ABNORMAL (Outside reference range)</option>
                  <option value="CRITICAL">CRITICAL (Requires urgent clinical alert)</option>
                </select>
              </div>

              <div className="form-field" style={{ marginBottom: "20px" }}>
                <label htmlFor="modalRemarks">Pathologist Remarks / Notes</label>
                <input
                  id="modalRemarks"
                  type="text"
                  placeholder="e.g. Repeat test recommended in 7 days, mild lymphocytosis"
                  value={resultRemarks}
                  onChange={(e) => setResultRemarks(e.target.value)}
                  disabled={isSavingResult}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseResultModal}
                  disabled={isSavingResult}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSavingResult}
                >
                  {isSavingResult ? "Saving Result..." : "Save Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", color: "#991b1b" }}>Cancel Laboratory Order</h3>
            <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px" }}>
              Are you sure you want to cancel this lab order? Any pending test items will be discontinued.
            </p>

            <form onSubmit={handleCancelSubmit}>
              <div className="form-field" style={{ marginBottom: "20px" }}>
                <label htmlFor="cancelReasonInput">Cancellation Reason *</label>
                <input
                  id="cancelReasonInput"
                  type="text"
                  placeholder="e.g. Patient declined investigation, duplicate order"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={isCancelling}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ backgroundColor: "#dc2626" }}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden A4 Printable Laboratory Report Document rendered during window.print() */}
      <PrintableLabReport order={order} />
    </div>
  );
}

export default LabOrderDetails;
