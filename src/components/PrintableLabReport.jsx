import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { getSettings } from "../services/settingsService";

/**
 * Format ISO date string into readable localized date and time.
 */

/**
 * Normalize doctor name to ensure single "Dr." prefix without duplication.
 */
function formatDoctorName(name) {
  if (!name || name === "—") return "Hospital Physician";
  const trimmed = name.trim();
  if (/^Dr\.?\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

function formatDateTime(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * PrintableLabReport Component
 *
 * Renders an official, professional A4 Diagnostic Laboratory Report.
 * Hidden on screen; revealed during @media print when window.print() is called.
 */
export default function PrintableLabReport({ order, settings: initialSettings }) {
  const [settings, setSettings] = useState(initialSettings || null);

  useEffect(() => {
    let isMounted = true;
    if (!initialSettings) {
      getSettings()
        .then((data) => {
          if (isMounted) setSettings(data);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [initialSettings]);

  if (!order) return null;

  const hospitalName = settings?.hospitalName || "MedCare Hospital";
  const logoUrl = settings?.hospitalLogo;
  const labHeader = settings?.reportHeader || "Diagnostic Laboratory & Clinical Pathology Department";

  const addressParts = [
    settings?.addressLine1,
    settings?.addressLine2,
    settings?.city,
    settings?.state,
    settings?.postalCode,
    settings?.country,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "100 Medical Center Parkway, Suite 200, Metropolis, NY 10001";

  const contactParts = [
    settings?.phone ? `Tel: ${settings.phone}` : null,
    settings?.email ? `Email: ${settings.email}` : null,
    settings?.website,
  ].filter(Boolean);
  const contactInfo = contactParts.length > 0 ? contactParts.join(" • ") : "Tel: +1 (555) 019-2834 • Email: lab@medcare-hospital.org";

  const orderNum =
    order.orderNumber || `ORD-LAB-${String(order.id || 0).padStart(6, "0")}`;
  const orderDate = formatDateTime(order.createdAt);
  const sampleDate = formatDateTime(order.sampleCollectedAt);
  const reportedDate = formatDateTime(order.completedAt);
  const status = String(order.status || "PENDING").toUpperCase();
  const priority = order.priority || "Routine";

  // Patient Demographics
  const patientName = order.patientName || "—";
  const patientCode = order.patientCode || (order.patientId ? `P-${order.patientId}` : "—");
  const patientAge = order.patientAge ? `${order.patientAge} Years` : null;
  const patientGender = order.patientGender || null;
  const patientPhone = order.patientPhone || "—";

  const patientDemographicsStr = [patientAge, patientGender]
    .filter(Boolean)
    .join(" • ") || "—";

  // Doctor & Referring Info
  const doctorName = formatDoctorName(order.doctorName);
  const doctorSpecialization = order.doctorSpecialization || "General Medicine";
  const orderedByName = order.orderedByName || "Authorized Practitioner";

  // Items / Results
  const items = Array.isArray(order.items) ? order.items : [];

  // Determine Primary Verifier Name from items or order
  const verifierName =
    items.find((i) => i.completedByName)?.completedByName ||
    orderedByName ||
    "Authorized Laboratory Pathologist";

  return (
    <div
      className="lab-report-print-document"
      id="printable-lab-report-document"
      aria-label={`Printable laboratory report ${orderNum}`}
    >
      {/* 1. HOSPITAL FACILITY HEADER */}
      <header className="print-lab-header">
        <div className="print-lab-brand">
          <div className="print-lab-logo">
            {logoUrl ? (
              <img src={logoUrl} alt={hospitalName} style={{ maxHeight: "40px", maxWidth: "60px", objectFit: "contain" }} />
            ) : (
              <span className="print-lab-logo-icon" aria-hidden="true">+</span>
            )}
          </div>
          <div className="print-lab-brand-text">
            <h1 className="print-lab-hospital-name">{hospitalName}</h1>
            <p className="print-lab-facility-tag">
              {labHeader}
            </p>
            <p className="print-lab-facility-info">
              {fullAddress} • {contactInfo}
            </p>
          </div>
        </div>

        <div className="print-lab-meta-box">
          <div className="print-lab-document-title">LABORATORY REPORT</div>
          <div className="print-lab-meta-row">
            <span className="print-lab-meta-label">Lab Order #:</span>
            <span className="print-lab-meta-val font-mono">{orderNum}</span>
          </div>
          <div className="print-lab-meta-row">
            <span className="print-lab-meta-label">Order Date:</span>
            <span className="print-lab-meta-val">{orderDate}</span>
          </div>
          <div className="print-lab-meta-row">
            <span className="print-lab-meta-label">Priority:</span>
            <span className={`print-lab-priority print-lab-priority-${priority.toLowerCase()}`}>
              {priority}
            </span>
          </div>
          <div className="print-lab-meta-row">
            <span className="print-lab-meta-label">Status:</span>
            <span className={`print-lab-status print-lab-status-${status.toLowerCase()}`}>
              {status}
            </span>
          </div>
        </div>
      </header>

      <div className="print-lab-divider" />

      {/* 2. PATIENT & ORDERING PHYSICIAN INFORMATION (TWO-COLUMN BLOCK) */}
      <section className="print-lab-demographics">
        {/* Patient Details Column */}
        <div className="print-lab-col">
          <div className="print-lab-col-header">
            <Icon name="patients" size={14} inline style={{ marginRight: "5px" }} />
            PATIENT INFORMATION
          </div>
          <div className="print-lab-info-grid">
            <div className="print-lab-info-row">
              <span className="print-lab-label">Patient Name:</span>
              <strong className="print-lab-value print-lab-name">{patientName}</strong>
            </div>
            <div className="print-lab-info-row">
              <span className="print-lab-label">Patient ID:</span>
              <span className="print-lab-value font-mono">{patientCode}</span>
            </div>
            <div className="print-lab-info-row">
              <span className="print-lab-label">Demographics:</span>
              <span className="print-lab-value">{patientDemographicsStr}</span>
            </div>
            <div className="print-lab-info-row">
              <span className="print-lab-label">Contact Phone:</span>
              <span className="print-lab-value">{patientPhone}</span>
            </div>
          </div>
        </div>

        {/* Ordering & Specimen Information Column */}
        <div className="print-lab-col">
          <div className="print-lab-col-header">
            <Icon name="stethoscope" size={14} inline style={{ marginRight: "5px" }} />
            REQUISITION & SPECIMEN METADATA
          </div>
          <div className="print-lab-info-grid">
            <div className="print-lab-info-row">
              <span className="print-lab-label">Ordering Doctor:</span>
              <strong className="print-lab-value">{doctorName}</strong>
            </div>
            <div className="print-lab-info-row">
              <span className="print-lab-label">Specialization:</span>
              <span className="print-lab-value">{doctorSpecialization}</span>
            </div>
            <div className="print-lab-info-row">
              <span className="print-lab-label">Sample Collected:</span>
              <span className="print-lab-value">{sampleDate}</span>
            </div>
            <div className="print-lab-info-row">
              <span className="print-lab-label">Report Date:</span>
              <span className="print-lab-value">{reportedDate !== "—" ? reportedDate : "In Progress"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CLINICAL INDICATIONS / NOTES (IF PRESENT) */}
      {order.clinicalNotes && (
        <section className="print-lab-clinical-notes">
          <div className="print-lab-section-label">CLINICAL INDICATIONS & REQUISITION NOTES</div>
          <p className="print-lab-clinical-text">{order.clinicalNotes}</p>
        </section>
      )}

      {/* 4. LABORATORY TEST RESULTS TABLE */}
      <section className="print-lab-results-section">
        <div className="print-lab-results-header">
          <Icon name="activity" size={14} inline style={{ marginRight: "6px" }} />
          DIAGNOSTIC TEST FINDINGS & RESULTS
        </div>

        <table className="print-lab-results-table">
          <thead>
            <tr>
              <th style={{ width: "12%" }}>Code</th>
              <th style={{ width: "26%" }}>Test Name</th>
              <th style={{ width: "12%" }}>Sample</th>
              <th style={{ width: "18%" }}>Result Value</th>
              <th style={{ width: "12%" }}>Flag</th>
              <th style={{ width: "20%" }}>Reference Range</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted" style={{ padding: "16px" }}>
                  No laboratory tests recorded on this order.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const flag = String(item.resultFlag || "NORMAL").toUpperCase();
                const isAbnormal = flag === "ABNORMAL" || flag === "CRITICAL" || flag === "HIGH" || flag === "LOW";
                const isCritical = flag === "CRITICAL";

                return (
                  <tr key={item.id || idx} className={isCritical ? "print-lab-row-critical" : isAbnormal ? "print-lab-row-abnormal" : ""}>
                    <td className="font-mono fw-bold">{item.testCode || "—"}</td>
                    <td>
                      <strong className="print-lab-test-name">{item.testName || "Diagnostic Test"}</strong>
                      <div className="print-lab-test-category">{item.testCategory || "General Pathology"}</div>
                      {item.remarks && (
                        <div className="print-lab-test-remarks">
                          <em>Note:</em> {item.remarks}
                        </div>
                      )}
                    </td>
                    <td>{item.sampleType || "Blood"}</td>
                    <td>
                      {item.resultValue ? (
                        <strong className={`print-lab-result-val ${isCritical ? "text-critical" : isAbnormal ? "text-abnormal" : ""}`}>
                          {item.resultValue} {item.testUnit ? item.testUnit : ""}
                        </strong>
                      ) : (
                        <span className="text-muted print-lab-pending-val">Awaiting Analysis</span>
                      )}
                    </td>
                    <td>
                      {item.resultValue ? (
                        <span className={`print-lab-flag-badge print-lab-flag-${flag.toLowerCase()}`}>
                          {flag}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="font-mono">
                      {item.referenceRange ? (
                        <span>
                          {item.referenceRange} {item.testUnit && `(${item.testUnit})`}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* 5. AUTHORIZATION & PATHOLOGIST VERIFICATION SIGNATURE BLOCK */}
      <footer className="print-lab-footer-section">
        <div className="print-lab-disclaimer-box">
          <div className="print-lab-disclaimer-title">LABORATORY QUALITY ASSURANCE</div>
          <ul className="print-lab-disclaimer-list">
            <li>Tests were performed in accordance with MedCare Hospital LIS standardized quality control guidelines.</li>
            <li>Reference ranges apply to adult populations unless specific pediatric or demographic norms are noted.</li>
            <li>Critical values are flagged and communicated directly to the requesting clinical physician.</li>
          </ul>
        </div>

        <div className="print-lab-signature-box">
          <div className="print-lab-signature-space" />
          <div className="print-lab-signature-line" />
          <p className="print-lab-signature-doctor">{verifierName}</p>
          <p className="print-lab-signature-title">Authorized Clinical Pathologist / Technologist</p>
          <p className="print-lab-signature-reg">MedCare Hospital Central Laboratory</p>
          {reportedDate !== "—" && (
            <p className="print-lab-signature-date">Verified: {reportedDate}</p>
          )}
        </div>
      </footer>

      {/* 6. DOCUMENT FOOTER BAR */}
      <div className="print-lab-document-footer">
        <div className="print-lab-footer-line" />
        <div className="print-lab-footer-content">
          <span>MedCare Hospital Laboratory Information System (LIS)</span>
          <span>Official Diagnostic Report</span>
          <span>Confidential Medical Document</span>
        </div>
        <div className="print-lab-footer-sub">
          This report contains privileged diagnostic information intended solely for the treating clinical physician.
        </div>
      </div>
    </div>
  );
}
