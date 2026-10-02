import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { getMedicalRecords } from "../services/medicalRecordService";

function MedicalRecords() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "doctor";
  const canEdit = user?.role === "admin" || user?.role === "doctor";

  // Data state
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
   * Load medical records from backend via medicalRecordService.
   */
  const loadMedicalRecords = useCallback(async () => {
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

      if (recordTypeFilter && recordTypeFilter !== "All") {
        filters.recordType = recordTypeFilter;
      }

      if (statusFilter && statusFilter !== "All") {
        filters.status = statusFilter;
      }

      const response = await getMedicalRecords(filters);

      if (currentRequestId === requestIdRef.current) {
        let list = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (Array.isArray(response?.data)) {
          list = response.data;
          if (response.pagination?.totalPages) {
            setTotalPages(response.pagination.totalPages);
          }
        }

        setRecords(list);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.warn("Failed to load medical records:", err.message);
        setRecords([]);
        setError(
          err.message ||
            "Failed to load medical records. Please ensure the backend API is running."
        );
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, debouncedSearch, recordTypeFilter, statusFilter]);

  useEffect(() => {
    loadMedicalRecords();
  }, [loadMedicalRecords]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeChange = (e) => {
    setRecordTypeFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Medical Records</h1>
          <p className="page-subtitle">
            Manage electronic medical records, clinical notes, and patient diagnoses
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="action-button primary-button"
            onClick={() => navigate("/medical-records/add")}
            id="add-medical-record-btn"
          >
            + Create Medical Record
          </button>
        )}
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="error-banner" style={{ marginBottom: "20px" }}>
          <span>{error}</span>
          <button
            type="button"
            className="small-button secondary-button"
            onClick={loadMedicalRecords}
            style={{ marginLeft: "12px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-card" style={{ marginBottom: "20px" }}>
        <div className="filter-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by diagnosis, record #, patient, doctor..."
              value={searchTerm}
              onChange={handleSearchChange}
              id="medical-records-search"
            />
          </div>

          <div style={{ width: "180px" }}>
            <select
              className="form-control"
              value={recordTypeFilter}
              onChange={handleTypeChange}
              id="record-type-filter"
            >
              <option value="All">All Types</option>
              <option value="General">General</option>
              <option value="Consultation">Consultation</option>
              <option value="Lab Result">Lab Result</option>
              <option value="Operative Note">Operative Note</option>
              <option value="Progress Note">Progress Note</option>
              <option value="Discharge Summary">Discharge Summary</option>
            </select>
          </div>

          <div style={{ width: "160px" }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={handleStatusChange}
              id="record-status-filter"
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="AMENDED">Amended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            Loading medical records...
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            <h3>No medical records found</h3>
            <p>Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Record #</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Diagnosis</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} id={`medical-record-row-${rec.id}`}>
                    <td style={{ fontWeight: 600, color: "#2563eb" }}>
                      {rec.recordNumber || `MR-${String(rec.id).padStart(6, "0")}`}
                    </td>

                    <td>
                      <div style={{ fontWeight: 500 }}>{rec.patientName || "—"}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {rec.patientCode ? `ID: ${rec.patientCode}` : ""}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 500 }}>{rec.doctorName || "—"}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {rec.doctorSpecialization || ""}
                      </div>
                    </td>

                    <td>{rec.recordDate || "—"}</td>

                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: "#f3f4f6",
                          color: "#374151",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        {rec.recordType || "General"}
                      </span>
                    </td>

                    <td style={{ maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {rec.diagnosis || "—"}
                    </td>

                    <td>
                      <StatusBadge status={rec.status || "ACTIVE"} />
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="small-button secondary-button"
                          onClick={() => navigate(`/medical-records/${rec.id}`)}
                          id={`view-record-${rec.id}`}
                        >
                          View
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            className="small-button outline-button"
                            onClick={() => navigate(`/medical-records/${rec.id}/edit`)}
                            id={`edit-record-${rec.id}`}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            className="pagination-bar"
            style={{
              display: "flex",
              justify: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              Page {currentPage} of {totalPages}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="small-button secondary-button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="small-button secondary-button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MedicalRecords;
