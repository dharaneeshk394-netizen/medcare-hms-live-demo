import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getMedicineById, adjustStock } from "../services/pharmacyService";

function MedicineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Stock Adjustment Modal / State
  const [adjustingBatch, setAdjustingBatch] = useState(null);
  const [adjustMode, setAdjustMode] = useState("change"); // "change" (+/-) or "set" (absolute)
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMedicineById(id);
      if (!data) {
        setError("Medicine record not found.");
      } else {
        setMedicine(data);
      }
    } catch (err) {
      console.error("Error loading medicine details:", err);
      setError(err.message || "Failed to load medicine details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadDetails();
    }
  }, [id, loadDetails]);

  const openAdjustModal = (batch) => {
    setAdjustingBatch(batch);
    setAdjustMode("change");
    setAdjustQuantity("");
    setAdjustReason("");
    setAdjustError("");
    setSuccessMsg("");
  };

  const closeAdjustModal = () => {
    setAdjustingBatch(null);
    setAdjustQuantity("");
    setAdjustReason("");
    setAdjustError("");
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError("");

    if (!adjustReason.trim()) {
      setAdjustError("Adjustment reason is required.");
      return;
    }

    const qtyVal = parseInt(adjustQuantity, 10);
    if (Number.isNaN(qtyVal)) {
      setAdjustError("Please enter a valid whole integer quantity.");
      return;
    }

    const payload = {
      batchId: adjustingBatch.id,
      reason: adjustReason.trim(),
    };

    if (adjustMode === "change") {
      if (qtyVal === 0) {
        setAdjustError("Change quantity cannot be zero.");
        return;
      }
      if (adjustingBatch.quantityInStock + qtyVal < 0) {
        setAdjustError(
          `Insufficient stock: decrement (${qtyVal}) exceeds available stock (${adjustingBatch.quantityInStock}).`
        );
        return;
      }
      payload.changeQuantity = qtyVal;
    } else {
      if (qtyVal < 0) {
        setAdjustError("New stock quantity cannot be negative.");
        return;
      }
      payload.newQuantity = qtyVal;
    }

    try {
      setIsAdjusting(true);
      await adjustStock(payload);
      setSuccessMsg(
        `Batch ${adjustingBatch.batchNumber} stock successfully adjusted.`
      );
      closeAdjustModal();
      await loadDetails();
    } catch (err) {
      console.error("Stock adjustment failed:", err);
      setAdjustError(err.message || "Failed to adjust stock. Please try again.");
    } finally {
      setIsAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading medicine details...</p>
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div>
        <div className="page-heading">
          <h2>Medicine Details</h2>
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
          <strong>Error: </strong> {error || "Record not found"}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/pharmacy")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Icon name="arrowLeft" size={14} /> Back to Pharmacy
          </span>
        </button>
      </div>
    );
  }

  const batches = Array.isArray(medicine.batches) ? medicine.batches : [];

  return (
    <div>
      {/* Header with Breadcrumb Actions */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>
            {medicine.name}{" "}
            <span style={{ fontSize: "16px", color: "#6b7280", fontWeight: 400 }}>
              ({medicine.medicineCode || `MED-${String(medicine.id).padStart(6, "0")}`})
            </span>
          </h2>
          <p>Complete medicine specifications, inventory batches, and stock ledger.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isAdmin && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate(`/pharmacy/medicines/${medicine.id}/edit`)}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="edit" size={14} /> Edit Medicine
                </span>
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ backgroundColor: "#047857" }}
                onClick={() => navigate(`/pharmacy/batches/add?medicineId=${medicine.id}`)}
              >
                + Add Batch for this Medicine
              </button>
            </>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/pharmacy")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="arrowLeft" size={14} /> Back to Pharmacy
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

      {/* Low-Stock Warning Alert */}
      {medicine.isLowStock && (
        <div
          style={{
            padding: "14px 18px",
            marginBottom: "20px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "8px",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Icon name="alertTriangle" size={20} style={{ color: "#d97706" }} />
          <div>
            <strong>Low Stock Warning:</strong> Current active stock ({medicine.totalStock ?? 0} units) is at or below the reorder threshold ({medicine.reorderLevel ?? 0} units). Consider receiving new batches soon.
          </div>
        </div>
      )}

      {/* Specifications Card */}
      <section className="dashboard-section" style={{ marginBottom: "24px" }}>
        <h3 style={{ marginBottom: "16px", fontSize: "18px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
          Catalog Specifications
        </h3>
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Medicine Code</span>
            <div style={{ fontWeight: 600, fontSize: "15px", color: "#1e40af" }}>
              {medicine.medicineCode || `MED-${String(medicine.id).padStart(6, "0")}`}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Generic Name</span>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>{medicine.genericName || "-"}</div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Category</span>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>{medicine.category || "General"}</div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Dosage Form & Strength</span>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>
              {[medicine.dosageForm, medicine.strength].filter(Boolean).join(" - ") || "-"}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Catalog Unit Price</span>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>
              ${parseFloat(medicine.unitPrice || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Reorder Threshold</span>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>
              {medicine.reorderLevel ?? "-"} units
            </div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Total Available Stock</span>
            <div style={{ fontWeight: 700, fontSize: "18px", color: medicine.isLowStock ? "#dc2626" : "#16a34a" }}>
              {medicine.totalStock ?? 0} units
            </div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Catalog Status</span>
            <div style={{ marginTop: "4px" }}>
              <StatusBadge status={medicine.status || "ACTIVE"} />
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Batches Table */}
      <section className="dashboard-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ fontSize: "18px", margin: 0 }}>
            Inventory Batches ({batches.length})
          </h3>
          {isAdmin && (
            <button
              type="button"
              className="primary-button"
              style={{ backgroundColor: "#047857" }}
              onClick={() => navigate(`/pharmacy/batches/add?medicineId=${medicine.id}`)}
            >
              + Add New Batch
            </button>
          )}
        </div>

        {batches.length === 0 ? (
          <div className="empty-state">
            <p>No inventory batches recorded for this medicine yet.</p>
            {isAdmin && (
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate(`/pharmacy/batches/add?medicineId=${medicine.id}`)}
                style={{ marginTop: "12px" }}
              >
                Receive First Batch
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Stock In Hand</th>
                  <th>Cost / Unit</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const isExpired = batch.expiryDate && batch.expiryDate < todayStr;

                  return (
                    <tr key={batch.id}>
                      <td style={{ fontWeight: 600 }}>{batch.batchNumber}</td>
                      <td>
                        <span style={{ color: isExpired ? "#dc2626" : "inherit", fontWeight: isExpired ? 600 : 400 }}>
                          {batch.expiryDate || "-"} {isExpired && "(Expired)"}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: batch.quantityInStock === 0 ? "#9ca3af" : "#111827" }}>
                          {batch.quantityInStock}
                        </strong>
                      </td>
                      <td>${parseFloat(batch.purchasePrice || 0).toFixed(2)}</td>
                      <td>${parseFloat(batch.sellingPrice || 0).toFixed(2)}</td>
                      <td>
                        <StatusBadge status={batch.status || "AVAILABLE"} />
                      </td>
                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                            onClick={() => openAdjustModal(batch)}
                          >
                            Adjust Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock Adjustment Modal */}
      {adjustingBatch && (
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
              maxWidth: "500px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Adjust Stock — {adjustingBatch.batchNumber}
              </h3>
              <button
                type="button"
                onClick={closeAdjustModal}
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

            <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px" }}>
              Current batch stock: <strong>{adjustingBatch.quantityInStock} units</strong>
            </p>

            {adjustError && (
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
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit}>
              <div className="form-field" style={{ marginBottom: "16px" }}>
                <label>Adjustment Mode</label>
                <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 400 }}>
                    <input
                      type="radio"
                      name="adjustMode"
                      value="change"
                      checked={adjustMode === "change"}
                      onChange={() => setAdjustMode("change")}
                    />
                    Relative Delta (+ / -)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 400 }}>
                    <input
                      type="radio"
                      name="adjustMode"
                      value="set"
                      checked={adjustMode === "set"}
                      onChange={() => setAdjustMode("set")}
                    />
                    Exact Quantity (Overwrite)
                  </label>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: "16px" }}>
                <label htmlFor="adjustQuantity">
                  {adjustMode === "change" ? "Quantity Delta (+ to add, - to subtract)" : "New Total Quantity"} *
                </label>
                <input
                  id="adjustQuantity"
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder={adjustMode === "change" ? "e.g. -5 or 10" : "e.g. 50"}
                  disabled={isAdjusting}
                  autoFocus
                />
              </div>

              <div className="form-field" style={{ marginBottom: "20px" }}>
                <label htmlFor="adjustReason">Adjustment Reason *</label>
                <input
                  id="adjustReason"
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Broken ampoules during inspection, physical count audit"
                  disabled={isAdjusting}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeAdjustModal}
                  disabled={isAdjusting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isAdjusting}
                >
                  {isAdjusting ? "Adjusting..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicineDetails;
