import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getStaff, deactivateStaff } from "../services/staffService";
import { getDepartments } from "../services/departmentService";

function Staff() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Data state
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Track latest request to avoid race conditions
  const requestIdRef = useRef(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load departments for filter dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadDepts() {
      try {
        const response = await getDepartments();
        if (!isMounted) return;
        const list = Array.isArray(response) ? response : response?.data || [];
        setDepartments(list);
      } catch (err) {
        console.warn("Failed to load departments for filter:", err);
      }
    }
    loadDepts();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Load staff members from backend API.
   */
  const loadStaffMembers = useCallback(async () => {
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
        filters.employmentStatus = statusFilter;
      }
      if (departmentFilter && departmentFilter !== "All") {
        filters.departmentId = departmentFilter;
      }

      const response = await getStaff(filters);

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
        setStaffList(list);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.error("Error loading staff:", err);
        setError(err.message || "Failed to load staff list. Please try again.");
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, debouncedSearch, statusFilter, departmentFilter]);

  useEffect(() => {
    loadStaffMembers();
  }, [loadStaffMembers]);

  // Handle Deactivation
  const handleDeactivate = async (staffMember) => {
    if (!isAdmin) return;
    const confirmMessage = `Are you sure you want to deactivate ${staffMember.fullName || staffMember.firstName}?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setActionSuccess("");
      await deactivateStaff(staffMember.id);
      setActionSuccess(`Staff member ${staffMember.fullName} deactivated successfully.`);
      loadStaffMembers();
    } catch (err) {
      setError(err.message || "Failed to deactivate staff member.");
    }
  };

  return (
    <div>
      {/* Page Heading & Header Actions */}
      <div
        className="page-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2>Staff Management</h2>
          <p>View and manage hospital healthcare, technical, and administrative staff.</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/staff/add")}
            id="add-staff-button"
          >
            <Icon name="plus" size={14} inline style={{ marginRight: "6px" }} /> Add Staff Member
          </button>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div
          role="status"
          style={{
            backgroundColor: "#dcfce7",
            color: "#15803d",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            border: "1px solid #bbf7d0",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#15803d",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Icon name="x" size={16} ariaLabel="Dismiss message" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            border: "1px solid #fecaca",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#b91c1c",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Icon name="x" size={16} ariaLabel="Dismiss error" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="dashboard-section" style={{ marginBottom: "20px" }}>
        <div className="filter-grid" style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ flex: "1 1 240px" }}>
            <label htmlFor="staff-search-input" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "#374151" }}>
              Search Staff
            </label>
            <input
              id="staff-search-input"
              type="text"
              placeholder="Search by name, ID, designation, phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ flex: "0 1 180px" }}>
            <label htmlFor="staff-department-filter" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "#374151" }}>
              Department
            </label>
            <select
              id="staff-department-filter"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%" }}
            >
              <option value="All">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 1 160px" }}>
            <label htmlFor="staff-status-filter" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "#374151" }}>
              Status
            </label>
            <select
              id="staff-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%" }}
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== "All" || departmentFilter !== "All") && (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="button"
                className="small-button secondary-button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setDepartmentFilter("All");
                  setCurrentPage(1);
                }}
                id="clear-staff-filters-button"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Staff Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            Loading staff records...
          </div>
        ) : staffList.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            <p style={{ margin: "0 0 12px 0", fontSize: "15px" }}>No staff records found.</p>
            {isAdmin && (
              <button
                type="button"
                className="small-button primary-button"
                onClick={() => navigate("/staff/add")}
              >
                Add Your First Staff Member
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" aria-label="Staff table">
              <thead>
                <tr>
                  <th scope="col">Staff ID</th>
                  <th scope="col">Full Name</th>
                  <th scope="col">Designation</th>
                  <th scope="col">Department</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Joined Date</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((member) => (
                  <tr key={member.id} id={`staff-row-${member.id}`}>
                    <td style={{ fontWeight: 600, color: "#2563eb" }}>
                      {member.staffNumber || `STF-${String(member.id).padStart(6, "0")}`}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{member.fullName}</div>
                      {member.email && (
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>{member.email}</div>
                      )}
                    </td>
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
                        {member.designation}
                      </span>
                    </td>
                    <td>{member.departmentName || "—"}</td>
                    <td>{member.phone || "—"}</td>
                    <td>{member.dateOfJoining || "—"}</td>
                    <td>
                      <StatusBadge status={member.employmentStatus || member.status || "ACTIVE"} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="small-button secondary-button"
                          onClick={() => navigate(`/staff/${member.id}`)}
                          id={`view-staff-${member.id}`}
                        >
                          View
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="small-button outline-button"
                              onClick={() => navigate(`/staff/${member.id}/edit`)}
                              id={`edit-staff-${member.id}`}
                            >
                              Edit
                            </button>
                            {member.employmentStatus !== "INACTIVE" && (
                              <button
                                type="button"
                                className="small-button danger-button"
                                onClick={() => handleDeactivate(member)}
                                id={`deactivate-staff-${member.id}`}
                                title="Deactivate Staff Member"
                              >
                                Deactivate
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            className="pagination-bar"
            style={{
              display: "flex",
              justifyContent: "space-between",
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

export default Staff;
