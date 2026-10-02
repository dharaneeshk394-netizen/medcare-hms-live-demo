import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import DemoTourModal from "../components/DemoTourModal";

/**
 * Login Component
 *
 * Professional commercial demo login screen for MedCare Hospital Management System.
 * Features:
 * - One-click instant demo role logins (Administrator, Doctor, Receptionist)
 * - Copyable credentials with tooltip feedback
 * - Clear disclosure of role scopes and permissions
 * - Interactive Buyer Product Tour & Exploration Guide modal
 * - Standard manual credentials form with accessibility & validation
 */
function Login() {
  const { login, error: contextError } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const demoRoles = [
    {
      id: "admin",
      title: "Administrator",
      username: "admin",
      password: "Demo@1234",
      badgeColor: "#1d4ed8",
      badgeBg: "#dbeafe",
      borderColor: "#bfdbfe",
      scope: "Full Hospital Governance",
      description: "Settings, Users, Staff, Audit Logs, Analytics & CSV Exports, All Modules",
    },
    {
      id: "doctor",
      title: "Doctor",
      username: "dr.sarah",
      password: "Demo@1234",
      badgeColor: "#15803d",
      badgeBg: "#dcfce7",
      borderColor: "#bbf7d0",
      scope: "Inpatient & Outpatient Care",
      description: "Patients, Appointments, e-Prescriptions, EMR Records, Lab Results & Orders",
    },
    {
      id: "receptionist",
      title: "Receptionist",
      username: "receptionist",
      password: "Demo@1234",
      badgeColor: "#b45309",
      badgeBg: "#fef3c7",
      borderColor: "#fde68a",
      scope: "Front Desk & Billing Flow",
      description: "Patient Registration, Appointment Booking, Bed Admissions, Invoicing & Payments",
    },
  ];

  const handleCopy = (text, fieldKey) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleFillCredentials = (username, password) => {
    setFormData({ username, password });
    setFormErrors({});
    setErrorMessage("");
  };

  const handleOneClickLogin = async (username, password) => {
    setFormData({ username, password });
    setFormErrors({});
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login({
        username,
        password,
      });
    } catch (err) {
      setErrorMessage(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
    setErrorMessage("");
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = "Username or email is required.";
    }
    if (!formData.password) {
      errors.password = "Password is required.";
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await login({
        username: formData.username.trim(),
        password: formData.password,
      });
    } catch (err) {
      setErrorMessage(err.message || "Invalid username or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = errorMessage || contextError;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            background: "linear-gradient(to right, #ffffff, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
                boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.3)",
              }}
            >
              +
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
                  MedCare Hospital System
                </h1>
                <span
                  style={{
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Commercial Demo
                </span>
              </div>
              <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                Enterprise Clinical & Administrative Healthcare Operations Platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            <span>✨</span> Buyer Exploration Guide
          </button>
        </div>

        {/* Notice Strip */}
        <div
          style={{
            padding: "10px 32px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
            fontSize: "12px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span>
            <strong>Local Demo Environment:</strong> Fictional evaluation data pre-loaded across 18 modules. Password: <code style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: "4px", color: "#0f172a" }}>Demo@1234</code>
          </span>
          <span style={{ color: "#94a3b8" }}>
            Safe Fictional Dataset &bull; No Real Patient Info &bull; Idempotent Seed
          </span>
        </div>

        {/* Main Content Area */}
        <div
          style={{
            padding: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "32px",
          }}
        >
          {/* Left Column: Quick Role Sign-In Cards */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Select a Role to Experience MedCare HMS
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                Click "1-Click Sign In" on any role to immediately test role-based access control (RBAC).
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {demoRoles.map((role) => (
                <div
                  key={role.id}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: `1px solid ${role.borderColor}`,
                    backgroundColor: "#ffffff",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          backgroundColor: role.badgeBg,
                          color: role.badgeColor,
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          textTransform: "uppercase",
                        }}
                      >
                        {role.title}
                      </span>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {role.scope}
                      </strong>
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(role.username, `${role.id}-user`)}
                        title="Copy username"
                        style={{
                          padding: "2px 6px",
                          fontSize: "11px",
                          borderRadius: "4px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          color: "#475569",
                          cursor: "pointer",
                        }}
                      >
                        {copiedField === `${role.id}-user` ? "Copied!" : `Copy User (${role.username})`}
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                    {role.description}
                  </p>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleOneClickLogin(role.username, role.password)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "13px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: role.badgeColor,
                        color: "#ffffff",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        opacity: isSubmitting ? 0.7 : 1,
                        transition: "background-color 0.2s",
                      }}
                    >
                      {isSubmitting ? "Signing in..." : `1-Click Sign In (${role.title})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillCredentials(role.username, role.password)}
                      title="Fill into form without submitting"
                      style={{
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 500,
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#f8fafc",
                        color: "#334155",
                        cursor: "pointer",
                      }}
                    >
                      Fill Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Standard Authentication Form */}
          <div
            style={{
              padding: "24px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Manual Sign In
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                Enter custom credentials or verify input sanitization.
              </p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#b91c1c",
                  fontSize: "13px",
                  marginBottom: "16px",
                  lineHeight: 1.4,
                }}
              >
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field" style={{ marginBottom: "16px" }}>
                <label htmlFor="login-username" style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Username or Email <span aria-hidden="true">*</span>
                </label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. admin or dr.sarah"
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-invalid={Boolean(formErrors.username)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: formErrors.username ? "1px solid #ef4444" : "1px solid #cbd5e1",
                    fontSize: "14px",
                    marginTop: "4px",
                  }}
                />
                {formErrors.username && (
                  <p className="form-error" style={{ margin: "4px 0 0", fontSize: "12px", color: "#ef4444" }}>
                    {formErrors.username}
                  </p>
                )}
              </div>

              <div className="form-field" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="login-password" style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                    Password <span aria-hidden="true">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy("Demo@1234", "demo-pwd")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "11px",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {copiedField === "demo-pwd" ? "Copied!" : "Copy Demo Password"}
                  </button>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-invalid={Boolean(formErrors.password)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: formErrors.password ? "1px solid #ef4444" : "1px solid #cbd5e1",
                    fontSize: "14px",
                    marginTop: "4px",
                  }}
                />
                {formErrors.password && (
                  <p className="form-error" style={{ margin: "4px 0 0", fontSize: "12px", color: "#ef4444" }}>
                    {formErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                }}
              >
                {isSubmitting ? "Authenticating Session..." : "Sign In with Credentials"}
              </button>
            </form>

            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "12px", color: "#64748b" }}>
              <p style={{ margin: 0 }}>
                <strong>Security Architecture:</strong> Protected by HttpOnly session cookies (<code>hms_sid</code>), bcrypt 10-round password hashing, and express-rate-limit brute force defense.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer Tour Modal */}
      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        currentRole="Guest / Login Screen"
        onSwitchRole={(role) => {
          setIsTourOpen(false);
          const found = demoRoles.find((r) => r.id === role || r.username === role);
          if (found) {
            handleOneClickLogin(found.username, found.password);
          }
        }}
      />
    </div>
  );
}

export default Login;
