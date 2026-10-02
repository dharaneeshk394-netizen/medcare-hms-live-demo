import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getMedicines } from "../services/pharmacyService";
import { downloadExport } from "../utils/exportUtils";

function Pharmacy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Data state
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExportMedicines = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      setExportError("");
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (categoryFilter && categoryFilter !== "All") params.append("category", categoryFilter);
      if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/v1/pharmacy/export${qs}`;
      const defaultFilename = `medcare-pharmacy-inventory-${new Date().toISOString().split("T")[0]}.csv`;
      await downloadExport(url, defaultFilename);
    } catch (err) {
      console.error("Failed to export medicines:", err);
      setExportError(err.message || "Failed to export pharmacy inventory CSV.");
    } finally {
      setExporting(false);
    }
  };

  // Ref to track latest request to prevent race conditions
  const requestIdRef = useRef(0);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  /**
   * Load medicines from backend via pharmacyService.
   */
  const loadMedicines = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError("");

    try {
      const filters = {};

      if (debouncedSearch) {
        filters.search = debouncedSearch;
      }

      if (categoryFilter && categoryFilter !== "All") {
        filters.category = categoryFilter;
      }

      if (statusFilter && statusFilter !== "All") {
        filters.status = statusFilter;
      }

      const response = await getMedicines(filters);

      if (currentRequestId === requestIdRef.current) {
        const list = Array.isArray(response) ? response : [];
        setMedicines(list);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.warn("Failed to load medicines:", err.message);
        setMedicines([]);
        setError(
          err.message ||
            "Failed to load pharmacy medicine catalog. Please make sure the backend API is running."
        );
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, categoryFilter, statusFilter]);

  // Trigger data fetch when parameters change
  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  // Handlers for filter controls
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setCategoryFilter("All");
    setStatusFilter("All");
  };

  const handleRefresh = () => {
    loadMedicines();
  };

  const isFiltered = Boolean(searchTerm) || categoryFilter !== "All" || statusFilter !== "All";

  // Derive unique categories present in the current dataset or common hospital categories
  const defaultCategories = [
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

  const availableCategories = Array.from(
    new Set([
      ...defaultCategories,
      ...medicines.map((m) => m.category).filter(Boolean),
    ])
  ).sort();

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Pharmacy Inventory</h2>
          <p>Manage medicine catalog, stock levels, and reorder thresholds.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportMedicines}
            disabled={loading || exporting}
            title="Export filtered medicines to CSV"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="download" size={15} /> {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ backgroundColor: "#2563eb" }}
            onClick={() => navigate("/pharmacy/dispense")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="pill" size={16} /> Dispense Medicine
            </span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/pharmacy/dispensations")}
            title="View medicine dispensation history"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="clipboard" size={16} /> Dispensations
            </span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/pharmacy/low-stock")}
            title="View low stock alerts"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icon name="alertTriangle" size={16} /> Low Stock
            </span>
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/pharmacy/add")}
              >
                + Add Medicine
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ backgroundColor: "#047857" }}
                onClick={() => navigate("/pharmacy/batches/add")}
              >
                + Add Batch
              </button>
            </>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={handleRefresh}
            title="Refresh medicine catalog"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Main Table Section */}
      <section className="dashboard-section">
        {exportError && (
          <div
            style={{
              padding: "10px 16px",
              marginBottom: "16px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#b91c1c",
              fontSize: "14px",
            }}
          >
            {exportError}
          </div>
        )}

        {/* Toolbar with Search, Category, and Status Filter */}
        <div className="prescription-toolbar billing-toolbar" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="search-field" style={{ minWidth: "260px", flex: 1 }}>
            <label htmlFor="medicine-search">Search Medicine Catalog</label>
            <input
              id="medicine-search"
              type="search"
              value={searchTerm}
              placeholder="Search by code, medicine name, generic name..."
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-field" style={{ minWidth: "180px" }}>
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={handleCategoryChange}
            >
              <option value="All">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field" style={{ minWidth: "150px" }}>
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="DISCONTINUED">DISCONTINUED</option>
            </select>
          </div>

          {isFiltered && (
            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleClearFilters}
                style={{ height: "42px", padding: "0 14px" }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Error State Banner */}
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
            <p>Loading medicine catalog...</p>
          </div>
        )}

        {/* Populated Table */}
        {!loading && !error && medicines.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Medicine Name</th>
                  <th>Generic Name</th>
                  <th>Category</th>
                  <th>Dosage / Strength</th>
                  <th>Unit Price</th>
                  <th>Stock Available</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med) => {
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
                          title="View medicine batches and stock details"
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
                      </td>
                      <td style={{ color: "#4b5563" }}>{med.genericName || "-"}</td>
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
                        {typeof med.unitPrice === "number"
                          ? `$${med.unitPrice.toFixed(2)}`
                          : `$${parseFloat(med.unitPrice || 0).toFixed(2)}`}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: med.isLowStock ? "#dc2626" : "#16a34a",
                            }}
                          >
                            {med.totalStock ?? 0}
                          </span>
                          {med.isLowStock && (
                            <span
                              style={{
                                padding: "2px 6px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fca5a5",
                                color: "#b91c1c",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                              title={`Current stock (${med.totalStock ?? 0}) is at or below reorder level (${med.reorderLevel ?? 0})`}
                            >
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: "#6b7280" }}>{med.reorderLevel ?? "-"}</td>
                      <td>
                        <StatusBadge status={med.status || "Active"} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
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
                              className="secondary-button"
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                              onClick={() => navigate(`/pharmacy/medicines/${med.id}/edit`)}
                            >
                              Edit
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
        {!loading && !error && medicines.length === 0 && (
          <div className="empty-state">
            <p>
              {isFiltered
                ? "No medicines matched your search or filter criteria."
                : "No medicines registered in the catalog yet."}
            </p>
            {isFiltered && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleClearFilters}
                style={{ marginTop: "12px" }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Pharmacy;
