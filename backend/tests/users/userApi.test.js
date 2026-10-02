const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");

const userRoutes = require("../../src/routes/userRoutes");
const userService = require("../../src/services/userService");

function createTestApp(user = null) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (user) {
      req.user = { ...user };
    }
    next();
  });

  app.use("/api/v1/users", userRoutes);

  app.use((err, req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

describe("User & Account Management API: Route & RBAC Suite", () => {
  const unauthApp = createTestApp(null);
  const adminApp = createTestApp({ id: 1, role: "admin", username: "admin_user" });
  const doctorApp = createTestApp({ id: 2, role: "doctor", username: "doc_user" });
  const receptionistApp = createTestApp({ id: 3, role: "receptionist", username: "recep_user" });

  beforeEach(() => {
    userService.listUsers = async (params) => ({
      totalCount: 1,
      limit: 20,
      offset: 0,
      users: [
        {
          id: 5,
          fullName: "John Doe",
          username: "johndoe",
          email: "john@example.com",
          role: "receptionist",
          isActive: true,
          doctorId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    userService.getUserById = async (id) => ({
      id: Number(id),
      fullName: "John Doe",
      username: "johndoe",
      email: "john@example.com",
      role: "receptionist",
      isActive: true,
      doctorId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    userService.updateUserRole = async (id, role) => ({
      id: Number(id),
      fullName: "John Doe",
      username: "johndoe",
      email: "john@example.com",
      role: role.toLowerCase(),
      isActive: true,
      doctorId: null,
    });

    userService.updateUserStatus = async (id, isActive) => ({
      id: Number(id),
      fullName: "John Doe",
      username: "johndoe",
      email: "john@example.com",
      role: "receptionist",
      isActive,
      doctorId: null,
    });
  });

  describe("1. Authentication & RBAC Guards", () => {
    test("unauthenticated access returns 401 Unauthorized", async () => {
      const res = await request(unauthApp).get("/api/v1/users");
      assert.strictEqual(res.status, 401);
    });

    test("doctor access returns 403 Forbidden", async () => {
      const res = await request(doctorApp).get("/api/v1/users");
      assert.strictEqual(res.status, 403);
    });

    test("receptionist access returns 403 Forbidden", async () => {
      const res = await request(receptionistApp).get("/api/v1/users");
      assert.strictEqual(res.status, 403);
    });

    test("admin access returns 200 OK with users list", async () => {
      const res = await request(adminApp).get("/api/v1/users");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].password_hash, undefined);
      assert.strictEqual(res.body.data[0].password, undefined);
    });
  });

  describe("2. User Operations", () => {
    test("admin can get user details by ID", async () => {
      const res = await request(adminApp).get("/api/v1/users/5");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.username, "johndoe");
      assert.strictEqual(res.body.data.password_hash, undefined);
    });

    test("admin can update user role", async () => {
      const res = await request(adminApp).put("/api/v1/users/5/role").send({ role: "doctor" });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.role, "doctor");
    });

    test("admin can update user status", async () => {
      const res = await request(adminApp).put("/api/v1/users/5/status").send({ isActive: false });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.isActive, false);
    });
  });
});
