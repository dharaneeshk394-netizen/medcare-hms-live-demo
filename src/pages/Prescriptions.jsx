import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { getPrescriptions } from "../services/prescriptionService";

function Prescriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "doctor";

  // Data state
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
   * Load prescriptions from backend via prescriptionService.
   */
  const loadPrescriptions = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError("");

    try {
      const filters = {
        page: currentPage,
        limit: pageSize,
      };

      if (debouncedSearch) {
        filters.search = debouncedSearch;
      }

      if (statusFilter && statusFilter !== "All") {
        filters.status = statusFilter;
      }

      const response = await getPrescriptions(filters);

      if (currentRequestId === requestIdRef.current) {
        let list = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (Array.isArray(response?.data)) {
          list = response.data;
        } else if (Array.isArray(response?.prescriptions)) {
          list = response.prescriptions;
        }

        setPrescriptions(list);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.warn("Failed to load prescriptions:", err.message);
        setPrescriptions([]);
        setError(
          err.message ||
            "Failed to load prescriptions. Please make sure the backend API is running."
        );
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, debouncedSearch, statusFilter]);

  // Trigger data fetch when parameters change
  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  // Handlers for filter controls
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("All");
    setCurrentPage(1);
  };

  const isFiltered = Boolean(searchTerm) || statusFilter !== "All";

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return dateString;
    }
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text || typeof text !== "string") return "-";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Prescriptions</h2>
          <p>Manage and review patient prescription records.</p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/prescriptions/add")}
          >
            + Create Prescription
          </button>
        )}
      </div>

      {/* Main Table Section */}
      <section className="dashboard-section">
        {/* Toolbar with Search and Status Filter */}
        <div className="prescription-toolbar billing-toolbar">
          <div className="search-field" style={{ minWidth: "240px" }}>
            <label htmlFor="prescription-search">Search Prescriptions</label>
            <input
              id="prescription-search"
              type="search"
              value={searchTerm}
              placeholder="Search prescription #, patient, doctor, diagnosis..."
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {isFiltered && (
            <div style={{ alignSelf: "flex-end", paddingBottom: "2px" }}>
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

        {/* Loading State */}
        {loading && (
          <div className="empty-state">
            <p>Loading prescriptions...</p>
          </div>
        )}

        {/* Error State with Retry Button */}
        {error && !loading && (
          <div className="empty-state" style={{ padding: "36px 20px" }}>
            <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>
              Unable to load prescription data
            </h3>
            <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto 20px" }}>
              {error}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={loadPrescriptions}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Data Table */}
        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Prescription #</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Prescription Date</th>
                  <th>Diagnosis / Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.length > 0 ? (
                  prescriptions.map((rx) => (
                    <tr key={rx.id}>
                      <td>
                        <strong>
                          {rx.prescriptionNumber || rx.prescription_number || `RX-${rx.id}`}
                        </strong>
                      </td>
                      <td>
                        <strong>{rx.patientName || "Unknown Patient"}</strong>
                        {(rx.patientCode || rx.patient_code) && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            {rx.patientCode || rx.patient_code}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{rx.doctorName || "Unknown Doctor"}</strong>
                        {(rx.doctorSpecialization || rx.specialization) && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            {rx.doctorSpecialization || rx.specialization}
                          </span>
                        )}
                      </td>
                      <td>{formatDate(rx.prescriptionDate || rx.prescription_date)}</td>
                      <td>
                        <span title={rx.diagnosisNotes || rx.diagnosis_notes || "-"}>
                          {truncateText(rx.diagnosisNotes || rx.diagnosis_notes, 60)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={rx.status} />
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="small-button"
                            onClick={() => navigate(`/prescriptions/${rx.id}`)}
                            aria-label={`View details for prescription ${
                              rx.prescriptionNumber || rx.id
                            }`}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      <strong>No prescriptions found</strong>
                      <p style={{ marginTop: "4px" }}>
                        {isFiltered
                          ? "No prescriptions match your current search or filter criteria."
                          : "There are currently no prescription records in the system."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && (
          <div className="pagination-container">
            <p className="pagination-info">
              Page {currentPage}
              {prescriptions.length > 0 &&
                ` • Showing ${prescriptions.length} ${
                  prescriptions.length === 1 ? "prescription" : "prescriptions"
                }`}
            </p>
            <div className="pagination-controls">
              <button
                type="button"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="active-page"
                aria-current="page"
                style={{ cursor: "default" }}
              >
                {currentPage}
              </button>
              <button
                type="button"
                disabled={prescriptions.length < pageSize || loading}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Prescriptions;
