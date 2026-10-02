const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");

const auditLogRoutes = require("../../src/routes/auditLogRoutes");
const auditLogService = require("../../src/services/auditLogService");

function createTestApp(user = null) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (user) {
      req.user = { ...user };
    }
    next();
  });

  app.use("/api/v1/audit-logs", auditLogRoutes);

  app.use((err, req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

describe("Audit Logs API: Route & RBAC Suite", () => {
  const unauthApp = createTestApp(null);
  const adminApp = createTestApp({ id: 1, role: "admin", username: "admin_user" });
  const doctorApp = createTestApp({ id: 2, role: "doctor", username: "doc_user" });
  const receptionistApp = createTestApp({ id: 3, role: "receptionist", username: "recep_user" });

  beforeEach(() => {
    auditLogService.listAuditLogs = async (params) => ({
      totalCount: 1,
      limit: 25,
      offset: 0,
      logs: [
        {
          id: 101,
          eventType: "AUTH_LOGIN_SUCCESS",
          userId: 1,
          role: "admin",
          action: "LOGIN",
          resourceType: "AUTH",
          resourceId: "1",
          outcome: "SUCCESS",
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  describe("1. Authentication & RBAC Guards", () => {
    test("unauthenticated access returns 401 Unauthorized", async () => {
      const res = await request(unauthApp).get("/api/v1/audit-logs");
      assert.strictEqual(res.status, 401);
    });

    test("doctor access returns 403 Forbidden", async () => {
      const res = await request(doctorApp).get("/api/v1/audit-logs");
      assert.strictEqual(res.status, 403);
    });

    test("receptionist access returns 403 Forbidden", async () => {
      const res = await request(receptionistApp).get("/api/v1/audit-logs");
      assert.strictEqual(res.status, 403);
    });

    test("admin access returns 200 OK with audit logs list", async () => {
      const res = await request(adminApp).get("/api/v1/audit-logs");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].eventType, "AUTH_LOGIN_SUCCESS");
    });
  });

  describe("2. Read-Only Constraint Enforcement", () => {
    test("POST /api/v1/audit-logs is not supported", async () => {
      const res = await request(adminApp).post("/api/v1/audit-logs").send({ event: "FAKE" });
      assert.ok(res.status === 404 || res.status === 405);
    });

    test("DELETE /api/v1/audit-logs is not supported", async () => {
      const res = await request(adminApp).delete("/api/v1/audit-logs/101");
      assert.ok(res.status === 404 || res.status === 405);
    });
  });
});
