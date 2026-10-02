import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { getSettings } from "../services/settingsService";

/**
 * Currency formatter for monetary display.
 */
function formatCurrency(amount, symbol = "$") {
  const num = Number(amount);
  if (Number.isNaN(num)) {
    return `${symbol}0.00`;
  }
  return `${symbol}${num.toFixed(2)}`;
}

/**
 * Date formatter for readable localized display.
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
 * PrintableInvoice Component
 *
 * Renders a standardized, professional A4 Tax Invoice document for hospital billing.
 * Hidden during screen usage; revealed via @media print when window.print() is invoked.
 */
export default function PrintableInvoice({ invoice, settings: initialSettings }) {
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

  if (!invoice) return null;

  const hospitalName = settings?.hospitalName || "MedCare Hospital";
  const currencySymbol = settings?.currencySymbol || "$";
  const logoUrl = settings?.hospitalLogo;

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
  const contactInfo = contactParts.length > 0 ? contactParts.join(" • ") : "Tel: +1 (555) 019-2834 • Email: billing@medcare-hospital.org";

  const invNumber =
    invoice.invoiceNumber || invoice.invoice_number || `INV-${invoice.id}`;
  const invDate = formatDate(invoice.invoiceDate || invoice.createdAt);
  const dueDate = invoice.dueDate ? formatDate(invoice.dueDate) : "Upon Receipt";
  const status = String(invoice.status || "PENDING").toUpperCase();

  // Patient details extraction
  const patient = invoice.patient || {};
  const patientName = patient.name || invoice.patientName || "—";
  const patientCode =
    patient.patientCode ||
    patient.patient_code ||
    patient.patientId ||
    invoice.patientCode ||
    (invoice.patientId ? `P-${invoice.patientId}` : "—");
  const patientPhone = patient.phone || invoice.patientPhone || "—";
  const patientEmail = patient.email || invoice.patientEmail || "—";

  // Linked visit context
  const appointmentCode = invoice.appointment
    ? invoice.appointment.appointmentCode || `APT-${invoice.appointment.id}`
    : invoice.appointmentId
    ? `APT-${invoice.appointmentId}`
    : null;

  const admissionCode = invoice.admission
    ? invoice.admission.admissionCode || `ADM-${invoice.admission.id}`
    : invoice.admissionId
    ? `ADM-${invoice.admissionId}`
    : null;

  // Items and Payments
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];

  // Financial calculations from authoritative backend response
  const subtotal = Number(invoice.subtotal || 0);
  const tax = Number(invoice.tax || invoice.taxAmount || 0);
  const discount = Number(invoice.discount || invoice.discountAmount || 0);
  const totalAmount = Number(invoice.totalAmount || invoice.total || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const balanceAmount = Number(
    invoice.balanceAmount !== undefined ? invoice.balanceAmount : invoice.balance || 0
  );

  const footerText = settings?.invoiceFooter || `Thank you for choosing ${hospitalName}. Official computer-generated medical tax invoice.`;
  const thankYouMessage = hospitalName && hospitalName !== "MedCare Hospital"
    ? `Thank you for choosing ${hospitalName}.`
    : "Thank you for choosing MedCare Hospital.";

  return (
    <div
      className="invoice-print-document"
      id="printable-invoice-document"
      aria-label={`Printable tax invoice document ${invNumber}`}
    >
      {/* 1. HOSPITAL FACILITY HEADER */}
      <header className="print-inv-header">
        <div className="print-inv-brand">
          <div className="print-inv-logo">
            {logoUrl ? (
              <img src={logoUrl} alt={hospitalName} style={{ maxHeight: "40px", maxWidth: "60px", objectFit: "contain" }} />
            ) : (
              <span className="print-inv-logo-icon" aria-hidden="true">+</span>
            )}
          </div>
          <div className="print-inv-brand-text">
            <h1 className="print-inv-hospital-name">{hospitalName}</h1>
            <p className="print-inv-facility-tag">
              Billing & Financial Services
            </p>
            <p className="print-inv-facility-info">
              {fullAddress} • {contactInfo}
            </p>
          </div>
        </div>

        <div className="print-inv-meta-box">
          <div className="print-inv-document-title">TAX INVOICE</div>
          <div className="print-inv-meta-row">
            <span className="print-inv-meta-label">Invoice #:</span>
            <span className="print-inv-meta-val font-mono">{invNumber}</span>
          </div>
          <div className="print-inv-meta-row">
            <span className="print-inv-meta-label">Invoice Date:</span>
            <span className="print-inv-meta-val">{invDate}</span>
          </div>
          <div className="print-inv-meta-row">
            <span className="print-inv-meta-label">Payment Terms:</span>
            <span className="print-inv-meta-val">{dueDate}</span>
          </div>
          <div className="print-inv-meta-row">
            <span className="print-inv-meta-label">Status:</span>
            <span className={`print-inv-status print-inv-status-${status.toLowerCase()}`}>
              {status}
            </span>
          </div>
        </div>
      </header>

      <div className="print-inv-divider" />

      {/* 2. PATIENT & BILLING CONTEXT (TWO-COLUMN SECTION) */}
      <section className="print-inv-demographics">
        {/* Patient Details Column */}
        <div className="print-inv-col">
          <div className="print-inv-col-header">
            <Icon name="patients" size={14} inline style={{ marginRight: "5px" }} />
            PATIENT / BILL TO
          </div>
          <div className="print-inv-info-grid">
            <div className="print-inv-info-row">
              <span className="print-inv-label">Patient Name:</span>
              <strong className="print-inv-value print-inv-name">{patientName}</strong>
            </div>
            <div className="print-inv-info-row">
              <span className="print-inv-label">Patient ID:</span>
              <span className="print-inv-value font-mono">{patientCode}</span>
            </div>
            <div className="print-inv-info-row">
              <span className="print-inv-label">Contact Phone:</span>
              <span className="print-inv-value">{patientPhone}</span>
            </div>
            {patientEmail && patientEmail !== "—" && (
              <div className="print-inv-info-row">
                <span className="print-inv-label">Email:</span>
                <span className="print-inv-value">{patientEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visit & Encounter Linkage Column */}
        <div className="print-inv-col">
          <div className="print-inv-col-header">
            <Icon name="billing" size={14} inline style={{ marginRight: "5px" }} />
            ENCOUNTER / VISIT REFERENCE
          </div>
          <div className="print-inv-info-grid">
            {appointmentCode && (
              <div className="print-inv-info-row">
                <span className="print-inv-label">Appointment #:</span>
                <span className="print-inv-value font-mono">{appointmentCode}</span>
              </div>
            )}
            {admissionCode && (
              <div className="print-inv-info-row">
                <span className="print-inv-label">Admission #:</span>
                <span className="print-inv-value font-mono">{admissionCode}</span>
              </div>
            )}
            <div className="print-inv-info-row">
              <span className="print-inv-label">Facility Dept:</span>
              <span className="print-inv-value">Outpatient / Inpatient Services</span>
            </div>
            <div className="print-inv-info-row">
              <span className="print-inv-label">Currency:</span>
              <span className="print-inv-value">USD ($)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INVOICE LINE ITEMS TABLE */}
      <section className="print-inv-section">
        <div className="print-inv-section-title">
          <Icon name="billing" size={14} inline style={{ marginRight: "6px" }} />
          ITEMIZED BILLING CHARGES
        </div>

        <table className="print-inv-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>#</th>
              <th style={{ width: "18%" }}>Type</th>
              <th style={{ width: "42%" }}>Description</th>
              <th className="text-right" style={{ width: "10%" }}>Qty</th>
              <th className="text-right" style={{ width: "12%" }}>Unit Price</th>
              <th className="text-right" style={{ width: "12%" }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted" style={{ padding: "16px" }}>
                  No line items recorded on this invoice.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const itemType = item.itemType || item.item_type || "General";
                const qty = Number(item.quantity || 1);
                const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : item.unit_price || 0);
                const lineTotal = Number(item.totalPrice !== undefined ? item.totalPrice : item.total_price || qty * unitPrice);

                return (
                  <tr key={item.id || idx}>
                    <td className="text-center font-mono">{idx + 1}</td>
                    <td>
                      <span className="print-inv-item-type">{itemType}</span>
                    </td>
                    <td>
                      <strong>{item.description || "Medical Service"}</strong>
                    </td>
                    <td className="text-right font-mono">{qty}</td>
                    <td className="text-right font-mono">{formatCurrency(unitPrice, currencySymbol)}</td>
                    <td className="text-right font-mono fw-bold">{formatCurrency(lineTotal, currencySymbol)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* 4. FINANCIAL SUMMARY & TOTALS */}
      <section className="print-inv-summary-container">
        <div className="print-inv-notes-box">
          <div className="print-inv-notes-title">PAYMENT & BILLING NOTES</div>
          <p className="print-inv-notes-text">
            Payments can be made via Cash, Credit/Debit Card, or Bank Transfer at the Cashier Counter.
            Insurance claims are subject to verification and policy coverage limits.
          </p>
        </div>

        <div className="print-inv-totals-box">
          <div className="print-inv-total-row">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCurrency(subtotal, currencySymbol)}</span>
          </div>
          {discount > 0 && (
            <div className="print-inv-total-row text-success">
              <span>Discount:</span>
              <span className="font-mono">-{formatCurrency(discount, currencySymbol)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="print-inv-total-row">
              <span>{settings?.taxName || "Tax / VAT"}:</span>
              <span className="font-mono">+{formatCurrency(tax, currencySymbol)}</span>
            </div>
          )}
          <div className="print-inv-total-row print-inv-grand-total">
            <span>Total Amount:</span>
            <span className="font-mono">{formatCurrency(totalAmount, currencySymbol)}</span>
          </div>
          <div className="print-inv-total-row">
            <span>Amount Paid:</span>
            <span className="font-mono">{formatCurrency(paidAmount, currencySymbol)}</span>
          </div>
          <div className="print-inv-total-row print-inv-balance-due">
            <span>Balance Due:</span>
            <span className="font-mono">{formatCurrency(balanceAmount, currencySymbol)}</span>
          </div>
        </div>
      </section>

      {/* 5. PAYMENT TRANSACTIONS LOG (IF PAYMENTS RECORDED) */}
      {payments.length > 0 && (
        <section className="print-inv-section" style={{ marginTop: "14px" }}>
          <div className="print-inv-section-title">
            <Icon name="check" size={14} inline style={{ marginRight: "6px" }} />
            RECORDED PAYMENT TRANSACTIONS
          </div>

          <table className="print-inv-table">
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Receipt #</th>
                <th style={{ width: "18%" }}>Date</th>
                <th style={{ width: "18%" }}>Method</th>
                <th style={{ width: "22%" }}>Reference / Transaction #</th>
                <th style={{ width: "12%" }}>Notes</th>
                <th className="text-right" style={{ width: "15%" }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pmt, idx) => (
                <tr key={pmt.id || idx}>
                  <td className="font-mono">{pmt.paymentNumber || `PAY-${pmt.id}`}</td>
                  <td>{formatDate(pmt.paymentDate || pmt.createdAt)}</td>
                  <td>
                    <strong>{pmt.paymentMethod || "Cash"}</strong>
                  </td>
                  <td className="font-mono">{pmt.referenceNumber || "—"}</td>
                  <td>{pmt.notes || "—"}</td>
                  <td className="text-right font-mono fw-bold text-success">
                    {formatCurrency(pmt.amount, currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 6. OFFICIAL FOOTER */}
      <footer className="print-inv-footer">
        <div className="print-inv-thankyou">
          {thankYouMessage}
        </div>
        <p className="print-inv-notice">
          {footerText}
        </p>
      </footer>
    </div>
  );
}
