const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Prescription Details Page UI Contract & Component Unit Tests", () => {
  let originalFetch;
  let lastFetchCall = null;
  let prescriptionService;

  beforeEach(async () => {
    originalFetch = global.fetch;
    lastFetchCall = null;

    // Dynamically import ES module prescriptionService.js
    prescriptionService = await import("../../../src/services/prescriptionService.js");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetchSuccess(responseData = {}, status = 200) {
    global.fetch = async (url, options) => {
      lastFetchCall = { url, options };
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: "OK",
        json: async () => ({ success: true, data: responseData }),
      };
    };
  }

  function mockFetchError(message = "Not Found", status = 404) {
    global.fetch = async (url, options) => {
      lastFetchCall = { url, options };
      return {
        ok: false,
        status,
        statusText: "Error",
        json: async () => ({ success: false, message }),
      };
    };
  }

  test("1. PrescriptionDetails page source file exists and follows component structure", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    assert.ok(fs.existsSync(pagePath), "PrescriptionDetails.jsx page file must exist");

    const content = fs.readFileSync(pagePath, "utf8");
    assert.ok(
      content.includes("export default PrescriptionDetails"),
      "Must export PrescriptionDetails component"
    );
    assert.ok(
      content.includes("getPrescriptionById"),
      "Must import getPrescriptionById from prescriptionService"
    );
    assert.ok(
      content.includes("StatusBadge"),
      "Must re-use StatusBadge component for status display"
    );
  });

  test("2. Route prescription ID parameter is processed and used to fetch details", async () => {
    const sampleRx = {
      id: 42,
      prescriptionNumber: "RX-00042",
      patientId: 10,
      patientName: "Jane Smith",
      doctorId: 5,
      doctorName: "Dr. John Doe",
      prescriptionDate: "2026-09-17",
      diagnosisNotes: "Patient presents with seasonal allergies.",
      status: "ACTIVE",
      items: [
        {
          id: 1,
          medicineName: "Cetirizine 10mg",
          dosage: "1 tablet",
          frequency: "Once daily",
          duration: "10 days",
          quantity: 10,
          instructions: "Take at bedtime",
        },
      ],
    };

    mockFetchSuccess(sampleRx, 200);

    const result = await prescriptionService.getPrescriptionById(42);

    assert.ok(lastFetchCall, "API request must be triggered");
    assert.ok(
      lastFetchCall.url.endsWith("/prescriptions/42"),
      "URL path must target route ID endpoint /prescriptions/42"
    );
    assert.equal(result.id, 42);
    assert.equal(result.prescriptionNumber, "RX-00042");
  });

  test("3. prescriptionService.getPrescriptionById throws on empty or missing ID", async () => {
    await assert.rejects(
      async () => {
        await prescriptionService.getPrescriptionById("");
      },
      (err) => {
        assert.ok(err.message.includes("Prescription ID is required"));
        return true;
      }
    );
  });

  test("4. Prescription header rendering logic includes number, date, status, and patient/doctor summary", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("rxNumber"), "Formats prescription number for header");
    assert.ok(content.includes("rxDate"), "Formats prescription date for header");
    assert.ok(content.includes("<StatusBadge"), "Renders StatusBadge in header");
    assert.ok(content.includes("patientName"), "Includes patient name in header summary");
    assert.ok(content.includes("doctorName"), "Includes doctor name in header summary");
  });

  test("5. Patient information card renders patient identifiers and demographic details safely", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Patient Information"), "Contains Patient Information card section");
    assert.ok(content.includes("patientCode"), "Displays patient code / ID");
    assert.ok(content.includes("patientPhone"), "Displays patient phone");
    assert.ok(content.includes("patientEmail"), "Displays patient email");
    assert.ok(content.includes("demographics"), "Displays age, gender, blood group when present");
  });

  test("6. Doctor information card renders doctor name and specialization", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Doctor Information"), "Contains Doctor Information card section");
    assert.ok(content.includes("doctorName"), "Displays doctor name");
    assert.ok(content.includes("doctorSpecialization"), "Displays doctor specialization");
    assert.ok(content.includes("doctorPhone"), "Displays doctor phone");
  });

  test("7 & 8. Linked appointment vs no-appointment state rendering logic", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Linked Appointment"), "Contains Linked Appointment section");
    assert.ok(content.includes("hasAppointment"), "Distinguishes whether appointment is linked");
    assert.ok(
      content.includes("No linked appointment associated with this prescription"),
      "Displays fallback text when appointment is absent"
    );
  });

  test("9. Diagnosis notes are displayed safely as text without dangerouslySetInnerHTML", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      !content.includes("dangerouslySetInnerHTML"),
      "MUST NOT use dangerouslySetInnerHTML for diagnosis notes"
    );
    assert.ok(
      content.includes("diagnosisNotes"),
      "Displays diagnosis notes safely as plain text element"
    );
  });

  test("10. All prescription items render in a structured table with headers", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("<table"), "Renders medication table");
    assert.ok(content.includes("Medicine Name"), "Table column Medicine Name");
    assert.ok(content.includes("Dosage"), "Table column Dosage");
    assert.ok(content.includes("Frequency"), "Table column Frequency");
    assert.ok(content.includes("Duration"), "Table column Duration");
    assert.ok(content.includes("Quantity"), "Table column Quantity");
    assert.ok(content.includes("Instructions"), "Table column Instructions");
  });

  test("11. ACTIVE, COMPLETED, CANCELLED statuses are supported via StatusBadge", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("status={prescription.status}"), "Passes prescription status directly to StatusBadge");
  });

  test("12. Loading state logic displays loading indicator while fetching data", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("if (loading)"), "Handles loading state condition");
    assert.ok(content.includes("Loading prescription details"), "Displays loading text indicator");
  });

  test("13. Not found state handles 404 responses with navigation option", async () => {
    mockFetchError("Requested resource not found at /api/v1/prescriptions/999", 404);

    await assert.rejects(
      async () => {
        await prescriptionService.getPrescriptionById(999);
      },
      (err) => {
        assert.equal(err.status, 404);
        return true;
      }
    );

    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Prescription Not Found"), "Renders clear Prescription Not Found UI state");
  });

  test("14 & 15. API error state handling and retry invocation logic", async () => {
    mockFetchError("Internal Server Error", 500);

    await assert.rejects(
      async () => {
        await prescriptionService.getPrescriptionById(1);
      },
      (err) => {
        assert.equal(err.status, 500);
        return true;
      }
    );

    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Unable to Load Prescription"), "Renders error banner/heading on API failure");
    assert.ok(content.includes("onClick={loadPrescription}"), "Provides Try Again / Retry action trigger");
  });

  test("16. Back to Prescriptions navigation trigger exists", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes('navigate("/prescriptions")'),
      "Navigates back to /prescriptions list"
    );
  });

  test("17. Initial state is empty/null before API load (no hardcoded fake prescription data)", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes("useState(null)"),
      "Initial prescription state is set to null, not fake data"
    );
  });

  test("18. Basic accessibility requirements are met in PrescriptionDetails.jsx", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes('type="button"'), "All buttons specify type='button'");
    assert.ok(content.includes('aria-label='), "Provides aria-label on interactive controls");
    assert.ok(content.includes('scope="col"'), "Table header cells use scope='col' attribute");
  });

  test("19. Route /prescriptions/:id is registered in App.jsx under ProtectedRoute", () => {
    const appPath = path.resolve(__dirname, "../../../src/App.jsx");
    const content = fs.readFileSync(appPath, "utf8");

    assert.ok(
      content.includes('path="/prescriptions/:id"'),
      "Route /prescriptions/:id registered in App.jsx"
    );
    assert.ok(
      content.includes("<PrescriptionDetails />"),
      "App.jsx renders PrescriptionDetails component for /prescriptions/:id"
    );
  });

  test("20. Print Prescription action button triggers window.print()", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes("Print Prescription"),
      "Renders Print Prescription button text"
    );
    assert.ok(
      content.includes("window.print()"),
      "Triggers browser-native window.print()"
    );
    assert.ok(
      content.includes("<PrintablePrescription"),
      "Renders PrintablePrescription component"
    );
  });

  test("21. PrintablePrescription component provides clean A4 document structure", () => {
    const componentPath = path.resolve(__dirname, "../../../src/components/PrintablePrescription.jsx");
    assert.ok(fs.existsSync(componentPath), "PrintablePrescription.jsx must exist");

    const content = fs.readFileSync(componentPath, "utf8");
    assert.ok(
      content.includes("MedCare Hospital"),
      "Includes hospital name/branding"
    );
    assert.ok(
      content.includes("rxNumber"),
      "Renders prescription number"
    );
    assert.ok(
      content.includes("patientName"),
      "Renders patient details"
    );
    assert.ok(
      content.includes("doctorName"),
      "Renders doctor details"
    );
    assert.ok(
      content.includes("departmentName"),
      "Renders department if available"
    );
    assert.ok(
      content.includes("diagnosisNotes"),
      "Renders diagnosis / clinical notes"
    );
    assert.ok(
      content.includes("items.map"),
      "Renders prescribed medicines table"
    );
    assert.ok(
      content.includes("Instructions for Patient & Pharmacy"),
      "Includes patient & pharmacy guidance footer"
    );
    assert.ok(
      content.includes("print-rx-signature"),
      "Includes physician signature and stamp section"
    );
  });

  test("22. CSS print media rules configure A4 layout and hide screen UI during print", () => {
    const cssPath = path.resolve(__dirname, "../../../src/App.css");
    const content = fs.readFileSync(cssPath, "utf8");

    assert.ok(
      content.includes("@media print"),
      "Includes @media print stylesheet"
    );
    assert.ok(
      content.includes("size: A4 portrait"),
      "Specifies A4 portrait page size"
    );
    assert.ok(
      content.includes(".prescription-print-document"),
      "Includes dedicated styling for printable prescription document"
    );
    assert.ok(
      content.includes("break-inside: avoid") || content.includes("page-break-inside: avoid"),
      "Enforces page break safety on rows and cards"
    );
  });
});
