const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Printable Invoice Component & Print Integration Tests", () => {
  const printableInvoicePath = path.resolve(
    __dirname,
    "../../../src/components/PrintableInvoice.jsx"
  );
  const invoiceDetailsPath = path.resolve(
    __dirname,
    "../../../src/pages/InvoiceDetails.jsx"
  );
  const appCssPath = path.resolve(__dirname, "../../../src/App.css");

  test("1. PrintableInvoice component file exists and exports default function", () => {
    assert.ok(
      fs.existsSync(printableInvoicePath),
      "PrintableInvoice.jsx component file must exist"
    );

    const content = fs.readFileSync(printableInvoicePath, "utf8");
    assert.ok(
      content.includes("export default function PrintableInvoice"),
      "Must export PrintableInvoice component"
    );
  });

  test("2. PrintableInvoice renders Hospital Header, Patient, Items, Totals, Payments, and Footer sections", () => {
    const content = fs.readFileSync(printableInvoicePath, "utf8");

    // Hospital Header
    assert.ok(
      content.includes("MedCare Hospital"),
      "Must render hospital name MedCare Hospital"
    );
    assert.ok(
      content.includes("TAX INVOICE"),
      "Must render document title TAX INVOICE"
    );

    // Patient & Invoice Info
    assert.ok(
      content.includes("patientName"),
      "Must render patient name"
    );
    assert.ok(
      content.includes("patientCode"),
      "Must render patient ID / code"
    );

    // Items table
    assert.ok(
      content.includes("ITEMIZED BILLING CHARGES"),
      "Must render line items section title"
    );
    assert.ok(
      content.includes("itemType"),
      "Must render item type"
    );

    // Financial Totals
    assert.ok(
      content.includes("Subtotal:"),
      "Must render subtotal"
    );
    assert.ok(
      content.includes("Total Amount:"),
      "Must render total amount"
    );
    assert.ok(
      content.includes("Amount Paid:"),
      "Must render amount paid"
    );
    assert.ok(
      content.includes("Balance Due:"),
      "Must render balance due"
    );

    // Payments section
    assert.ok(
      content.includes("RECORDED PAYMENT TRANSACTIONS"),
      "Must render payment transactions section"
    );

    // Footer
    assert.ok(
      content.includes("Thank you for choosing MedCare Hospital"),
      "Must render thank you footer notice"
    );
  });

  test("3. InvoiceDetails page renders Print Invoice action button using window.print()", () => {
    assert.ok(
      fs.existsSync(invoiceDetailsPath),
      "InvoiceDetails.jsx page file must exist"
    );

    const content = fs.readFileSync(invoiceDetailsPath, "utf8");

    // Imports PrintableInvoice
    assert.ok(
      content.includes("PrintableInvoice"),
      "InvoiceDetails must import PrintableInvoice"
    );

    // Render Print Invoice Button
    assert.ok(
      content.includes("Print Invoice"),
      "Must render Print Invoice button text"
    );
    assert.ok(
      content.includes("window.print()"),
      "Print Invoice button must invoke window.print()"
    );
    assert.ok(
      content.includes('name="print"'),
      "Print button must use local Icon component with print SVG"
    );
  });

  test("4. App.css includes @media print rules for .invoice-print-document A4 portrait layout", () => {
    assert.ok(fs.existsSync(appCssPath), "App.css file must exist");

    const cssContent = fs.readFileSync(appCssPath, "utf8");

    // Screen rule hides print document
    assert.ok(
      cssContent.includes(".invoice-print-document"),
      "Must contain .invoice-print-document CSS rules"
    );

    // Print media queries
    assert.ok(
      cssContent.includes("@media print"),
      "Must contain @media print CSS rule"
    );
    assert.ok(
      cssContent.includes("size: A4 portrait"),
      "Must specify A4 portrait page size"
    );
  });

  test("5. PrintableInvoice does NOT leak sensitive passwords or authentication secrets", () => {
    const content = fs.readFileSync(printableInvoicePath, "utf8");

    assert.equal(
      content.includes("password_hash"),
      false,
      "Must not reference password_hash"
    );
    assert.equal(
      content.includes("sessionSecret"),
      false,
      "Must not reference sessionSecret"
    );
  });
});
