const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("Prescription Frontend Service Unit Tests", () => {
  let originalFetch;
  let lastFetchCall = null;
  let prescriptionService;

  beforeEach(async () => {
    originalFetch = global.fetch;
    lastFetchCall = null;

    // Dynamically import ES module prescriptionService.js from root src/services
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
        statusText: status === 200 ? "OK" : "Created",
        json: async () => responseData,
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

  test("1. getPrescriptions builds the correct GET request", async () => {
    mockFetchSuccess({ success: true, data: [{ id: 1 }] });
    const result = await prescriptionService.getPrescriptions();

    assert.ok(lastFetchCall, "fetch should be called");
    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions");
    assert.strictEqual(lastFetchCall.options.credentials, "include");
    assert.deepStrictEqual(result, [{ id: 1 }]);
  });

  test("2. Filters are encoded correctly in getPrescriptions", async () => {
    mockFetchSuccess({ success: true, data: [] });
    await prescriptionService.getPrescriptions({
      patientId: 10,
      doctorId: 5,
      appointmentId: 3,
      status: "ACTIVE",
      date: "2026-09-17",
      search: "Amoxicillin & Test",
      page: 1,
      limit: 20,
    });

    assert.ok(lastFetchCall.url.includes("/api/v1/prescriptions?"));
    const urlObj = new URL(lastFetchCall.url, "http://localhost");
    assert.strictEqual(urlObj.searchParams.get("patientId"), "10");
    assert.strictEqual(urlObj.searchParams.get("doctorId"), "5");
    assert.strictEqual(urlObj.searchParams.get("appointmentId"), "3");
    assert.strictEqual(urlObj.searchParams.get("status"), "ACTIVE");
    assert.strictEqual(urlObj.searchParams.get("date"), "2026-09-17");
    assert.strictEqual(urlObj.searchParams.get("search"), "Amoxicillin & Test");
    assert.strictEqual(urlObj.searchParams.get("page"), "1");
    assert.strictEqual(urlObj.searchParams.get("limit"), "20");
  });

  test("3. getPrescriptionById uses the correct endpoint and validates ID", async () => {
    mockFetchSuccess({ success: true, data: { id: 101, prescriptionNumber: "RX000101" } });
    const res = await prescriptionService.getPrescriptionById(101);

    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions/101");
    assert.strictEqual(res.id, 101);

    await assert.rejects(
      prescriptionService.getPrescriptionById(""),
      /Prescription ID is required/
    );
  });

  test("4. createPrescription sends expected payload and strips server-controlled fields", async () => {
    mockFetchSuccess({ success: true, data: { id: 201, prescriptionNumber: "RX000201" } }, 201);

    const inputData = {
      id: 999, // Server-controlled
      prescriptionNumber: "RX_FAKE", // Server-controlled
      createdBy: 42, // Server-controlled
      patientId: 15,
      doctorId: 3,
      appointmentId: 8,
      prescriptionDate: "2026-09-17",
      diagnosisNotes: "Respiratory infection",
      items: [
        {
          id: 888, // Server-controlled item field
          medicineName: "Amoxicillin 500mg",
          dosage: "1 capsule",
          frequency: "TDS",
          duration: "7 days",
          instructions: "Take after food",
        },
      ],
    };

    await prescriptionService.createPrescription(inputData);

    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions");
    assert.strictEqual(lastFetchCall.options.method, "POST");
    assert.strictEqual(lastFetchCall.options.credentials, "include");

    const sentPayload = JSON.parse(lastFetchCall.options.body);
    assert.strictEqual(sentPayload.patientId, 15);
    assert.strictEqual(sentPayload.doctorId, 3);
    assert.strictEqual(sentPayload.diagnosisNotes, "Respiratory infection");

    // Verify server-controlled fields were stripped
    assert.strictEqual(sentPayload.id, undefined);
    assert.strictEqual(sentPayload.prescriptionNumber, undefined);
    assert.strictEqual(sentPayload.createdBy, undefined);
    assert.strictEqual(sentPayload.items[0].id, undefined);
    assert.strictEqual(sentPayload.items[0].medicineName, "Amoxicillin 500mg");
  });

  test("5. updatePrescription sends expected payload and strips server-controlled fields", async () => {
    mockFetchSuccess({ success: true, data: { id: 101, status: "ACTIVE" } });

    const updateData = {
      id: 101,
      prescriptionNumber: "RX000101",
      createdBy: 5,
      diagnosisNotes: "Updated diagnosis notes",
      status: "ACTIVE",
    };

    await prescriptionService.updatePrescription(101, updateData);

    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions/101");
    assert.strictEqual(lastFetchCall.options.method, "PUT");

    const sentPayload = JSON.parse(lastFetchCall.options.body);
    assert.strictEqual(sentPayload.diagnosisNotes, "Updated diagnosis notes");
    assert.strictEqual(sentPayload.id, undefined);
    assert.strictEqual(sentPayload.prescriptionNumber, undefined);
    assert.strictEqual(sentPayload.createdBy, undefined);
  });

  test("6. cancelPrescription uses POST and the correct endpoint", async () => {
    mockFetchSuccess({ success: true, data: { id: 101, status: "CANCELLED" } });

    await prescriptionService.cancelPrescription(101);

    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions/101/cancel");
    assert.strictEqual(lastFetchCall.options.method, "POST");
    assert.strictEqual(lastFetchCall.options.credentials, "include");
  });

  test("7. addPrescriptionItem uses correct endpoint and payload", async () => {
    mockFetchSuccess({ success: true, data: { id: 101 } }, 201);

    const itemData = {
      id: 777,
      medicineName: "Ibuprofen 400mg",
      dosage: "1 tablet",
      frequency: "BD",
      duration: "3 days",
    };

    await prescriptionService.addPrescriptionItem(101, itemData);

    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions/101/items");
    assert.strictEqual(lastFetchCall.options.method, "POST");

    const sentPayload = JSON.parse(lastFetchCall.options.body);
    assert.strictEqual(sentPayload.medicineName, "Ibuprofen 400mg");
    assert.strictEqual(sentPayload.id, undefined);
  });

  test("8. updatePrescriptionItem uses correct endpoint and payload", async () => {
    mockFetchSuccess({ success: true, data: { id: 101 } });

    const itemData = {
      id: 55,
      dosage: "2 tablets",
    };

    await prescriptionService.updatePrescriptionItem(55, itemData);

    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions/items/55");
    assert.strictEqual(lastFetchCall.options.method, "PUT");

    const sentPayload = JSON.parse(lastFetchCall.options.body);
    assert.strictEqual(sentPayload.dosage, "2 tablets");
    assert.strictEqual(sentPayload.id, undefined);
  });

  test("9. removePrescriptionItem uses DELETE and correct endpoint", async () => {
    mockFetchSuccess({ success: true, data: { id: 101 } });

    await prescriptionService.removePrescriptionItem(55);

    assert.strictEqual(lastFetchCall.url, "/api/v1/prescriptions/items/55");
    assert.strictEqual(lastFetchCall.options.method, "DELETE");
    assert.strictEqual(lastFetchCall.options.credentials, "include");
  });

  test("10. Authentication/session credentials follow existing credentials: include behavior", async () => {
    mockFetchSuccess({ success: true, data: [] });
    await prescriptionService.getPrescriptions();

    assert.strictEqual(lastFetchCall.options.credentials, "include");
  });

  test("11. Non-2xx responses are handled according to existing error conventions", async () => {
    mockFetchError("Prescription not found", 404);

    await assert.rejects(
      prescriptionService.getPrescriptionById(999),
      (err) => {
        assert.strictEqual(err.message, "Prescription not found");
        assert.strictEqual(err.status, 404);
        return true;
      }
    );
  });

  test("12. Server-controlled fields are not unnecessarily sent by the service", async () => {
    mockFetchSuccess({ success: true, data: { id: 1 } }, 201);

    await prescriptionService.createPrescription({
      createdBy: "admin",
      created_by: "admin",
      prescriptionNumber: "RX123",
      prescription_number: "RX123",
      patientId: 1,
      doctorId: 1,
    });

    const sentPayload = JSON.parse(lastFetchCall.options.body);
    assert.strictEqual(sentPayload.createdBy, undefined);
    assert.strictEqual(sentPayload.created_by, undefined);
    assert.strictEqual(sentPayload.prescriptionNumber, undefined);
    assert.strictEqual(sentPayload.prescription_number, undefined);
    assert.strictEqual(sentPayload.patientId, 1);
  });
});
