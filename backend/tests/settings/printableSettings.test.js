const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Task 6: Hospital Profile & System Settings Printable Integration Suite", () => {
  const printableInvoicePath = path.resolve(
    __dirname,
    "../../../src/components/PrintableInvoice.jsx"
  );
  const printablePrescriptionPath = path.resolve(
    __dirname,
    "../../../src/components/PrintablePrescription.jsx"
  );
  const printableLabReportPath = path.resolve(
    __dirname,
    "../../../src/components/PrintableLabReport.jsx"
  );
  const settingsPagePath = path.resolve(
    __dirname,
    "../../../src/pages/Settings.jsx"
  );
  const appLayoutPath = path.resolve(
    __dirname,
    "../../../src/components/AppLayout.jsx"
  );
  const appJsxPath = path.resolve(
    __dirname,
    "../../../src/App.jsx"
  );

  test("1. PrintableInvoice integrates dynamic hospital profile and currency settings", () => {
    assert.ok(fs.existsSync(printableInvoicePath));
    const content = fs.readFileSync(printableInvoicePath, "utf8");

    // Dynamic settings import & usage
    assert.ok(content.includes("getSettings"), "Must import getSettings from settingsService");
    assert.ok(content.includes("hospitalName"), "Must bind dynamic hospitalName");
    assert.ok(content.includes("currencySymbol"), "Must support dynamic currencySymbol");
    assert.ok(content.includes("footerText"), "Must support custom invoiceFooter");
    assert.ok(content.includes("logoUrl") || content.includes("hospitalLogo"), "Must support hospitalLogo rendering");
    assert.ok(content.includes("formatCurrency"), "Must format currency dynamically");
  });

  test("2. PrintablePrescription integrates dynamic hospital profile and header tagline", () => {
    assert.ok(fs.existsSync(printablePrescriptionPath));
    const content = fs.readFileSync(printablePrescriptionPath, "utf8");

    assert.ok(content.includes("getSettings"), "Must import getSettings from settingsService");
    assert.ok(content.includes("hospitalName"), "Must bind dynamic hospitalName");
    assert.ok(content.includes("prescriptionHeader") || content.includes("rxHeader"), "Must support custom prescriptionHeader");
    assert.ok(content.includes("logoUrl") || content.includes("hospitalLogo"), "Must support hospitalLogo rendering");
  });

  test("3. PrintableLabReport integrates dynamic hospital profile and diagnostic header", () => {
    assert.ok(fs.existsSync(printableLabReportPath));
    const content = fs.readFileSync(printableLabReportPath, "utf8");

    assert.ok(content.includes("getSettings"), "Must import getSettings from settingsService");
    assert.ok(content.includes("hospitalName"), "Must bind dynamic hospitalName");
    assert.ok(content.includes("reportHeader") || content.includes("labHeader"), "Must support custom reportHeader");
    assert.ok(content.includes("logoUrl") || content.includes("hospitalLogo"), "Must support hospitalLogo rendering");
  });

  test("4. Settings page implements all required profile, billing, and document branding sections", () => {
    assert.ok(fs.existsSync(settingsPagePath));
    const content = fs.readFileSync(settingsPagePath, "utf8");

    // Profile fields
    assert.ok(content.includes("hospitalName"), "Must include hospitalName field");
    assert.ok(content.includes("hospitalLogo"), "Must include hospitalLogo field");
    assert.ok(content.includes("addressLine1"), "Must include addressLine1 field");
    assert.ok(content.includes("phone"), "Must include phone field");
    assert.ok(content.includes("email"), "Must include email field");
    assert.ok(content.includes("website"), "Must include website field");

    // Regional & Billing fields
    assert.ok(content.includes("currencyCode"), "Must include currencyCode field");
    assert.ok(content.includes("currencySymbol"), "Must include currencySymbol field");
    assert.ok(content.includes("taxEnabled"), "Must include taxEnabled field");
    assert.ok(content.includes("taxRate"), "Must include taxRate field");

    // Document branding fields
    assert.ok(content.includes("invoiceFooter"), "Must include invoiceFooter field");
    assert.ok(content.includes("prescriptionHeader"), "Must include prescriptionHeader field");
    assert.ok(content.includes("reportHeader"), "Must include reportHeader field");
  });

  test("5. Navigation and route protection: /settings is Admin-only", () => {
    const layoutContent = fs.readFileSync(appLayoutPath, "utf8");
    assert.ok(layoutContent.includes("canAccessSettings"), "AppLayout must define canAccessSettings check");
    assert.ok(layoutContent.includes('to="/settings"'), "AppLayout must render NavLink to /settings");

    const appContent = fs.readFileSync(appJsxPath, "utf8");
    assert.ok(appContent.includes('path="/settings"'), "App.jsx must register /settings route");
    assert.ok(appContent.includes('allowedRoles={["admin"]}'), "Settings route must be restricted to admin");
  });

  test("6. No secret exposure or raw sensitive data in settings files", () => {
    const filesToCheck = [
      printableInvoicePath,
      printablePrescriptionPath,
      printableLabReportPath,
      settingsPagePath,
    ];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf8");
      assert.strictEqual(content.includes("password_hash"), false, "Must not leak password_hash");
      assert.strictEqual(content.includes("secretKey"), false, "Must not leak secretKey");
      assert.strictEqual(content.includes("SESSION_SECRET"), false, "Must not leak SESSION_SECRET");
    }
  });
});
