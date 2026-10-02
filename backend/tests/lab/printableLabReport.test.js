const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Printable Laboratory Report Component & Print Integration Tests", () => {
  const printableLabReportPath = path.resolve(
    __dirname,
    "../../../src/components/PrintableLabReport.jsx"
  );
  const labOrderDetailsPath = path.resolve(
    __dirname,
    "../../../src/pages/LabOrderDetails.jsx"
  );
  const appCssPath = path.resolve(__dirname, "../../../src/App.css");

  test("1. PrintableLabReport component file exists and exports default function", () => {
    assert.ok(
      fs.existsSync(printableLabReportPath),
      "PrintableLabReport.jsx component file must exist"
    );

    const content = fs.readFileSync(printableLabReportPath, "utf8");
    assert.ok(
      content.includes("export default function PrintableLabReport"),
      "Must export PrintableLabReport component"
    );
  });

  test("2. PrintableLabReport renders Hospital Header, Patient, Order Meta, Results Table, Flags, Notes, and Signature areas", () => {
    const content = fs.readFileSync(printableLabReportPath, "utf8");

    // Hospital Header
    assert.ok(
      content.includes("MedCare Hospital"),
      "Must render hospital name MedCare Hospital"
    );
    assert.ok(
      content.includes("LABORATORY REPORT"),
      "Must render document title LABORATORY REPORT"
    );

    // Patient & Requisition Metadata
    assert.ok(
      content.includes("patientName"),
      "Must render patient name"
    );
    assert.ok(
      content.includes("patientCode"),
      "Must render patient ID / code"
    );
    assert.ok(
      content.includes("doctorName"),
      "Must render ordering physician"
    );

    // Results Table
    assert.ok(
      content.includes("DIAGNOSTIC TEST FINDINGS & RESULTS"),
      "Must render test findings section title"
    );
    assert.ok(
      content.includes("testCode"),
      "Must render test code"
    );
    assert.ok(
      content.includes("resultValue"),
      "Must render result value"
    );
    assert.ok(
      content.includes("referenceRange"),
      "Must render reference range"
    );

    // Result Flag Badges
    assert.ok(
      content.includes("resultFlag"),
      "Must evaluate result flag"
    );
    assert.ok(
      content.includes("print-lab-flag-badge"),
      "Must render flag badges for NORMAL/ABNORMAL/CRITICAL"
    );

    // Clinical Notes
    assert.ok(
      content.includes("clinicalNotes"),
      "Must render clinical indications / notes when present"
    );

    // Signature Block & Footer
    assert.ok(
      content.includes("Authorized Clinical Pathologist"),
      "Must render verification signature area"
    );
    assert.ok(
      content.includes("Confidential Medical Document"),
      "Must render confidential document footer bar"
    );
  });

  test("3. LabOrderDetails page renders Print Lab Report action button using window.print()", () => {
    assert.ok(
      fs.existsSync(labOrderDetailsPath),
      "LabOrderDetails.jsx page file must exist"
    );

    const content = fs.readFileSync(labOrderDetailsPath, "utf8");

    // Imports PrintableLabReport
    assert.ok(
      content.includes("PrintableLabReport"),
      "LabOrderDetails must import PrintableLabReport"
    );

    // Render Print Lab Report Button
    assert.ok(
      content.includes("Print Lab Report"),
      "Must render Print Lab Report button text"
    );
    assert.ok(
      content.includes("window.print()"),
      "Print button must invoke window.print()"
    );
    assert.ok(
      content.includes('name="print"'),
      "Print button must use local Icon component with print SVG"
    );
  });

  test("4. App.css includes @media print rules for .lab-report-print-document A4 portrait layout", () => {
    assert.ok(fs.existsSync(appCssPath), "App.css file must exist");

    const cssContent = fs.readFileSync(appCssPath, "utf8");

    // Screen rule hides print document
    assert.ok(
      cssContent.includes(".lab-report-print-document"),
      "Must contain .lab-report-print-document CSS rules"
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

  test("5. PrintableLabReport does NOT leak sensitive passwords or authentication secrets", () => {
    const content = fs.readFileSync(printableLabReportPath, "utf8");

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
