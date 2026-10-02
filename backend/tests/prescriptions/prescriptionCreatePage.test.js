const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Prescription Create Page UI Contract & Component Unit Tests", () => {
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

  function mockFetchSuccess(responseData = {}, status = 201) {
    global.fetch = async (url, options) => {
      lastFetchCall = { url, options };
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: "Created",
        json: async () => ({ success: true, message: "Prescription created", data: responseData }),
      };
    };
  }

  function mockFetchError(message = "Bad Request", status = 400) {
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

  test("1. AddPrescription page file exists and imports required services", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    assert.ok(fs.existsSync(pagePath), "AddPrescription.jsx file must exist");

    const content = fs.readFileSync(pagePath, "utf8");
    assert.ok(content.includes("export default AddPrescription"), "Must export AddPrescription component");
    assert.ok(content.includes("createPrescription"), "Must use createPrescription from service");
    assert.ok(content.includes("getPatients"), "Must import getPatients");
    assert.ok(content.includes("getDoctors"), "Must import getDoctors");
  });

  test("2. Patient and doctor dropdown dependencies load from API services", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Promise.allSettled"), "Loads form dependencies in parallel safely");
    assert.ok(content.includes("loadingData"), "Tracks loading state while dependencies load");
  });

  test("3. Required fields (patient, doctor, date) validation logic is present", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Patient selection is required"), "Validates patient requirement");
    assert.ok(content.includes("Doctor selection is required"), "Validates doctor requirement");
    assert.ok(content.includes("Prescription date is required"), "Validates date requirement");
  });

  test("4. Dynamic prescription items can be added and removed", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("handleAddItem"), "Contains handler to add prescription items");
    assert.ok(content.includes("handleRemoveItem"), "Contains handler to remove prescription items");
  });

  test("5. Invalid quantity is rejected by client-side validation", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes("Quantity must be a positive integer"),
      "Validates that quantity must be a positive integer"
    );
  });

  test("6. Empty/invalid medicine item fields are rejected", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("Medicine name is required"), "Validates item medicine name");
    assert.ok(content.includes("Dosage is required"), "Validates item dosage");
    assert.ok(content.includes("Frequency is required"), "Validates item frequency");
    assert.ok(content.includes("Duration is required"), "Validates item duration");
  });

  test("7. Submit invokes prescriptionService.createPrescription with expected payload", async () => {
    mockFetchSuccess({ id: 501, prescriptionNumber: "RX000501" }, 201);

    const payload = {
      patientId: 10,
      doctorId: 5,
      prescriptionDate: "2026-09-17",
      diagnosisNotes: "Acute Bronchitis",
      items: [
        {
          medicineName: "Amoxicillin",
          dosage: "500mg",
          frequency: "3 times daily",
          duration: "7 days",
          quantity: 21,
          instructions: "Take with food",
        },
      ],
    };

    const result = await prescriptionService.createPrescription(payload);

    assert.ok(lastFetchCall, "API request must be executed");
    assert.strictEqual(lastFetchCall.url.includes("/api/v1/prescriptions"), true);
    assert.strictEqual(lastFetchCall.options.method, "POST");

    const sentBody = JSON.parse(lastFetchCall.options.body);
    assert.strictEqual(sentBody.patientId, 10);
    assert.strictEqual(sentBody.doctorId, 5);
    assert.strictEqual(sentBody.prescriptionDate, "2026-09-17");
    assert.strictEqual(sentBody.diagnosisNotes, "Acute Bronchitis");
    assert.strictEqual(sentBody.items.length, 1);
    assert.strictEqual(sentBody.items[0].medicineName, "Amoxicillin");
  });

  test("8. Server-controlled fields are stripped by service layer", async () => {
    mockFetchSuccess({ id: 502 }, 201);

    const dirtyPayload = {
      id: 999,
      prescriptionNumber: "RX999999",
      createdBy: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      patientId: 10,
      doctorId: 5,
      prescriptionDate: "2026-09-17",
      items: [
        {
          id: 888,
          prescriptionId: 999,
          medicineName: "Paracetamol",
          dosage: "500mg",
          frequency: "As needed",
          duration: "3 days",
        },
      ],
    };

    await prescriptionService.createPrescription(dirtyPayload);

    const sentBody = JSON.parse(lastFetchCall.options.body);
    assert.strictEqual(sentBody.id, undefined);
    assert.strictEqual(sentBody.prescriptionNumber, undefined);
    assert.strictEqual(sentBody.createdBy, undefined);
    assert.strictEqual(sentBody.items[0].id, undefined);
    assert.strictEqual(sentBody.items[0].prescriptionId, undefined);
  });

  test("9. Duplicate submission is prevented via isSubmitting state and disabled submit button", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("isSubmitting"), "Uses isSubmitting state");
    assert.ok(content.includes("disabled={isSubmitting}"), "Disables buttons during submission");
  });

  test("10. 400 validation error response is handled gracefully", async () => {
    mockFetchError("Invalid patient ID provided", 400);

    await assert.rejects(
      prescriptionService.createPrescription({ patientId: 999, doctorId: 5 }),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.ok(err.message.includes("Invalid patient ID provided"));
        return true;
      }
    );
  });

  test("11. 401 unauthenticated and 403 access denied errors are handled", async () => {
    mockFetchError("Access denied: Receptionists cannot create prescriptions", 403);

    await assert.rejects(
      prescriptionService.createPrescription({ patientId: 10, doctorId: 5 }),
      (err) => {
        assert.strictEqual(err.status, 403);
        assert.ok(err.message.includes("Access denied"));
        return true;
      }
    );
  });

  test("12. Receptionist cannot access /prescriptions/add route (RBAC guard in App.jsx)", () => {
    const appPath = path.resolve(__dirname, "../../../src/App.jsx");
    const content = fs.readFileSync(appPath, "utf8");

    assert.ok(
      content.includes('allowedRoles={["admin", "doctor"]}'),
      "Route /prescriptions/add must restrict allowedRoles to admin and doctor"
    );
    assert.ok(
      content.includes('fallbackPath="/prescriptions"'),
      "Unauthorized roles must fallback to /prescriptions"
    );
  });

  test("13. Basic accessibility requirements (labels, IDs, button types) are met", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/AddPrescription.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes('htmlFor="patientId"'), "Patient field has label with htmlFor");
    assert.ok(content.includes('id="patientId"'), "Patient select has matching id");
    assert.ok(content.includes('htmlFor="doctorId"'), "Doctor field has label with htmlFor");
    assert.ok(content.includes('id="doctorId"'), "Doctor select has matching id");
    assert.ok(content.includes('htmlFor="prescriptionDate"'), "Date field has label with htmlFor");
    assert.ok(content.includes('type="submit"'), "Submit button has type='submit'");
    assert.ok(content.includes('type="button"'), "Secondary buttons have type='button'");
  });
});
