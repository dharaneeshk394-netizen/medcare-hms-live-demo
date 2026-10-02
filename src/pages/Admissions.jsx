import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import {
  deleteAdmission,
  getAdmissions,
} from "../services/admissionService";

function Admissions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [admissions, setAdmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const admissionsPerPage = 5;

  const loadAdmissions = async () => {
    try {
      const response = await getAdmissions();

      let admissionData = [];
      if (Array.isArray(response)) {
        admissionData = response;
      } else if (Array.isArray(response?.data)) {
        admissionData = response.data;
      } else if (Array.isArray(response?.data?.data)) {
        admissionData = response.data.data;
      }

      setAdmissions(admissionData);
      setError("");
    } catch (err) {
      console.warn("API connection failed for admissions:", err.message);
      setAdmissions([]);
      setError(
        err.message ||
          "Failed to load admissions. Please make sure the backend API is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  const filteredAdmissions = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return admissions.filter((admission) => {
      const patientName = (admission.patientName || "").toLowerCase();
      const patientCode = (admission.patientCode || "").toLowerCase();
      const doctorName = (admission.doctorName || "").toLowerCase();
      const admissionId = String(
        admission.admissionId || admission.id || ""
      ).toLowerCase();
      const roomNumber = String(admission.roomNumber || "").toLowerCase();
      const bedNumber = String(admission.bedNumber || "").toLowerCase();
      const diagnosis = (admission.diagnosis || "").toLowerCase();

      const matchesSearch =
        !search ||
        patientName.includes(search) ||
        patientCode.includes(search) ||
        doctorName.includes(search) ||
        admissionId.includes(search) ||
        roomNumber.includes(search) ||
        bedNumber.includes(search) ||
        diagnosis.includes(search);

      const matchesStatus =
        statusFilter === "All" || admission.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [admissions, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAdmissions.length / admissionsPerPage)
  );

  const startIndex = (currentPage - 1) * admissionsPerPage;
  const currentAdmissions = filteredAdmissions.slice(
    startIndex,
    startIndex + admissionsPerPage
  );

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (admissionOrId) => {
    const targetId =
      typeof admissionOrId === "object" && admissionOrId !== null
        ? admissionOrId.id
        : admissionOrId;

    if (!targetId) {
      return;
    }

    try {
      setError("");
      await deleteAdmission(targetId);
      setAdmissions((previousAdmissions) =>
        previousAdmissions.filter(
          (item) =>
            item.id !== targetId &&
            item.admissionId !== String(targetId)
        )
      );
      await loadAdmissions();
      setCurrentPage(1);
    } catch (err) {
      console.warn("Failed to delete admission:", err.message);
      setError(
        err.message || "Failed to delete admission. Please try again."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Admissions</h2>
          <p>Manage hospital patient admissions and bed allocations.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("/admissions/add")}
        >
          + Add Admission
        </button>
      </div>

      {loading && (
        <section className="dashboard-section">
          <p>Loading admission records...</p>
        </section>
      )}

      {error && (
        <section className="dashboard-section">
          <h3>Unable to load admissions data</h3>
          <p>{error}</p>
          <button
            type="button"
            className="primary-button"
            onClick={loadAdmissions}
          >
            Try Again
          </button>
        </section>
      )}

      <section className="dashboard-section">
        <div className="patient-toolbar">
          <div className="search-field">
            <label htmlFor="admission-search">Search admissions</label>
            <input
              id="admission-search"
              type="search"
              value={searchTerm}
              placeholder="Search by patient, doctor, ID, room, or diagnosis..."
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
              <option value="All">All</option>
              <option value="Admitted">Admitted</option>
              <option value="Discharged">Discharged</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Admission ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Admission Date</th>
                <th>Expected Discharge</th>
                <th>Actual Discharge</th>
                <th>Diagnosis</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentAdmissions.length > 0 ? (
                currentAdmissions.map((admission) => (
                  <tr key={admission.id}>
                    <td>
                      <strong>
                        {admission.admissionId || `ADM${admission.id}`}
                      </strong>
                    </td>

                    <td>
                      <div>
                        <strong>{admission.patientName}</strong>
                        {admission.patientCode && (
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {admission.patientCode}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div>
                        {admission.doctorName}
                        {admission.specialization && (
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {admission.specialization}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>{admission.roomNumber || "-"}</td>
                    <td>{admission.bedNumber || "-"}</td>
                    <td>{formatDate(admission.admissionDate)}</td>
                    <td>{formatDate(admission.expectedDischargeDate)}</td>
                    <td>{formatDate(admission.actualDischargeDate)}</td>
                    <td>{admission.diagnosis || "-"}</td>

                    <td>
                      <StatusBadge status={admission.status} />
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            navigate(`/admissions/edit/${admission.id}`)
                          }
                        >
                          Edit
                        </button>

                        {user?.role === "admin" && (
                          <button
                            type="button"
                            className="small-button danger-button"
                            onClick={() => handleDelete(admission)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && (
                  <tr>
                    <td colSpan="11" className="empty-state">
                      <strong>No admissions found</strong>
                      <p>
                        {searchTerm || statusFilter !== "All"
                          ? "Try changing your search or filter."
                          : "There are currently no admission records."}
                      </p>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredAdmissions.length > 0 && (
          <div className="pagination-container">
            <p className="pagination-info">
              Showing {startIndex + 1}–
              {Math.min(
                startIndex + admissionsPerPage,
                filteredAdmissions.length
              )}{" "}
              of {filteredAdmissions.length} admissions
            </p>

            <div className="pagination-controls">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((page) => Math.max(page - 1, 1))
                }
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    type="button"
                    key={page}
                    className={currentPage === page ? "active-page" : ""}
                    onClick={() => setCurrentPage(page)}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages))
                }
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

export default Admissions;
