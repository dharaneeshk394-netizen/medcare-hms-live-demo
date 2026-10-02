import { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../services/notificationService";
import Icon from "./Icon";
import DemoTourModal from "./DemoTourModal";

/**
 * Format the user role into a user-friendly display string.
 * Examples:
 *   admin -> Administrator
 *   doctor -> Doctor
 *   receptionist -> Receptionist
 */
function formatRole(role) {
  if (!role) return "Staff";

  const normalized = String(role).toLowerCase().trim();
  switch (normalized) {
    case "admin":
      return "Administrator";
    case "doctor":
      return "Doctor";
    case "receptionist":
      return "Receptionist";
    case "nurse":
      return "Nurse";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

/**
 * Extract the first initial of the user's name for the avatar badge.
 * Examples:
 *   "John Smith" -> "J"
 *   "Aravind Kumar" -> "A"
 */
function getInitial(name) {
  if (!name || typeof name !== "string") return "U";
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "U";
}

function AppLayout({ children }) {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const getNavClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  const displayName =
    user?.fullName || user?.full_name || user?.username || "Staff User";
  const displayRole = formatRole(user?.role);
  const avatarInitial = getInitial(displayName);

  // Preserve existing role-based access control for navigation visibility
  const userRole = user?.role ? String(user.role).toLowerCase() : "";
  const canAccessMedicalRecords = !userRole || ["admin", "doctor", "receptionist"].includes(userRole);
  const canAccessStaff = !userRole || ["admin", "doctor", "receptionist"].includes(userRole);
  const canAccessBilling = !userRole || ["admin", "receptionist", "doctor"].includes(userRole);
  const canAccessPharmacy = !userRole || ["admin", "doctor", "receptionist"].includes(userRole);
  const canAccessLaboratory = !userRole || ["admin", "doctor", "receptionist"].includes(userRole);
  const canAccessReports = !userRole || ["admin", "doctor"].includes(userRole);
  const canAccessAuditLogs = userRole === "admin";
  const canAccessUsers = userRole === "admin";
  const canAccessSettings = userRole === "admin";

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore network errors silently
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 45000);
      return () => clearInterval(interval);
    }
  }, [user, fetchUnread]);

  const handleQuickSwitchRole = async (targetUsername) => {
    if (isSwitchingRole) return;
    try {
      setIsSwitchingRole(true);
      await logout();
      await login({ username: targetUsername, password: "Demo@1234" });
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to switch demo role:", err);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } catch {
      // Even if network fails, ensure state clears and navigates
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="app-layout">
      {/* Accessible skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="sidebar" aria-label="Sidebar navigation">
        <div className="hospital-brand">
          <div className="brand-icon" aria-hidden="true">+</div>

          <div>
            <h2>MedCare</h2>
            <p>Hospital System</p>
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Main navigation"
        >
          <NavLink
            to="/dashboard"
            className={getNavClass}
          >
            <Icon name="dashboard" size={18} />
            Dashboard
          </NavLink>

          <NavLink
            to="/patients"
            className={getNavClass}
          >
            <Icon name="patients" size={18} />
            Patients
          </NavLink>

          <NavLink
            to="/doctors"
            className={getNavClass}
          >
            <Icon name="doctors" size={18} />
            Doctors
          </NavLink>

          <NavLink
            to="/appointments"
            className={getNavClass}
          >
            <Icon name="appointments" size={18} />
            Appointments
          </NavLink>

          <NavLink
            to="/prescriptions"
            className={getNavClass}
          >
            <Icon name="prescriptions" size={18} />
            Prescriptions
          </NavLink>

          {canAccessMedicalRecords && (
            <NavLink
              to="/medical-records"
              className={getNavClass}
            >
              <Icon name="medicalRecords" size={18} />
              Medical Records
            </NavLink>
          )}

          <NavLink
            to="/admissions"
            className={getNavClass}
          >
            <Icon name="admissions" size={18} />
            Admissions
          </NavLink>

          <NavLink
            to="/departments"
            className={getNavClass}
          >
            <Icon name="departments" size={18} />
            Departments
          </NavLink>

          {canAccessStaff && (
            <NavLink
              to="/staff"
              className={getNavClass}
            >
              <Icon name="staff" size={18} />
              Staff
            </NavLink>
          )}

          {canAccessBilling && (
            <NavLink
              to="/billing"
              className={getNavClass}
            >
              <Icon name="billing" size={18} />
              Billing
            </NavLink>
          )}

          {canAccessPharmacy && (
            <NavLink
              to="/pharmacy"
              className={getNavClass}
            >
              <Icon name="pharmacy" size={18} />
              Pharmacy
            </NavLink>
          )}

          {canAccessLaboratory && (
            <NavLink
              to="/laboratory"
              className={getNavClass}
            >
              <Icon name="laboratory" size={18} />
              Laboratory
            </NavLink>
          )}

          {canAccessReports && (
            <NavLink
              to="/reports"
              className={getNavClass}
            >
              <Icon name="reports" size={18} />
              Reports & Analytics
            </NavLink>
          )}

          {canAccessAuditLogs && (
            <NavLink
              to="/audit-logs"
              className={getNavClass}
            >
              <Icon name="auditLogs" size={18} />
              Audit Logs
            </NavLink>
          )}

          {canAccessUsers && (
            <NavLink
              to="/users"
              className={getNavClass}
            >
              <Icon name="userCog" size={18} />
              User Management
            </NavLink>
          )}

          {canAccessSettings && (
            <NavLink
              to="/settings"
              className={getNavClass}
            >
              <Icon name="settings" size={18} />
              System Settings
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="main-area">
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1>Hospital Management System</h1>

            {/* Buyer Product Tour Button */}
            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1d4ed8",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Open Buyer Guided Walkthrough & Role Tour"
            >
              <span>✨</span> Buyer Tour Guide
            </button>

            {/* In-App Quick Demo Role Switcher */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
              <span style={{ color: "#64748b", fontWeight: 500 }}>Demo Role:</span>
              <select
                value={user?.username || (userRole === "admin" ? "admin" : userRole === "doctor" ? "dr.sarah" : "receptionist")}
                onChange={(e) => handleQuickSwitchRole(e.target.value)}
                disabled={isSwitchingRole}
                aria-label="Switch Demo Role"
                style={{
                  padding: "3px 8px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: isSwitchingRole ? "wait" : "pointer",
                }}
              >
                <option value="admin">Administrator (admin)</option>
                <option value="dr.sarah">Doctor (dr.sarah)</option>
                <option value="receptionist">Receptionist (receptionist)</option>
              </select>
              {isSwitchingRole && <span style={{ fontSize: "11px", color: "#2563eb" }}>Switching...</span>}
            </div>
          </div>

          <div className="header-user">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/notifications")}
              title="Notifications"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
              style={{
                position: "relative",
                padding: "6px 10px",
                fontSize: "14px",
                borderRadius: "6px",
                marginRight: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="bell" size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: "10px",
                    minWidth: "18px",
                    textAlign: "center",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className="user-avatar" aria-hidden="true">
              {avatarInitial}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>{displayRole}</span>
            </div>

            <button
              type="button"
              className="small-button danger-button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label={`Log out ${displayName}`}
              style={{
                marginLeft: "12px",
                cursor: isLoggingOut ? "not-allowed" : "pointer",
                opacity: isLoggingOut ? 0.6 : 1,
              }}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        <main className="page-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Buyer Guided Tour Modal */}
      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        currentRole={displayRole}
        onSwitchRole={(targetRole) => {
          setIsTourOpen(false);
          handleQuickSwitchRole(targetRole);
        }}
      />
    </div>
  );
}

export default AppLayout;
