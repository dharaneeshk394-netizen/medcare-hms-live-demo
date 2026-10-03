import { useState } from "react";


/**
 * DemoTourModal Component
 *
 * Professional interactive evaluation tour and role-based access guide for MedCare HMS.
 * Provides buyers with:
 * - 5-Step Recommended Exploration Path
 * - Detailed Role Permission Matrix (Admin vs Doctor vs Receptionist)
 * - Module-by-module feature highlights
 * - One-click demo role switching
 */
function DemoTourModal({ isOpen, onClose, currentRole, onSwitchRole }) {
  const [activeTab, setActiveTab] = useState("path"); // "path" | "roles" | "modules"

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "840px",
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, #f8fafc, #eff6ff)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "20px",
              }}
            >
              +
            </div>
            <div>
              <h2
                id="tour-modal-title"
                style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}
              >
                MedCare HMS — Buyer Product Tour & Exploration Guide
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                Interactive commercial walkthrough and role-based feature evaluation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tour Modal"
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: "22px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            padding: "0 24px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("path")}
            style={{
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "path" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "path" ? "#2563eb" : "#64748b",
              background: "none",
              cursor: "pointer",
            }}
          >
            Recommended 5-Step Exploration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            style={{
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "roles" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "roles" ? "#2563eb" : "#64748b",
              background: "none",
              cursor: "pointer",
            }}
          >
            Role Permissions Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("modules")}
            style={{
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "modules" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "modules" ? "#2563eb" : "#64748b",
              background: "none",
              cursor: "pointer",
            }}
          >
            Key Commercial Capabilities
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
            fontSize: "14px",
            color: "#334155",
            lineHeight: 1.6,
          }}
        >
          {/* TAB 1: 5-STEP PATH */}
          {activeTab === "path" && (
            <div>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  fontSize: "13px",
                  color: "#1e40af",
                }}
              >
                <strong>Evaluation Tip:</strong> Follow this curated sequence to experience how clinical, administrative, and inventory data flows seamlessly across roles.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Step 1 */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          backgroundColor: "#dbeafe",
                          color: "#1d4ed8",
                          fontWeight: 700,
                          fontSize: "12px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        Step 1
                      </span>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        Administrator Dashboard & Institutional Settings
                      </h3>
                    </div>
                    {onSwitchRole && currentRole !== "admin" && (
                      <button
                        type="button"
                        onClick={() => onSwitchRole("admin")}
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#2563eb",
                          backgroundColor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Switch to Admin
                      </button>
                    )}
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#475569" }}>
                    Log in as <code>admin</code>. Inspect the comprehensive executive dashboard with active census stats and interactive charts. Then visit <strong>Settings</strong> to customize the hospital profile, official tax rates, and document headers. Check <strong>User Management</strong> to observe RBAC management and <strong>Audit Logs</strong> for tamper-evident activity tracking.
                  </p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "12px" }}>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/dashboard</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/settings</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/users</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/audit-logs</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          fontWeight: 700,
                          fontSize: "12px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        Step 2
                      </span>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        Doctor Clinical Workflow & Electronic Prescriptions
                      </h3>
                    </div>
                    {onSwitchRole && currentRole !== "doctor" && (
                      <button
                        type="button"
                        onClick={() => onSwitchRole("dr.sarah")}
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#16a34a",
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Switch to Doctor
                      </button>
                    )}
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#475569" }}>
                    Log in as <code>dr.sarah</code>. Review clinical appointments, access detailed patient medical records (EMR), write new multi-item electronic prescriptions, and click <strong>Print Prescription</strong> to preview the pixel-perfect A4 clinical print layout. Review diagnostic laboratory results and abnormal flags.
                  </p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "12px" }}>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/prescriptions</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/medical-records</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/appointments</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/laboratory</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          backgroundColor: "#fef3c7",
                          color: "#b45309",
                          fontWeight: 700,
                          fontSize: "12px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        Step 3
                      </span>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        Receptionist Front-Desk Operations & Invoicing
                      </h3>
                    </div>
                    {onSwitchRole && currentRole !== "receptionist" && (
                      <button
                        type="button"
                        onClick={() => onSwitchRole("receptionist")}
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#d97706",
                          backgroundColor: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Switch to Receptionist
                      </button>
                    )}
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#475569" }}>
                    Log in as <code>receptionist</code>. Experience fast patient intake, book an outpatient appointment with double-booking prevention, allocate an inpatient bed in <strong>Admissions</strong>, generate an itemized invoice, and record cash/card payments with automatic remaining balance updates. Test <strong>Print A4 Invoice</strong>.
                  </p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "12px" }}>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/patients</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/admissions</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/billing</span>
                  </div>
                </div>

                {/* Step 4 */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span
                      style={{
                        backgroundColor: "#f3e8ff",
                        color: "#7e22ce",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      Step 4
                    </span>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                      Pharmacy Formulary & Diagnostic Laboratory (LIS)
                    </h3>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#475569" }}>
                    Explore pharmacy stock management with multi-batch expiry dates, purchase vs selling prices, low-stock threshold triggers, and prescription-linked medication dispensations. Inspect the Laboratory test catalog, requisitions pipeline, specimen collection, and official <strong>Print A4 Lab Report</strong>.
                  </p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "12px" }}>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/pharmacy</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/pharmacy/low-stock</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/laboratory</span>
                  </div>
                </div>

                {/* Step 5 */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span
                      style={{
                        backgroundColor: "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      Step 5
                    </span>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                      Reports, Financial Analytics & CSV Data Export
                    </h3>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#475569" }}>
                    Navigate to <strong>Reports & Analytics</strong>. View cross-module KPI dashboards across Financial, Clinical, Pharmacy, and Laboratory metrics. Test the one-click <strong>CSV Export</strong> buttons on report and listing pages: verify that files download with UTF-8 BOM encoding for seamless Microsoft Excel opening and formula injection sanitization.
                  </p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "12px" }}>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>/reports</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>CSV Export System</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROLES MATRIX */}
          {activeTab === "roles" && (
            <div>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                MedCare HMS implements strict role-based access control (RBAC). Below is the permissions matrix across standard demo roles:
              </p>

              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 14px", fontWeight: 600 }}>System Module</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, color: "#1d4ed8" }}>Administrator (`admin`)</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, color: "#15803d" }}>Doctor (`dr.sarah`)</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, color: "#b45309" }}>Receptionist (`receptionist`)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Executive Dashboard", "Full Analytics & KPIs", "Clinical KPIs & Shifts", "Front-Desk Flow"],
                      ["Patients Management", "Full Read/Write", "Full Read/Write", "Full Read/Write"],
                      ["Appointments Scheduling", "Full Read/Write", "Full Read/Write", "Full Read/Write"],
                      ["Inpatient Admissions", "Full Read/Write", "Full Read/Write", "Full Read/Write"],
                      ["Electronic Prescriptions", "Full Read/Write", "Full Read/Write", "Read Only"],
                      ["Medical Records (EMR)", "Full Read/Write", "Full Read/Write", "Read Only"],
                      ["Staff & HR Directory", "Full Read/Write", "Read Only", "Read Only"],
                      ["Billing & Invoicing", "Full Read/Write", "Read Only", "Full Read/Write"],
                      ["Pharmacy & Inventory", "Full Read/Write", "Read & Dispense", "Read Only"],
                      ["Laboratory LIS Orders", "Full Read/Write", "Order & Verify", "Read Only"],
                      ["Reports & Analytics", "Full Access", "Clinical Reports Only", "No Access"],
                      ["System Audit Logs", "Full Access", "No Access", "No Access"],
                      ["Hospital Settings & Profile", "Full Access", "No Access", "No Access"],
                      ["User Account Administration", "Full Access", "No Access", "No Access"],
                      ["Financial Dataset Exports", "Allowed (Admin Only)", "Forbidden (403)", "Forbidden (403)"],
                    ].map(([module, admin, doc, rec], idx) => (
                      <tr
                        key={module}
                        style={{
                          borderBottom: idx === 14 ? "none" : "1px solid #f1f5f9",
                          backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                        }}
                      >
                        <td style={{ padding: "9px 14px", fontWeight: 500, color: "#0f172a" }}>{module}</td>
                        <td style={{ padding: "9px 14px", color: "#1e3a8a" }}>{admin}</td>
                        <td style={{ padding: "9px 14px", color: "#14532d" }}>{doc}</td>
                        <td style={{ padding: "9px 14px", color: "#78350f" }}>{rec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: KEY COMMERCIAL CAPABILITIES */}
          {activeTab === "modules" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "#0f172a" }}>
                  1. Browser-Native A4 Document Printing
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                  Produces professional hospital tax invoices, multi-item prescriptions, and diagnostic lab reports with dynamic hospital branding, official address, tax calculation, and print CSS isolating the document from navigation chrome.
                </p>
              </div>

              <div style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "#0f172a" }}>
                  2. RFC 4180 CSV Data Export with Excel UTF-8 BOM
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                  All key operational tables support structured data export with Byte Order Mark (BOM) for zero-formatting Excel opening and formula injection sanitization defending against DDE vulnerabilities.
                </p>
              </div>

              <div style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "#0f172a" }}>
                  3. Hospital Profile & System Settings
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                  Configurable hospital name, address, phone, website, official logo, multi-currency support (USD, EUR, GBP, INR, AED, CAD, AUD), and adjustable tax rates dynamically used across all billing and print outputs.
                </p>
              </div>

              <div style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "#0f172a" }}>
                  4. Enterprise Security & Concurrency
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                  Equipped with Helmet security headers, Express rate limiting, session fixation protection via HttpOnly cookies, parameterized SQL queries, and transaction serialization guarding against stock deficits and overpayment race conditions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Currently evaluated as: <strong style={{ color: "#0f172a" }}>{currentRole || "Guest / Login Screen"}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

export default DemoTourModal;
