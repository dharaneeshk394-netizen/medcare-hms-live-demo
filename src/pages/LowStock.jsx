import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getLowStock } from "../services/pharmacyService";

function LowStock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [lowStockList, setLowStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getLowStock();
      setLowStockList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading low-stock items:", err);
      setError(err.message || "Failed to load low stock inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Low Stock Inventory</h2>
          <p>Medications at or below their configured reorder thresholds requiring replenishment.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
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

      <section className="dashboard-section">
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

        {/* Loading State */}
        {loading && (
          <div className="empty-state">
            <p>Scanning inventory for low-stock medicines...</p>
          </div>
        )}

        {/* Populated Table */}
        {!loading && !error && lowStockList.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Dosage / Strength</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Deficit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.map((med) => {
                  const hasDosageInfo = med.dosageForm || med.strength;
                  const dosageLabel = hasDosageInfo
                    ? [med.dosageForm, med.strength].filter(Boolean).join(" - ")
                    : "-";

                  return (
                    <tr key={med.id}>
                      <td style={{ fontWeight: 600, color: "#1e40af" }}>
                        <span
                          style={{ cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => navigate(`/pharmacy/medicines/${med.id}`)}
                          title="View batches and stock details"
                        >
                          {med.medicineCode || `MED-${String(med.id).padStart(6, "0")}`}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ fontWeight: 600, cursor: "pointer" }}
                          onClick={() => navigate(`/pharmacy/medicines/${med.id}`)}
                        >
                          {med.name}
                        </div>
                        {med.genericName && (
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {med.genericName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            backgroundColor: "#f3f4f6",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          {med.category || "General"}
                        </span>
                      </td>
                      <td>{dosageLabel}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#dc2626",
                            backgroundColor: "#fef2f2",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            border: "1px solid #fecaca",
                          }}
                        >
                          {med.totalStock ?? 0} units
                        </span>
                      </td>
                      <td style={{ color: "#4b5563" }}>{med.reorderLevel ?? "-"} units</td>
                      <td>
                        <strong style={{ color: "#b91c1c" }}>
                          +{med.deficit ?? 0} units needed
                        </strong>
                      </td>
                      <td>
                        <StatusBadge status={med.status || "ACTIVE"} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            onClick={() => navigate(`/pharmacy/medicines/${med.id}`)}
                          >
                            Details
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="primary-button"
                              style={{ backgroundColor: "#047857", padding: "4px 8px", fontSize: "12px" }}
                              onClick={() => navigate(`/pharmacy/batches/add?medicineId=${med.id}`)}
                            >
                              + Add Batch
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && lowStockList.length === 0 && (
          <div className="empty-state">
            <div style={{ marginBottom: "8px", color: "#059669" }}>
              <Icon name="checkCircle" size={32} />
            </div>
            <h3>Inventory Levels Healthy</h3>
            <p>All active medicines are currently stocked above their reorder thresholds.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/pharmacy")}
              style={{ marginTop: "12px" }}
            >
              Go to Pharmacy Catalog
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default LowStock;
