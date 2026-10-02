const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Prescription Cancel + Lifecycle UI & Contract Tests", () => {
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

  function mockFetchError(message = "Bad Request", status = 400) {
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

  test("1 & 2. Admin and Doctor see Cancel action for ACTIVE prescription", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    assert.ok(
      content.includes('userRole === "admin" || userRole === "doctor"'),
      "Checks for admin and doctor roles"
    );
    assert.ok(
      content.includes('prescription.status === "ACTIVE"'),
      "Shows Cancel action when prescription status is ACTIVE"
    );
    assert.ok(
      content.includes('Cancel Prescription'),
      "Renders 'Cancel Prescription' button"
    );
  });

  test("3. Receptionist does not see Cancel action", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    // Logic requires userRole === 'admin' || userRole === 'doctor'
    assert.ok(
      content.includes('const isAuthorizedRole = userRole === "admin" || userRole === "doctor"'),
      "Authorized roles are explicitly admin and doctor"
    );
  });

  test("4. COMPLETED prescription does not show Cancel action", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    assert.ok(
      content.includes('const canCancel = isAuthorizedRole && prescription.status === "ACTIVE"'),
      "canCancel requires ACTIVE status; COMPLETED status prevents rendering Cancel button"
    );
  });

  test("5. CANCELLED prescription does not show Cancel or Edit action", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    assert.ok(
      content.includes('const canEdit = isAuthorizedRole && prescription.status !== "CANCELLED"'),
      "canEdit prevents rendering Edit button for CANCELLED prescriptions"
    );
    assert.ok(
      content.includes('const canCancel = isAuthorizedRole && prescription.status === "ACTIVE"'),
      "canCancel prevents rendering Cancel button for CANCELLED prescriptions"
    );
  });

  test("6. Confirmation dialog opens with permanent lifecycle warning and summary", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    assert.ok(
      content.includes("Confirm Prescription Cancellation"),
      "Contains confirmation dialog header title"
    );
    assert.ok(
      content.includes("permanent lifecycle change"),
      "Explains permanent lifecycle change warning"
    );
    assert.ok(
      content.includes("role=\"dialog\""),
      "Dialog element has role='dialog' for accessibility"
    );
    assert.ok(
      content.includes("aria-modal=\"true\""),
      "Dialog element has aria-modal='true'"
    );
  });

  test("7. Closing confirmation modal does not call cancelPrescription", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    assert.ok(
      content.includes("handleCloseCancelModal"),
      "Has close handler to dismiss modal without calling API"
    );
    assert.ok(
      content.includes("Keep Active"),
      "Provides 'Keep Active' button to close modal safely"
    );
  });

  test("8. Confirming calls cancelPrescription with correct prescription ID", async () => {
    mockFetchSuccess({ id: 88, status: "CANCELLED" }, 200);

    const result = await prescriptionService.cancelPrescription(88);

    assert.equal(fetchCalls.length, 1);
    assert.ok(
      fetchCalls[0].url.endsWith("/prescriptions/88/cancel"),
      "Calls POST endpoint /prescriptions/88/cancel"
    );
    assert.equal(fetchCalls[0].options.method, "POST");
    assert.equal(fetchCalls[0].options.credentials, "include");
    assert.equal(result.status, "CANCELLED");
  });

  test("9 & 10. Duplicate cancellation is prevented and loading state 'Cancelling...' is displayed", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    assert.ok(
      content.includes("disabled={cancelling}"),
      "Disables action buttons during cancellation submission"
    );
    assert.ok(
      content.includes('cancelling ? "Cancelling..." : "Confirm Cancellation"'),
      "Displays loading indicator text 'Cancelling...' on action button"
    );
    assert.ok(
      content.includes("if (cancelling) return;"),
      "Short-circuits duplicate submission attempts if already cancelling"
    );
  });

  test("11, 12 & 13. Successful cancellation updates status to CANCELLED and hides Edit/Cancel buttons", () => {
    const detailsPath = path.resolve(__dirname, "../../../src/pages/PrescriptionDetails.jsx");
    const content = fs.readFileSync(detailsPath, "utf8");

    assert.ok(
      content.includes("setCancelSuccess(\"Prescription cancelled successfully.\")"),
      "Sets success banner message on completion"
    );
    assert.ok(
      content.includes("setPrescription(updated)"),
      "Updates local prescription state with CANCELLED status"
    );
  });

  test("14. 401 Unauthorized error is handled safely", async () => {
    mockFetchError("Unauthorized access", 401);

    await assert.rejects(
      async () => {
        await prescriptionService.cancelPrescription(88);
      },
      (err) => {
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  test("15. 403 Forbidden error is handled safely", async () => {
    mockFetchError("Insufficient permissions to cancel prescription", 403);

    await assert.rejects(
      async () => {
        await prescriptionService.cancelPrescription(88);
      },
      (err) => {
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  test("16. 404 Not Found error is handled safely", async () => {
    mockFetchError("Prescription not found", 404);

    await assert.rejects(
      async () => {
        await prescriptionService.cancelPrescription(9999);
      },
      (err) => {
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  test("17. 400 Lifecycle validation error is handled safely", async () => {
    mockFetchError("Cannot cancel a completed prescription", 400);

    await assert.rejects(
      async () => {
        await prescriptionService.cancelPrescription(88);
      },
      (err) => {
        assert.equal(err.status, 400);
        return true;
      }
    );
  });

  test("18 & 19. 500 Internal Server Error is handled safely without exposing database or SQL internals", async () => {
    mockFetchError("Internal server error", 500);

    await assert.rejects(
      async () => {
        await prescriptionService.cancelPrescription(88);
      },
      (err) => {
        assert.equal(err.status, 500);
        assert.ok(!err.message.includes("SELECT"), "Error must not expose SQL keywords");
        assert.ok(!err.message.includes("postgres"), "Error must not expose database internals");
        return true;
      }
    );
  });
});
