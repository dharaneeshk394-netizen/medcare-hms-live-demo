import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getStaffById, deactivateStaff } from "../services/staffService";

function StaffDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStaffRecord() {
      try {
        setLoading(true);
        setError("");
        const data = await getStaffById(id);
        if (!isMounted) return;
        if (!data) {
          setError("Staff member record not found.");
        } else {
          setStaff(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading staff details:", err);
        setError(err.message || "Failed to load staff details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) {
      loadStaffRecord();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleDeactivate = async () => {
    if (!isAdmin || !staff) return;
    if (!window.confirm(`Are you sure you want to deactivate ${staff.fullName || staff.firstName}?`)) {
      return;
    }

    try {
      setIsDeactivating(true);
      setActionSuccess("");
      await deactivateStaff(staff.id);
      setActionSuccess("Staff member deactivated successfully.");
      const updated = await getStaffById(staff.id);
      setStaff(updated);
    } catch (err) {
      setError(err.message || "Failed to deactivate staff member.");
    } finally {
      setIsDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        Loading staff member details...
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div>
        <div
          role="alert"
          style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #fecaca",
          }}
        >
          {error || "Staff record could not be found."}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/staff")}
        >
          <Icon name="arrow-left" size={14} inline style={{ marginRight: "6px" }} /> Back to Staff List
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header and Actions Bar */}
      <div className="page-heading-with-action" style={{ marginBottom: "var(--space-6)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "4px" }}>
            <h2 className="page-title">{staff.fullName}</h2>
            <StatusBadge status={staff.employmentStatus || staff.status || "ACTIVE"} />
          </div>
          <p className="page-subtitle">
            Staff ID: <strong style={{ color: "var(--color-primary)" }}>{staff.staffNumber || `STF-${String(staff.id).padStart(6, "0")}`}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/staff")}
            id="back-to-staff-list"
          >
            <Icon name="arrow-left" size={14} inline style={{ marginRight: "6px" }} /> Back to Staff List
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                className="outline-button"
                onClick={() => navigate(`/staff/${staff.id}/edit`)}
                id="edit-staff-button"
              >
                Edit Details
              </button>
              {staff.employmentStatus !== "INACTIVE" && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                  id="deactivate-staff-button"
                >
                  {isDeactivating ? "Deactivating..." : "Deactivate Staff"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div role="status" className="alert alert-success">
          {actionSuccess}
        </div>
      )}

      {/* Detail Cards Layout */}
      <div className="detail-grid">
        {/* Professional Information */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          <h3 className="detail-card-header">
            Professional Details
          </h3>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">First Name</span>
              <strong className="detail-value">{staff.firstName}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Name</span>
              <strong className="detail-value">{staff.lastName}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Designation / Role</span>
              <strong className="detail-value">{staff.designation}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Assigned Department</span>
              <strong className="detail-value">{staff.departmentName || "None (General Hospital)"}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date of Joining</span>
              <strong className="detail-value">{staff.dateOfJoining || "—"}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Employment Status</span>
              <div>
                <StatusBadge status={staff.employmentStatus || "ACTIVE"} />
              </div>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          <h3 className="detail-card-header">
            Contact & Audit Details
          </h3>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Phone Number</span>
              <strong className="detail-value">{staff.phone}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email Address</span>
              <strong className="detail-value">{staff.email || "—"}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created By</span>
              <strong className="detail-value">{staff.createdByName || (staff.createdBy ? `User #${staff.createdBy}` : "System")}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Record Created</span>
              <span className="detail-value tabular-nums">
                {staff.createdAt ? new Date(staff.createdAt).toLocaleString() : "—"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value tabular-nums">
                {staff.updatedAt ? new Date(staff.updatedAt).toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StaffDetails;
