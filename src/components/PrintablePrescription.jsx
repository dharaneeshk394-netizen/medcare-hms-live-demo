import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { getSettings } from "../services/settingsService";

/**
 * Format date string into human-readable format.
 */
function formatDate(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * PrintablePrescription Component
 *
 * Renders a standardized, professional A4 medical prescription document.
 * Hidden on screen; activated via @media print when window.print() is called.
 */
export default function PrintablePrescription({ prescription, settings: initialSettings }) {
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

  if (!prescription) return null;

  const hospitalName = settings?.hospitalName || "MedCare Hospital";
  const logoUrl = settings?.hospitalLogo;
  const rxHeader = settings?.prescriptionHeader || "Outpatient & Clinical Care Department";

  const addressParts = [
    settings?.addressLine1,
    settings?.addressLine2,
    settings?.city,
    settings?.state,
    settings?.postalCode,
    settings?.country,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "100 Medical Center Parkway, Suite 400, Metropolis, NY 10001";

  const contactParts = [
    settings?.phone ? `Tel: ${settings.phone}` : null,
    settings?.email ? `Email: ${settings.email}` : null,
    settings?.website,
  ].filter(Boolean);
  const contactInfo = contactParts.length > 0 ? contactParts.join(" • ") : "Tel: +1 (555) 019-2834 • Email: clinic@medcare-hospital.org";

  const items = Array.isArray(prescription.items) ? prescription.items : [];
  const rxNumber =
    prescription.prescriptionNumber ||
    prescription.prescription_number ||
    `RX-${prescription.id}`;
  const rxDate = formatDate(
    prescription.prescriptionDate || prescription.prescription_date
  );

  const patientName = prescription.patientName || "—";
  const patientCode =
    prescription.patientCode ||
    prescription.patient_code ||
    (prescription.patientId ? `P-${prescription.patientId}` : "—");
  const patientPhone = prescription.patientPhone || "—";
  const patientEmail = prescription.patientEmail || "—";

  const patientDemographics = [
    prescription.patientAge ? `${prescription.patientAge} Years` : null,
    prescription.patientGender || null,
    prescription.patientBloodGroup ? `Blood: ${prescription.patientBloodGroup}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const doctorName = prescription.doctorName || "—";
  const doctorSpecialization =
    prescription.doctorSpecialization || prescription.specialization || "General Medicine";
  const doctorCode =
    prescription.doctorCode ||
    (prescription.doctorId ? `DOC-${prescription.doctorId}` : "—");
  const doctorPhone = prescription.doctorPhone || "—";
  const _doctorEmail = prescription.doctorEmail || "—";
  const departmentName =
    prescription.department ||
    prescription.doctorDepartment ||
    prescription.departmentName ||
    (doctorSpecialization ? `${doctorSpecialization} Dept.` : "Outpatient Department");

  const appointmentCode =
    prescription.appointmentCode ||
    (prescription.appointmentId ? `APT-${prescription.appointmentId}` : null);
  const appointmentDate = prescription.appointmentDate
    ? formatDate(prescription.appointmentDate)
    : null;

  const diagnosisNotes =
    prescription.diagnosisNotes ||
    prescription.diagnosis_notes ||
    "Routine clinical evaluation. Medication prescribed per outpatient clinical examination.";

  const status = (prescription.status || "ACTIVE").toUpperCase();

  return (
    <div
      className="prescription-print-document"
      id="printable-prescription-document"
      aria-label={`Printable prescription document ${rxNumber}`}
    >
      {/* 1. HOSPITAL FACILITY HEADER */}
      <header className="print-rx-header">
        <div className="print-rx-brand">
          <div className="print-rx-logo">
            {logoUrl ? (
              <img src={logoUrl} alt={hospitalName} style={{ maxHeight: "40px", maxWidth: "60px", objectFit: "contain" }} />
            ) : (
              <span className="print-rx-logo-icon" aria-hidden="true">+</span>
            )}
          </div>
          <div className="print-rx-brand-text">
            <h1 className="print-rx-hospital-name">{hospitalName}</h1>
            <p className="print-rx-facility-tag">{rxHeader}</p>
            <p className="print-rx-facility-info">
              {fullAddress} • {contactInfo}
            </p>
          </div>
        </div>

        <div className="print-rx-meta-box">
          <div className="print-rx-document-title">MEDICAL PRESCRIPTION</div>
          <div className="print-rx-meta-row">
            <span className="print-rx-meta-label">Rx Number:</span>
            <span className="print-rx-meta-val font-mono">{rxNumber}</span>
          </div>
          <div className="print-rx-meta-row">
            <span className="print-rx-meta-label">Date of Issue:</span>
            <span className="print-rx-meta-val">{rxDate}</span>
          </div>
          <div className="print-rx-meta-row">
            <span className="print-rx-meta-label">Status:</span>
            <span className={`print-rx-status print-rx-status-${status.toLowerCase()}`}>
              {status}
            </span>
          </div>
        </div>
      </header>

      <div className="print-rx-divider" />

      {/* 2. PATIENT & PHYSICIAN DEMOGRAPHICS (TWO-COLUMN SECTION) */}
      <section className="print-rx-demographics">
        {/* Patient Details Column */}
        <div className="print-rx-col print-rx-patient-col">
          <div className="print-rx-col-header">
            <Icon name="patients" size={14} inline style={{ marginRight: "5px" }} />
            PATIENT INFORMATION
          </div>
          <div className="print-rx-info-grid">
            <div className="print-rx-info-row">
              <span className="print-rx-label">Full Name:</span>
              <strong className="print-rx-value print-rx-name">{patientName}</strong>
            </div>
            <div className="print-rx-info-row">
              <span className="print-rx-label">Patient ID:</span>
              <span className="print-rx-value font-mono">{patientCode}</span>
            </div>
            {patientDemographics && (
              <div className="print-rx-info-row">
                <span className="print-rx-label">Demographics:</span>
                <span className="print-rx-value">{patientDemographics}</span>
              </div>
            )}
            <div className="print-rx-info-row">
              <span className="print-rx-label">Contact:</span>
              <span className="print-rx-value">{patientPhone}</span>
            </div>
            {patientEmail && patientEmail !== "—" && (
              <div className="print-rx-info-row">
                <span className="print-rx-label">Email:</span>
                <span className="print-rx-value">{patientEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Details Column */}
        <div className="print-rx-col print-rx-doctor-col">
          <div className="print-rx-col-header">
            <Icon name="doctors" size={14} inline style={{ marginRight: "5px" }} />
            PRESCRIBING PHYSICIAN
          </div>
          <div className="print-rx-info-grid">
            <div className="print-rx-info-row">
              <span className="print-rx-label">Doctor Name:</span>
              <strong className="print-rx-value print-rx-name">Dr. {doctorName}</strong>
            </div>
            <div className="print-rx-info-row">
              <span className="print-rx-label">Specialization:</span>
              <span className="print-rx-value">{doctorSpecialization}</span>
            </div>
            <div className="print-rx-info-row">
              <span className="print-rx-label">Department:</span>
              <span className="print-rx-value">{departmentName}</span>
            </div>
            <div className="print-rx-info-row">
              <span className="print-rx-label">Doctor Reg #:</span>
              <span className="print-rx-value font-mono">{doctorCode}</span>
            </div>
            <div className="print-rx-info-row">
              <span className="print-rx-label">Phone:</span>
              <span className="print-rx-value">{doctorPhone}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LINKED CONSULTATION / APPOINTMENT BAR (IF AVAILABLE) */}
      {appointmentCode && (
        <div className="print-rx-appointment-bar">
          <span><strong>Consultation Ref:</strong> {appointmentCode}</span>
          {appointmentDate && <span><strong>Consultation Date:</strong> {appointmentDate}</span>}
          <span><strong>Clinical Facility:</strong> MedCare Main Outpatient Wing</span>
        </div>
      )}

      {/* 4. CLINICAL DIAGNOSIS & REASON FOR PRESCRIPTION */}
      <section className="print-rx-diagnosis-section">
        <div className="print-rx-section-label">
          CLINICAL DIAGNOSIS & OBSERVATIONS
        </div>
        <p className="print-rx-diagnosis-text">{diagnosisNotes}</p>
      </section>

      {/* 5. MEDICAL RX SYMBOL & PRESCRIBED MEDICINES TABLE */}
      <section className="print-rx-medications-section">
        <div className="print-rx-rx-symbol-row">
          <span className="print-rx-symbol" aria-hidden="true">℞</span>
          <span className="print-rx-symbol-heading">Prescribed Medications & Dosage Schedule</span>
        </div>

        {items.length > 0 ? (
          <table className="print-rx-table">
            <thead>
              <tr>
                <th style={{ width: "4%", textAlign: "center" }}>#</th>
                <th style={{ width: "30%" }}>Medicine Name & Strength</th>
                <th style={{ width: "14%" }}>Dosage</th>
                <th style={{ width: "16%" }}>Frequency</th>
                <th style={{ width: "12%" }}>Duration</th>
                <th style={{ width: "8%", textAlign: "center" }}>Qty</th>
                <th style={{ width: "16%" }}>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <strong className="print-rx-med-name">
                      {item.medicineName || item.medicine_name || "—"}
                    </strong>
                  </td>
                  <td>{item.dosage || "As directed"}</td>
                  <td>{item.frequency || "—"}</td>
                  <td>{item.duration || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    {item.quantity !== undefined && item.quantity !== null ? item.quantity : "—"}
                  </td>
                  <td className="print-rx-instructions">{item.instructions || "Standard schedule"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="print-rx-no-items">
            No medication items recorded on this prescription.
          </div>
        )}
      </section>

      {/* 6. PATIENT ADVISORY & DOCTOR SIGNATURE SECTION */}
      <section className="print-rx-footer-section">
        <div className="print-rx-instructions-box">
          <h4 className="print-rx-instructions-title">Instructions for Patient & Pharmacy</h4>
          <ul className="print-rx-instructions-list">
            <li>Take all medications strictly as directed. Do not adjust dosage without consulting your physician.</li>
            <li>Complete the entire course of prescribed antimicrobial / antibiotic therapies.</li>
            <li>Store medications in a cool, dry place away from direct sunlight and out of reach of children.</li>
            <li>In case of sudden adverse reactions, hypersensitivity, or allergies, seek immediate medical attention.</li>
          </ul>
        </div>

        <div className="print-rx-signature-box">
          <div className="print-rx-signature-space" />
          <div className="print-rx-signature-line" />
          <p className="print-rx-signature-doctor">Dr. {doctorName}</p>
          <p className="print-rx-signature-title">{doctorSpecialization}</p>
          <p className="print-rx-signature-reg">License Reg: {doctorCode}</p>
          <p className="print-rx-signature-date">Signed on: {rxDate}</p>
        </div>
      </section>

      {/* 7. OFFICIAL FOOTER / LEGAL DISCLAIMER */}
      <footer className="print-rx-document-footer">
        <div className="print-rx-footer-line" />
        <div className="print-rx-footer-content">
          <span>MedCare Hospital Management System • Verified Clinical Document</span>
          <span>Confidential Healthcare Record • Page 1 of 1</span>
        </div>
        <div className="print-rx-footer-sub">
          This prescription was officially generated from the electronic health records of MedCare Hospital.
          Tampering with or altering this document is strictly prohibited by law.
        </div>
      </footer>
    </div>
  );
}
