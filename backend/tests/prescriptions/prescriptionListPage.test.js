const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Prescription List Page UI Contract & Component Unit Tests", () => {
  let originalFetch;
  let lastFetchCall = null;
  let prescriptionService;

  beforeEach(async () => {
    originalFetch = global.fetch;
    lastFetchCall = null;

    // Import prescription service
    prescriptionService = await import("../../../src/services/prescriptionService.js");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetchSuccess(responseData = [], status = 200) {
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

  function mockFetchError(message = "Internal Server Error", status = 500) {
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

  test("1. Prescription page source file exists and follows component structure", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/Prescriptions.jsx");
    assert.ok(fs.existsSync(pagePath), "Prescriptions.jsx page file must exist");

    const content = fs.readFileSync(pagePath, "utf8");
    assert.ok(content.includes("export default Prescriptions"), "Must export Prescriptions component");
    assert.ok(content.includes("getPrescriptions"), "Must use getPrescriptions from service layer");
    assert.ok(content.includes("StatusBadge"), "Must use StatusBadge component");
  });

  test("2. Initial page state is empty before API load (no hardcoded fake data)", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/Prescriptions.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("useState([])"), "Initial prescriptions state must be empty array");
    assert.ok(!content.includes("RX-MOCK"), "Must not contain fake/mock prescription data");
    assert.ok(!content.includes("John Doe Fake"), "Must not contain hardcoded fake patient data");
  });

  test("3. Successful prescription data fetch calls backend API via service layer", async () => {
    const sampleData = [
      {
        id: 101,
        prescriptionNumber: "RX000101",
        patientName: "John Doe",
        doctorName: "Dr. Alice Smith",
        prescriptionDate: "2026-09-17",
        diagnosisNotes: "Acute Bronchitis",
        status: "ACTIVE",
      },
    ];

    mockFetchSuccess(sampleData);
    const result = await prescriptionService.getPrescriptions({ page: 1, limit: 10 });

    assert.ok(lastFetchCall, "API request must be executed");
    assert.ok(lastFetchCall.url.includes("/api/v1/prescriptions"), "Endpoint must be /api/v1/prescriptions");
    assert.strictEqual(lastFetchCall.options.credentials, "include", "Must transmit credentials: include");
    assert.deepStrictEqual(result, sampleData, "Returned data must match backend response");
  });

  test("4. Empty state is returned when backend has no prescriptions", async () => {
    mockFetchSuccess([]);
    const result = await prescriptionService.getPrescriptions();

    assert.ok(Array.isArray(result), "Result must be an array");
    assert.strictEqual(result.length, 0, "Array must be empty");
  });

  test("5. Search and status filters are correctly passed as query parameters", async () => {
    mockFetchSuccess([]);

    await prescriptionService.getPrescriptions({
      search: "Amoxicillin",
      status: "COMPLETED",
      page: 1,
      limit: 10,
    });

    assert.ok(lastFetchCall, "Fetch should be called");
    const urlObj = new URL(lastFetchCall.url, "http://localhost");
    assert.strictEqual(urlObj.searchParams.get("search"), "Amoxicillin");
    assert.strictEqual(urlObj.searchParams.get("status"), "COMPLETED");
    assert.strictEqual(urlObj.searchParams.get("page"), "1");
    assert.strictEqual(urlObj.searchParams.get("limit"), "10");
  });

  test("6. Pagination page increments are passed to backend API", async () => {
    mockFetchSuccess([]);

    await prescriptionService.getPrescriptions({ page: 2, limit: 10 });

    const urlObj = new URL(lastFetchCall.url, "http://localhost");
    assert.strictEqual(urlObj.searchParams.get("page"), "2");
    assert.strictEqual(urlObj.searchParams.get("limit"), "10");
  });

  test("7. Error state handling when backend returns HTTP error", async () => {
    mockFetchError("Database error occurred", 500);

    await assert.rejects(
      prescriptionService.getPrescriptions(),
      (err) => {
        assert.ok(
          err.message.includes("Database error occurred") ||
            err.message.includes("Database or internal service error") ||
            err.message.includes("HTTP 500"),
          "Error message contains error details"
        );
        assert.strictEqual(err.status, 500);
        return true;
      }
    );
  });

  test("8. Retry invokes getPrescriptions again", async () => {
    mockFetchError("Transient failure", 500);
    try {
      await prescriptionService.getPrescriptions();
    } catch {
      // Expected initial error
    }

    mockFetchSuccess([{ id: 202, status: "ACTIVE" }]);
    const result = await prescriptionService.getPrescriptions();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 202);
  });

  test("9. StatusBadge component supports ACTIVE, COMPLETED, CANCELLED statuses", () => {
    const badgePath = path.resolve(__dirname, "../../../src/components/StatusBadge.jsx");
    const content = fs.readFileSync(badgePath, "utf8");

    assert.ok(content.includes("status-active"), "StatusBadge must handle active");
    assert.ok(content.includes("status-completed"), "StatusBadge must handle completed");
    assert.ok(content.includes("status-cancelled"), "StatusBadge must handle cancelled");
  });

  test("10. View/Details action navigates to /prescriptions/:id pattern", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/Prescriptions.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes("navigate(`/prescriptions/${rx.id}`)"), "View action must use /prescriptions/${rx.id}");
  });

  test("11. Route is registered in App.jsx under ProtectedRoute", () => {
    const appPath = path.resolve(__dirname, "../../../src/App.jsx");
    const content = fs.readFileSync(appPath, "utf8");

    assert.ok(content.includes('path="/prescriptions"'), "App.jsx must contain /prescriptions route");
    assert.ok(content.includes("<Prescriptions />"), "Route element must render <Prescriptions />");
  });

  test("12. Sidebar navigation link is included in AppLayout.jsx", () => {
    const layoutPath = path.resolve(__dirname, "../../../src/components/AppLayout.jsx");
    const content = fs.readFileSync(layoutPath, "utf8");

    assert.ok(content.includes('to="/prescriptions"'), "AppLayout must contain NavLink to /prescriptions");
    assert.ok(content.includes("Prescriptions"), "NavLink label must say Prescriptions");
  });

  test("13. Basic accessibility requirements are met in Prescriptions.jsx", () => {
    const pagePath = path.resolve(__dirname, "../../../src/pages/Prescriptions.jsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(content.includes('htmlFor="prescription-search"'), "Search field must have label with htmlFor");
    assert.ok(content.includes('id="prescription-search"'), "Search input must have matching id");
    assert.ok(content.includes('htmlFor="status-filter"'), "Status select must have label with htmlFor");
    assert.ok(content.includes('id="status-filter"'), "Status select must have matching id");
    assert.ok(content.includes("<th>Prescription #</th>"), "Table must contain semantic headers");
    assert.ok(content.includes('type="button"'), "Buttons must specify type='button'");
    assert.ok(content.includes("aria-label="), "Interactive action buttons must provide aria-label");
  });
});
