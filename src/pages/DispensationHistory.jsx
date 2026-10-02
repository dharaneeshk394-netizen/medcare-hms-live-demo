import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDispensations } from "../services/pharmacyService";
import Icon from "../components/Icon";

function DispensationHistory() {
  const navigate = useNavigate();

  const [dispensations, setDispensations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const requestIdRef = useRef(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    const currentId = ++requestIdRef.current;
    setLoading(true);
    setError("");

    try {
      const data = await getDispensations();
      if (currentId === requestIdRef.current) {
        setDispensations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (currentId === requestIdRef.current) {
        console.error("Failed to load dispensations:", err);
        setError(err.message || "Failed to load dispensation history.");
      }
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side filtering by patient name, patient code, medicine name, code, or dispensation #
  const filteredDispensations = dispensations.filter((d) => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch;
    return (
      (d.dispensationNumber && d.dispensationNumber.toLowerCase().includes(term)) ||
      (d.patientName && d.patientName.toLowerCase().includes(term)) ||
      (d.patientCode && d.patientCode.toLowerCase().includes(term)) ||
      (d.medicineName && d.medicineName.toLowerCase().includes(term)) ||
      (d.medicineCode && d.medicineCode.toLowerCase().includes(term)) ||
      (d.batchNumber && d.batchNumber.toLowerCase().includes(term)) ||
      (d.dispensedByName && d.dispensedByName.toLowerCase().includes(term))
    );
  });

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

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Dispensation History</h2>
          <p>Audit trail of all medications dispensed to patients from pharmacy inventory.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="primary-button"
            style={{ backgroundColor: "#2563eb" }}
            onClick={() => navigate("/pharmacy/dispense")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="pill" size={16} /> New Dispensation
            </span>
          </button>
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
        {/* Search Toolbar */}
        <div
          className="prescription-toolbar billing-toolbar"
          style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="search-field" style={{ minWidth: "280px", flex: 1 }}>
            <label htmlFor="dispensation-search">Search Dispensations</label>
            <input
              id="dispensation-search"
              type="search"
              value={searchTerm}
              placeholder="Search dispensation #, patient, medicine, batch, staff..."
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSearchTerm("")}
                style={{ height: "42px", padding: "0 14px" }}
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

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
            <p>Loading dispensation records...</p>
          </div>
        )}

        {/* Populated Table */}
        {!loading && !error && filteredDispensations.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dispensation #</th>
                  <th>Patient</th>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total Price</th>
                  <th>Dispensed By</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispensations.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: "#1e40af" }}>
                      {item.dispensationNumber || `DSP-${String(item.id).padStart(6, "0")}`}
                    </td>
                    <td>
                      <div>
                        <strong>{item.patientName}</strong>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {item.patientCode}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{item.medicineName}</strong>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {item.medicineCode}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 6px",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        {item.batchNumber}
                      </span>
                    </td>
                    <td>
                      <strong>{item.quantityDispensed}</strong>
                    </td>
                    <td>${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                    <td>
                      <strong style={{ color: "#1e40af" }}>
                        ${parseFloat(item.totalPrice || 0).toFixed(2)}
                      </strong>
                    </td>
                    <td>{item.dispensedByName || "Staff"}</td>
                    <td style={{ fontSize: "13px", color: "#4b5563" }}>
                      {formatDateTime(item.dispensedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredDispensations.length === 0 && (
          <div className="empty-state">
            <p>
              {searchTerm
                ? "No dispensations match your search criteria."
                : "No medicine dispensations recorded yet."}
            </p>
            {searchTerm && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSearchTerm("")}
                style={{ marginTop: "12px" }}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default DispensationHistory;
