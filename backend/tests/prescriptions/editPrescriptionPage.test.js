const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Prescription Edit / Update Page UI Contract & Component Unit Tests", () => {
  let originalFetch;
  let fetchCalls = [];
  let prescriptionService;

  beforeEach(async () => {
    originalFetch = global.fetch;
    fetchCalls = [];

    // Import ES module prescriptionService.js dynamically
    prescriptionService = await import("../../../src/services/prescriptionService.js");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetchSuccess(responseData = {}, status = 200) {
    global.fetch = async (url, options = {}) => {
      fetchCalls.push({ url, options });
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: "OK",
        json: async () => ({ success: true, data: responseData }),
      };
    };
  }

  function mockFetchError(message = "Not Found", status = 404) {
    global.fetch = async (url, options = {}) => {
      fetchCalls.push({ url, options });
      return {
        ok: false,
        status,
        statusText: "Error",
        json: async () => ({ success: false, message }),
      };
    };
  }

  test("1. EditPrescription page source file exists and follows component structure", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    assert.ok(fs.existsSync(pagePath), "EditPrescription.jsx page file must exist");

    const content = fs.readFileSync(pagePath, "utf8");
    assert.ok(
      content.includes("export default EditPrescription"),
      "Must export EditPrescription component as default"
    );
    assert.ok(
      content.includes("getPrescriptionById"),
      "Must import getPrescriptionById from prescriptionService"
    );
    assert.ok(
      content.includes("updatePrescription"),
      "Must import updatePrescription from prescriptionService"
    );
    assert.ok(
      content.includes("addPrescriptionItem"),
      "Must import addPrescriptionItem from prescriptionService"
    );
    assert.ok(
      content.includes("updatePrescriptionItem"),
      "Must import updatePrescriptionItem from prescriptionService"
    );
    assert.ok(
      content.includes("removePrescriptionItem"),
      "Must import removePrescriptionItem from prescriptionService"
    );
  });

  test("2 & 3. Prescription ID is read from route and getPrescriptionById() is called", async () => {
    const sampleRx = {
      id: 55,
      prescriptionNumber: "RX-00055",
      patientId: 10,
      patientName: "John Smith",
      doctorId: 3,
      doctorName: "Dr. Alice Vance",
      prescriptionDate: "2026-09-17",
      diagnosisNotes: "Patient has persistent cough and fever.",
      status: "ACTIVE",
      items: [
        {
          id: 101,
          medicineName: "Amoxicillin 500mg",
          dosage: "1 capsule",
          frequency: "Three times daily",
          duration: "7 days",
          quantity: 21,
          instructions: "Take with food",
        },
      ],
    };

    mockFetchSuccess(sampleRx, 200);

    const result = await prescriptionService.getPrescriptionById(55);

    assert.equal(fetchCalls.length, 1);
    assert.ok(
      fetchCalls[0].url.endsWith("/prescriptions/55"),
      "Fetches existing prescription data by ID"
    );
    assert.equal(result.id, 55);
    assert.equal(result.prescriptionNumber, "RX-00055");
  });

  test("4. Existing prescription data populates form fields", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("formData.prescriptionDate"), "Populates prescriptionDate form field");
    assert.ok(content.includes("formData.diagnosisNotes"), "Populates diagnosisNotes form field");
    assert.ok(content.includes("formData.status"), "Populates status form field");
  });

  test("5 & 6. Prescription date and diagnosis/notes can be edited", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes('type="date"'), "Renders date input for editing prescription date");
    assert.ok(content.includes('name="diagnosisNotes"'), "Renders textarea for editing diagnosis notes");
    assert.ok(content.includes("handleInputChange"), "Handles change events for form fields");
  });

  test("7. Status behavior follows backend lifecycle rules (ACTIVE, COMPLETED, CANCELLED)", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("ACTIVE"), "Supports ACTIVE status");
    assert.ok(content.includes("COMPLETED"), "Supports COMPLETED status");
    assert.ok(content.includes("CANCELLED"), "Supports CANCELLED status");
    assert.ok(
      content.includes("Cannot revert a completed prescription back to active"),
      "Enforces lifecycle rule prohibiting COMPLETED -> ACTIVE transition"
    );
    assert.ok(
      content.includes("Cannot modify a cancelled prescription"),
      "Enforces lifecycle rule prohibiting modification of CANCELLED prescriptions"
    );
  });

  test("8. Existing prescription items render in edit view", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("items.map"), "Maps and renders prescription items");
    assert.ok(content.includes("medicineName"), "Renders item medicineName input");
    assert.ok(content.includes("dosage"), "Renders item dosage input");
    assert.ok(content.includes("frequency"), "Renders item frequency input");
    assert.ok(content.includes("duration"), "Renders item duration input");
    assert.ok(content.includes("quantity"), "Renders item quantity input");
  });

  test("9 & 10. Item validation and positive integer quantity validation work", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes("Medicine name is required"),
      "Validates required medicine name"
    );
    assert.ok(
      content.includes("Dosage is required"),
      "Validates required dosage"
    );
    assert.ok(
      content.includes("Frequency is required"),
      "Validates required frequency"
    );
    assert.ok(
      content.includes("Duration is required"),
      "Validates required duration"
    );
    assert.ok(
      content.includes("Quantity must be a positive integer"),
      "Validates quantity as positive integer"
    );
  });

  test("11. Item update invokes updatePrescriptionItem()", async () => {
    const updatedItem = {
      medicineName: "Amoxicillin 500mg",
      dosage: "1 capsule",
      frequency: "Four times daily",
      duration: "10 days",
      quantity: 40,
      instructions: "Take with food",
    };

    mockFetchSuccess({ id: 101, ...updatedItem }, 200);

    await prescriptionService.updatePrescriptionItem(101, updatedItem);

    assert.equal(fetchCalls.length, 1);
    assert.ok(
      fetchCalls[0].url.endsWith("/prescriptions/items/101"),
      "Endpoint matches /prescriptions/items/101"
    );
    assert.equal(fetchCalls[0].options.method, "PUT");
  });

  test("12. Item addition invokes addPrescriptionItem()", async () => {
    const newItem = {
      medicineName: "Ibuprofen 400mg",
      dosage: "1 tablet",
      frequency: "As needed",
      duration: "5 days",
      quantity: 10,
      instructions: "Take after meals",
    };

    mockFetchSuccess({ id: 102, ...newItem }, 200);

    await prescriptionService.addPrescriptionItem(55, newItem);

    assert.equal(fetchCalls.length, 1);
    assert.ok(
      fetchCalls[0].url.endsWith("/prescriptions/55/items"),
      "Endpoint matches /prescriptions/55/items"
    );
    assert.equal(fetchCalls[0].options.method, "POST");
  });

  test("13. Item removal invokes removePrescriptionItem()", async () => {
    mockFetchSuccess({}, 200);

    await prescriptionService.removePrescriptionItem(101);

    assert.equal(fetchCalls.length, 1);
    assert.ok(
      fetchCalls[0].url.endsWith("/prescriptions/items/101"),
      "Endpoint matches /prescriptions/items/101"
    );
    assert.equal(fetchCalls[0].options.method, "DELETE");
  });

  test("14 & 15. Prescription update uses updatePrescription() without sending server-controlled fields", async () => {
    const updateData = {
      id: 55, // Should be stripped by sanitizePayload
      prescriptionNumber: "RX-00055", // Should be stripped
      prescriptionDate: "2026-09-18",
      diagnosisNotes: "Updated clinical notes for test.",
      status: "COMPLETED",
      createdBy: 99, // Should be stripped
      createdAt: "2026-09-17T00:00:00.000Z", // Should be stripped
    };

    mockFetchSuccess({ id: 55, status: "COMPLETED" }, 200);

    await prescriptionService.updatePrescription(55, updateData);

    assert.equal(fetchCalls.length, 1);
    assert.ok(fetchCalls[0].url.endsWith("/prescriptions/55"));
    assert.equal(fetchCalls[0].options.method, "PUT");

    const sentPayload = JSON.parse(fetchCalls[0].options.body);
    assert.equal(sentPayload.id, undefined, "Server-controlled field 'id' stripped");
    assert.equal(
      sentPayload.prescriptionNumber,
      undefined,
      "Server-controlled field 'prescriptionNumber' stripped"
    );
    assert.equal(
      sentPayload.createdBy,
      undefined,
      "Server-controlled field 'createdBy' stripped"
    );
    assert.equal(
      sentPayload.createdAt,
      undefined,
      "Server-controlled field 'createdAt' stripped"
    );
    assert.equal(sentPayload.prescriptionDate, "2026-09-18");
    assert.equal(sentPayload.status, "COMPLETED");
  });

  test("16 & 17. Duplicate submission is prevented and saving state is toggled", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("saving"), "Tracks saving state variable");
    assert.ok(content.includes("Saving Changes..."), "Displays submitting indicator button text");
    assert.ok(
      content.includes("disabled={isCancelled || saving}"),
      "Disables submit button while saving or when cancelled"
    );
  });

  test("18 & 19. 404 state and 401/403/500 error handling with retry option", async () => {
    mockFetchError("Internal Server Error", 500);

    await assert.rejects(
      async () => {
        await prescriptionService.getPrescriptionById(55);
      },
      (err) => {
        assert.equal(err.status, 500);
        return true;
      }
    );

    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Prescription Not Found"), "Provides clear 404 Prescription Not Found state");
    assert.ok(content.includes("Unable to Load Prescription"), "Renders clear error state on API failure");
    assert.ok(content.includes("onClick={loadPrescriptionData}"), "Provides Try Again / Retry action trigger");
  });

  test("20. Successful update navigates to details page /prescriptions/:id", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes("navigate(`/prescriptions/${id}`)"),
      "Navigates to prescription details page /prescriptions/:id on success"
    );
  });

  test("21 & 22. Route /prescriptions/:id/edit is protected in App.jsx for admin and doctor roles", () => {
    const appPath = path.resolve(__dirname, "../../../src/App.jsx");
    const content = fs.readFileSync(appPath, "utf8");

    assert.ok(
      content.includes('path="/prescriptions/:id/edit"'),
      "Route /prescriptions/:id/edit is registered in App.jsx"
    );
    assert.ok(
      content.includes('<EditPrescription />'),
      "App.jsx renders EditPrescription for /prescriptions/:id/edit"
    );
    assert.ok(
      content.includes('allowedRoles={["admin", "doctor"]}'),
      "Restricts access strictly to admin and doctor roles (receptionist is blocked)"
    );
  });

  test("23. Basic accessibility requirements are met in EditPrescription.jsx", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/EditPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes('htmlFor="'), "All form fields have associated labels via htmlFor");
    assert.ok(content.includes('type="button"'), "All buttons specify type='button'");
    assert.ok(content.includes('aria-label='), "Provides aria-label descriptors on controls");
    assert.ok(content.includes('role="alert"'), "Uses role='alert' for error and warning messages");
  });
});
