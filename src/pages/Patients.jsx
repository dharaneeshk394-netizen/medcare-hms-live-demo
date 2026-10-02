import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
  deletePatient,
  getPatients,
} from "../services/patientService";

import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { downloadExport } from "../utils/exportUtils";

function Patients() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExportPatients = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      setExportError("");
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm.trim());
      if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/v1/patients/export${qs}`;
      const defaultFilename = `medcare-patients-${new Date().toISOString().split("T")[0]}.csv`;
      await downloadExport(url, defaultFilename);
    } catch (err) {
      console.error("Failed to export patients:", err);
      setExportError(err.message || "Failed to export patients CSV.");
    } finally {
      setExporting(false);
    }
  };

  const patientsPerPage = 5;

  /*
  |--------------------------------------------------------------------------
  | Load patients from backend API
  |--------------------------------------------------------------------------
  */

  const loadPatients = async () => {
    try {
      const response = await getPatients();

      /*
       * Support different service response formats:
       *
       * 1. Direct array:
       *    [patient1, patient2]
       *
       * 2. API response:
       *    { success: true, data: [...] }
       *
       * 3. Axios-style response:
       *    { data: { success: true, data: [...] } }
       */

      let patientData = [];

      if (Array.isArray(response)) {
        patientData = response;
      } else if (Array.isArray(response?.data)) {
        patientData = response.data;
      } else if (Array.isArray(response?.data?.data)) {
        patientData = response.data.data;
      }

      setPatients(patientData);
    } catch (error) {
      console.warn("API connection failed for patients:", error.message);

      setPatients([]);

      setError(
        error.message ||
          "Failed to load patients. Please make sure the backend API is running."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load patients when page opens
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadPatients();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Search and filter
  |--------------------------------------------------------------------------
  */

  const filteredPatients = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return patients.filter((patient) => {
      /*
       * Backend uses:
       * name
       *
       * Older frontend mock data used:
       * firstName + lastName
       *
       * This supports both formats.
       */

      const fullName = (
        patient.name ||
        `${patient.firstName || ""} ${patient.lastName || ""}`
      )
        .toLowerCase()
        .trim();

      const patientId = String(
        patient.patientId || patient.id || ""
      ).toLowerCase();

      const phone = String(
        patient.phone || ""
      ).toLowerCase();

      const matchesSearch =
        fullName.includes(search) ||
        patientId.includes(search) ||
        phone.includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        patient.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredPatients.length / patientsPerPage
    )
  );

  const startIndex =
    (currentPage - 1) * patientsPerPage;

  const currentPatients = filteredPatients.slice(
    startIndex,
    startIndex + patientsPerPage
  );

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | Status filter
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | Delete patient
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (patient) => {
    const patientName =
      patient.name ||
      `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to delete ${patientName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deletePatient(patient.id);

      await loadPatients();

      setCurrentPage(1);
    } catch (error) {
      console.warn("Failed to delete patient:", error.message);

      setError(
        error.message ||
          "Failed to delete patient. Please try again."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Patient name helper
  |--------------------------------------------------------------------------
  */

  const getPatientName = (patient) => {
    if (patient.name) {
      return patient.name;
    }

    return `${patient.firstName || ""} ${
      patient.lastName || ""
    }`.trim();
  };

  /*
  |--------------------------------------------------------------------------
  | Patient ID helper
  |--------------------------------------------------------------------------
  */

  const getPatientId = (patient) => {
    return patient.patientId || patient.id;
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Patients</h2>

          <p>
            Manage hospital patient records.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportPatients}
            disabled={loading || exporting}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Export filtered patients to CSV"
          >
            <Icon name="download" size={15} /> {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/patients/add")}
          >
            + Add Patient
          </button>
        </div>
      </div>

      {exportError && (
        <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
          <Icon name="warning" size={16} inline style={{ marginRight: "6px" }} />
          {exportError}
        </div>
      )}

      {loading && (
        <section className="dashboard-section">
          <p>Loading patient records...</p>
        </section>
      )}

      {error && (
        <section className="dashboard-section">
          <h3>Unable to load patient data</h3>

          <p>{error}</p>

          <button
            type="button"
            className="primary-button"
            onClick={loadPatients}
          >
            Try Again
          </button>
        </section>
      )}

      <section className="dashboard-section">
        <div className="patient-toolbar">
          <div className="search-field">
            <label htmlFor="patient-search">
              Search patients
            </label>

            <input
              id="patient-search"
              type="search"
              value={searchTerm}
              placeholder="Search by name, ID, or phone..."
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="status-filter">
              Status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Blood Group</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentPatients.length > 0 ? (
                currentPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      {getPatientId(patient)}
                    </td>

                    <td>
                      <strong>
                        {getPatientName(patient)}
                      </strong>
                    </td>

                    <td>{patient.age}</td>

                    <td>{patient.gender}</td>

                    <td>
                      {patient.bloodGroup || "-"}
                    </td>

                    <td>{patient.phone}</td>

                    <td>
                      <StatusBadge
                        status={patient.status}
                      />
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            navigate(
                              `/patients/edit/${patient.id}`
                            )
                          }
                        >
                          Edit
                        </button>

                        {user?.role === "admin" && (
                          <button
                            type="button"
                            className="small-button danger-button"
                            onClick={() =>
                              handleDelete(patient)
                            }
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
                    <td
                      colSpan="8"
                      className="empty-state"
                    >
                      <strong>
                        No patients found
                      </strong>

                      <p>
                        {searchTerm ||
                        statusFilter !== "All"
                          ? "Try changing your search or filter."
                          : "There are currently no patient records."}
                      </p>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredPatients.length > 0 && (
          <div className="pagination-container">
            <p className="pagination-info">
              Showing{" "}
              {startIndex + 1}–
              {Math.min(
                startIndex + patientsPerPage,
                filteredPatients.length
              )}{" "}
              of {filteredPatients.length} patients
            </p>

            <div className="pagination-controls">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(page - 1, 1)
                  )
                }
              >
                Previous
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={
                    currentPage === page
                      ? "active-page"
                      : ""
                  }
                  onClick={() =>
                    setCurrentPage(page)
                  }
                  aria-current={
                    currentPage === page
                      ? "page"
                      : undefined
                  }
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={
                  currentPage === totalPages
                }
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(
                      page + 1,
                      totalPages
                    )
                  )
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

export default Patients;