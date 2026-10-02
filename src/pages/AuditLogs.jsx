import { useEffect, useState, useCallback } from "react";
import { listAuditLogs } from "../services/auditLogService";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";

function AuditLogs() {
  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");

  // Pagination & Data States
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");

  const fetchLogs = useCallback(async () => {
    setDateError("");
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setDateError("Start date cannot be after end date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        eventType: eventType.trim() || undefined,
        userId: userIdFilter ? parseInt(userIdFilter, 10) : undefined,
        action: actionFilter !== "All" ? actionFilter : undefined,
        outcome: outcomeFilter !== "All" ? outcomeFilter : undefined,
        limit,
        offset,
      };

      const res = await listAuditLogs(params);
      setLogs(Array.isArray(res?.data) ? res.data : []);
      setTotalCount(typeof res?.totalCount === "number" ? res.totalCount : 0);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError(err.message || "Failed to retrieve security audit logs.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, eventType, userIdFilter, actionFilter, outcomeFilter, limit, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0); // reset to first page
    fetchLogs();
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setEventType("");
    setUserIdFilter("");
    setActionFilter("All");
    setOutcomeFilter("All");
    setOffset(0);
    setDateError("");
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
      second: "2-digit",
    });
  };

  const getActionBadgeStyle = (action) => {
    switch (action) {
      case "CREATE":
        return { backgroundColor: "#dcfce7", color: "#166534" };
      case "UPDATE":
        return { backgroundColor: "#e0e7ff", color: "#3730a3" };
      case "DELETE":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      case "LOGIN":
      case "LOGOUT":
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
          <h2>Audit Logs & Security Compliance</h2>
          <p>Immutable security trail tracking user authentication, authorization, resource access, and administrative actions.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchLogs}
            disabled={loading}
          >
            {loading ? "Refreshing..." : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Icon name="refresh" size={14} /> Refresh Logs
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="dashboard-section" style={{ marginBottom: "20px", padding: "16px 20px" }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="startDate" style={{ fontSize: "12px", fontWeight: 600 }}>Start Date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </div>

            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="endDate" style={{ fontSize: "12px", fontWeight: 600 }}>End Date</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </div>

            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="eventType" style={{ fontSize: "12px", fontWeight: 600 }}>Event Type</label>
              <input
                id="eventType"
                type="text"
                placeholder="e.g. AUTH_LOGIN"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </div>

            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="userIdFilter" style={{ fontSize: "12px", fontWeight: 600 }}>User ID</label>
              <input
                id="userIdFilter"
                type="number"
                placeholder="e.g. 1"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </div>

            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="actionFilter" style={{ fontSize: "12px", fontWeight: 600 }}>Action</label>
              <select
                id="actionFilter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              >
                <option value="All">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="ACCESS">ACCESS</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="form-field" style={{ margin: 0 }}>
              <label htmlFor="outcomeFilter" style={{ fontSize: "12px", fontWeight: 600 }}>Outcome</label>
              <select
                id="outcomeFilter"
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                disabled={loading}
                style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              >
                <option value="All">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILURE">FAILURE</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "center" }}>
            <button type="submit" className="primary-button" style={{ padding: "8px 16px" }} disabled={loading}>
              Apply Filters
            </button>
            <button type="button" className="secondary-button" style={{ padding: "8px 16px" }} onClick={handleClearFilters} disabled={loading}>
              Clear
            </button>
          </div>
        </form>

        {dateError && <p className="form-error" style={{ marginTop: "8px" }}>{dateError}</p>}
      </section>

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

      {/* Main Table Section */}
      <section className="dashboard-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "16px", margin: 0 }}>
            Audit Records ({totalCount} total)
          </h3>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading audit trail records...</p>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Event Type</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Resource Type</th>
                    <th>Resource ID</th>
                    <th>Outcome</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: "13px", whiteSpace: "nowrap", color: "#374151" }}>
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td style={{ fontWeight: 600, color: "#1e40af", fontSize: "13px" }}>
                        {log.eventType}
                      </td>
                      <td>
                        {log.userId ? (
                          <span>
                            {log.userId}
                            {log.userName && <span style={{ color: "#6b7280", fontSize: "12px" }}> ({log.userName})</span>}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>System</span>
                        )}
                      </td>
                      <td>{log.role ? log.role.toUpperCase() : "-"}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            ...getActionBadgeStyle(log.action),
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>{log.resourceType || "-"}</td>
                      <td>{log.resourceId || "-"}</td>
                      <td>
                        <StatusBadge status={log.outcome || "SUCCESS"} />
                      </td>
                      <td style={{ fontSize: "12px", color: "#6b7280" }}>
                        {log.ipAddress || "-"}
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
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="arrowLeft" size={14} /> Previous Page
                </span>
              </button>
              <span style={{ fontSize: "14px", color: "#4b5563" }}>
                Showing <strong>{offset + 1}</strong> to <strong>{Math.min(offset + limit, totalCount)}</strong> of <strong>{totalCount}</strong> records
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={handleNextPage}
                disabled={offset + limit >= totalCount || loading}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  Next Page <Icon name="arrowRight" size={14} />
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No audit log records found matching the specified filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AuditLogs;
