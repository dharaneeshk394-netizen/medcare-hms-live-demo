import { useEffect, useState, useCallback } from "react";
import {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
} from "../services/userService";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";

function UserManagement() {
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination & Data States
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal / Action States
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Role Edit Modal
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newRoleValue, setNewRoleValue] = useState("receptionist");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Status Toggle Confirmation
  const [statusTargetUser, setStatusTargetUser] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        search: searchQuery.trim() || undefined,
        role: roleFilter !== "All" ? roleFilter : undefined,
        isActive:
          statusFilter === "Active"
            ? true
            : statusFilter === "Inactive"
            ? false
            : undefined,
        limit,
        offset,
      };

      const res = await listUsers(params);
      setUsers(Array.isArray(res?.data) ? res.data : []);
      setTotalCount(typeof res?.totalCount === "number" ? res.totalCount : 0);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err.message || "Failed to retrieve user accounts.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, limit, offset]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchUsers();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setRoleFilter("All");
    setStatusFilter("All");
    setOffset(0);
  };

  const handlePrevPage = () => {
    if (offset >= limit) {
      setOffset((prev) => Math.max(prev - limit, 0));
    }
  };

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      setOffset((prev) => prev + limit);
    }
  };

  const handleOpenDetails = async (id) => {
    try {
      setError("");
      const res = await getUserById(id);
      setSelectedUser(res?.data || res);
      setDetailsModalOpen(true);
    } catch (err) {
      console.error("Failed to load user details:", err);
      setError(err.message || "Failed to load user profile.");
    }
  };

  const handleOpenRoleModal = (user) => {
    setRoleModalUser(user);
    setNewRoleValue(user.role || "receptionist");
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleModalUser) return;

    if (!window.confirm(`Are you sure you want to change role for ${roleModalUser.fullName} to ${newRoleValue.toUpperCase()}?`)) {
      return;
    }

    try {
      setIsUpdatingRole(true);
      setError("");
      setSuccessMsg("");
      await updateUserRole(roleModalUser.id, newRoleValue);
      setSuccessMsg(`Successfully updated role for ${roleModalUser.fullName}.`);
      setRoleModalUser(null);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to update user role:", err);
      setError(err.message || "Failed to update user role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.isActive;
    const actionLabel = nextStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${user.fullName}?`)) {
      return;
    }

    try {
      setStatusTargetUser(user.id);
      setError("");
      setSuccessMsg("");
      await updateUserStatus(user.id, nextStatus);
      setSuccessMsg(`Successfully ${nextStatus ? "activated" : "deactivated"} account for ${user.fullName}.`);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to update user status:", err);
      setError(err.message || "Failed to update account status.");
    } finally {
      setStatusTargetUser(null);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "admin":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      case "doctor":
        return { backgroundColor: "#e0e7ff", color: "#3730a3" };
      case "receptionist":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>User & Account Management</h2>
          <p>Manage system user accounts, role assignments, and active access privileges.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchUsers}
            disabled={loading}
          >
            {loading ? "Refreshing..." : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Icon name="refresh" size={14} /> Refresh Users
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="dashboard-section" style={{ marginBottom: "20px", padding: "16px 20px" }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="searchQuery" style={{ fontSize: "12px", fontWeight: 600 }}>Search User</label>
              <input
                id="searchQuery"
                type="text"
                placeholder="Name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </div>

            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="roleFilter" style={{ fontSize: "12px", fontWeight: 600 }}>Role</label>
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              >
                <option value="All">All Roles</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>

            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="statusFilter" style={{ fontSize: "12px", fontWeight: 600 }}>Account Status</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "center" }}>
            <button type="submit" className="primary-button" style={{ padding: "8px 16px" }} disabled={loading}>
              Search
            </button>
            <button type="button" className="secondary-button" style={{ padding: "8px 16px" }} onClick={handleClearFilters} disabled={loading}>
              Clear
            </button>
          </div>
        </form>
      </section>

      {/* Success Alert */}
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
            marginBottom: "20px",
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

      {/* Users Table Section */}
      <section className="dashboard-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "16px", margin: 0 }}>
            System Users ({totalCount} total)
          </h3>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading system users...</p>
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: "#1e40af" }}>{u.id}</td>
                      <td><strong>{u.fullName}</strong></td>
                      <td>{u.username}</td>
                      <td>{u.email || "-"}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            ...getRoleBadgeStyle(u.role),
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={u.isActive ? "Active" : "Inactive"} />
                      </td>
                      <td style={{ fontSize: "13px", color: "#4b5563" }}>
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            onClick={() => handleOpenDetails(u.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            onClick={() => handleOpenRoleModal(u)}
                          >
                            Edit Role
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              color: u.isActive ? "#991b1b" : "#065f46",
                              borderColor: u.isActive ? "#fca5a5" : "#6ee7b7",
                            }}
                            onClick={() => handleToggleStatus(u)}
                            disabled={statusTargetUser === u.id}
                          >
                            {statusTargetUser === u.id
                              ? "Updating..."
                              : u.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handlePrevPage}
                disabled={offset === 0 || loading}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Icon name="arrow-left" size={14} /> Previous Page
              </button>
              <span style={{ fontSize: "14px", color: "#4b5563" }}>
                Showing <strong>{offset + 1}</strong> to <strong>{Math.min(offset + limit, totalCount)}</strong> of <strong>{totalCount}</strong> users
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={handleNextPage}
                disabled={offset + limit >= totalCount || loading}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                Next Page <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No user accounts found matching the criteria.</p>
          </div>
        )}
      </section>

      {/* User Details Modal */}
      {detailsModalOpen && selectedUser && (
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
              maxWidth: "480px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>User Profile Details</h3>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "inline-flex", alignItems: "center" }}
              >
                <Icon name="x" size={18} ariaLabel="Close dialog" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", marginBottom: "20px" }}>
              <div><strong>ID:</strong> {selectedUser.id}</div>
              <div><strong>Full Name:</strong> {selectedUser.fullName}</div>
              <div><strong>Username:</strong> {selectedUser.username}</div>
              <div><strong>Email:</strong> {selectedUser.email || "N/A"}</div>
              <div><strong>Role:</strong> {selectedUser.role ? selectedUser.role.toUpperCase() : "N/A"}</div>
              <div><strong>Account Status:</strong> {selectedUser.isActive ? "Active" : "Inactive"}</div>
              <div><strong>Doctor ID Link:</strong> {selectedUser.doctorId || "None"}</div>
              <div><strong>Created At:</strong> {formatDateTime(selectedUser.createdAt)}</div>
              <div><strong>Updated At:</strong> {formatDateTime(selectedUser.updatedAt)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDetailsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {roleModalUser && (
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
              maxWidth: "420px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>Change User Role</h3>
            <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px" }}>
              Update access role for <strong>{roleModalUser.fullName}</strong> (@{roleModalUser.username}).
            </p>

            <form onSubmit={handleSaveRole}>
              <div className="form-field" style={{ marginBottom: "20px" }}>
                <label htmlFor="newRoleSelect">Select New Role *</label>
                <select
                  id="newRoleSelect"
                  value={newRoleValue}
                  onChange={(e) => setNewRoleValue(e.target.value)}
                  disabled={isUpdatingRole}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", width: "100%" }}
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setRoleModalUser(null)}
                  disabled={isUpdatingRole}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isUpdatingRole}
                >
                  {isUpdatingRole ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
