import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService";

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [filterIsRead, setFilterIsRead] = useState("All"); // "All", "unread"
  const [filterType, setFilterType] = useState("All"); // "All", "APPOINTMENT", etc.
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (filterIsRead === "unread") {
        params.isRead = false;
      }
      if (filterType !== "All") {
        params.type = filterType;
      }

      const data = await getNotifications(params);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [filterIsRead, filterType]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setError("");
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setError(err.message || "Failed to update notification.");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      setError("");
      setSuccessMsg("");
      await markAllAsRead();
      setSuccessMsg("All notifications marked as read.");
      await loadNotifications();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      setError(err.message || "Failed to update notifications.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
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
    });
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case "LAB_RESULT":
        return { backgroundColor: "#e0e7ff", color: "#3730a3" };
      case "PHARMACY":
        return { backgroundColor: "#dcfce7", color: "#166534" };
      case "APPOINTMENT":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      case "BILLING":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      case "ADMISSION":
        return { backgroundColor: "#f3e8ff", color: "#6b21a8" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Notification Center</h2>
          <p>Real-time alerts regarding patient appointments, lab results, prescriptions, and system notices.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="primary-button"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? "Processing..." : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Icon name="check" size={16} /> Mark All as Read
              </span>
            )}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={loadNotifications}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        {/* Toolbar / Filters */}
        <div
          className="prescription-toolbar billing-toolbar"
          style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="filter-field" style={{ minWidth: "180px" }}>
            <label htmlFor="read-status-filter">Read Status</label>
            <select
              id="read-status-filter"
              value={filterIsRead}
              onChange={(e) => setFilterIsRead(e.target.value)}
            >
              <option value="All">All Notifications</option>
              <option value="unread">Unread Only</option>
            </select>
          </div>

          <div className="filter-field" style={{ minWidth: "200px" }}>
            <label htmlFor="type-filter">Category</label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="APPOINTMENT">APPOINTMENT</option>
              <option value="LAB_RESULT">LAB_RESULT</option>
              <option value="PHARMACY">PHARMACY</option>
              <option value="ADMISSION">ADMISSION</option>
              <option value="BILLING">BILLING</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>
        </div>

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
            <p>Loading notifications...</p>
          </div>
        )}

        {/* Notifications List */}
        {!loading && !error && notifications.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                style={{
                  padding: "16px",
                  backgroundColor: notif.isRead ? "#ffffff" : "#f0fdf4",
                  border: notif.isRead ? "1px solid #e5e7eb" : "1px solid #bbf7d0",
                  borderLeft: notif.isRead ? "1px solid #e5e7eb" : "4px solid #16a34a",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  transition: "all 0.15s ease-in-out",
                  boxShadow: notif.isRead ? "none" : "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        ...getTypeBadgeStyle(notif.type),
                      }}
                    >
                      {notif.type}
                    </span>
                    <h4 style={{ margin: 0, fontSize: "16px", color: "#111827", fontWeight: notif.isRead ? 500 : 700 }}>
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <span
                        style={{
                          backgroundColor: "#16a34a",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "10px",
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "6px 0 8px 0", fontSize: "14px", color: "#4b5563", lineHeight: "1.4" }}>
                    {notif.message}
                  </p>
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#9ca3af", alignItems: "center" }}>
                    <span>{formatDateTime(notif.createdAt)}</span>
                    {notif.link && (
                      <span style={{ color: "#2563eb", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        View Related Resource <Icon name="arrowRight" size={13} />
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  {!notif.isRead && (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && notifications.length === 0 && (
          <div className="empty-state">
            <div style={{ marginBottom: "8px", color: "#9ca3af" }}>
              <Icon name="bell" size={32} />
            </div>
            <h3>No Notifications Found</h3>
            <p>You have no notifications matching the selected filter criteria.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Notifications;
