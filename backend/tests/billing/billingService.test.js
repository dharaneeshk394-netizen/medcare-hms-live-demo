const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getTestPool, isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const billingService = require("../../src/services/billingService");

describe("Billing Service Automated Test Suite", () => {
  let pool;
  let testUser = null;
  let testPatient1 = null;
  let testPatient2 = null;
  let testDoctor = null;
  let testDepartment = null;
  let testAppointment = null;
  let testAdmission = null;

  // Track created IDs for strict, isolated test cleanup
  const createdInvoiceIds = [];
  const createdPatientIds = [];
  const createdDoctorIds = [];
  const createdDeptIds = [];
  const createdApptIds = [];
  const createdAdmIds = [];
  const createdUserIds = [];

  before(async () => {
    if (!isTestDbConfigured()) {
      return;
    }
    pool = getTestPool();

    // 1. Create a test user
    const userRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active)
       VALUES ('Billing Test Admin', 'billing_admin_test', 'billing_admin@test.local', 'hash', 'admin', true)
       RETURNING id, full_name, role`
    );
    testUser = userRes.rows[0];
    createdUserIds.push(testUser.id);

    // 2. Create test department & doctor
    const deptRes = await pool.query(
      `INSERT INTO departments (department_id, name, description, status)
       VALUES ('D_BILL', 'Billing Dept', 'Test Dept', 'Active')
       RETURNING id`
    );
    testDepartment = deptRes.rows[0];
    createdDeptIds.push(testDepartment.id);

    const docRes = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, email, department, status)
       VALUES ('DOC_BILL', 'Dr. Billing Test', 'General Practice', '555-0101', 'dr.billing@test.local', 'Billing Dept', 'Active')
       RETURNING id`
    );
    testDoctor = docRes.rows[0];
    createdDoctorIds.push(testDoctor.id);

    // 3. Create test patients
    const p1Res = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, email, blood_group, status)
       VALUES ('P_BILL_01', 'Alice Billing Patient', 30, 'Female', '555-1111', 'alice@test.local', 'O+', 'Active')
       RETURNING id, patient_id AS "patientCode", name`
    );
    testPatient1 = p1Res.rows[0];
    createdPatientIds.push(testPatient1.id);

    const p2Res = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, email, blood_group, status)
       VALUES ('P_BILL_02', 'Bob Other Patient', 45, 'Male', '555-2222', 'bob@test.local', 'A+', 'Active')
       RETURNING id, patient_id AS "patientCode", name`
    );
    testPatient2 = p2Res.rows[0];
    createdPatientIds.push(testPatient2.id);

    // 4. Create test appointment for Patient 1
    const apptRes = await pool.query(
      `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
       VALUES ('A_BILL_01', $1, $2, CURRENT_DATE, '09:00:00', 'Routine checkup', 'Completed')
       RETURNING id`,
      [testPatient1.id, testDoctor.id]
    );
    testAppointment = apptRes.rows[0];
    createdApptIds.push(testAppointment.id);

    // 5. Create test admission for Patient 1
    const admRes = await pool.query(
      `INSERT INTO admissions (admission_id, patient_id, doctor_id, room_number, bed_number, admission_date, status)
       VALUES ('ADM_BILL_01', $1, $2, 'Room 101', 'Bed 1', CURRENT_DATE, 'Admitted')
       RETURNING id`,
      [testPatient1.id, testDoctor.id]
    );
    testAdmission = admRes.rows[0];
    createdAdmIds.push(testAdmission.id);
  });

  after(async () => {
    if (!isTestDbConfigured() || !pool) {
      await closeAppDb();
      return;
    }

    try {
      // Clean up test data in reverse dependency order
      if (createdInvoiceIds.length > 0) {
        await pool.query(
          `DELETE FROM payments WHERE invoice_id = ANY($1::int[])`,
          [createdInvoiceIds]
        );
        await pool.query(
          `DELETE FROM invoice_items WHERE invoice_id = ANY($1::int[])`,
          [createdInvoiceIds]
        );
        await pool.query(
          `DELETE FROM invoices WHERE id = ANY($1::int[])`,
          [createdInvoiceIds]
        );
      }

      if (createdAdmIds.length > 0) {
        await pool.query(`DELETE FROM admissions WHERE id = ANY($1::int[])`, [createdAdmIds]);
      }
      if (createdApptIds.length > 0) {
        await pool.query(`DELETE FROM appointments WHERE id = ANY($1::int[])`, [createdApptIds]);
      }
      if (createdDoctorIds.length > 0) {
        await pool.query(`DELETE FROM doctors WHERE id = ANY($1::int[])`, [createdDoctorIds]);
      }
      if (createdDeptIds.length > 0) {
        await pool.query(`DELETE FROM departments WHERE id = ANY($1::int[])`, [createdDeptIds]);
      }
      if (createdPatientIds.length > 0) {
        await pool.query(`DELETE FROM patients WHERE id = ANY($1::int[])`, [createdPatientIds]);
      }
      if (createdUserIds.length > 0) {
        await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [createdUserIds]);
      }
    } catch (err) {
      console.error("Test cleanup error:", err.message);
    }

    await closeTestDb();
    await closeAppDb();
  });

  // ============================================================================
  // SECTION A: CREATE INVOICE (Tests 1-12)
  // ============================================================================
  describe("A. CREATE INVOICE", () => {
    test("1-12. Create valid invoice, calculate line totals, subtotal, discount, tax, total, paid=0, balance=total, status=PENDING, audit event", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const invoice = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          appointmentId: testAppointment.id,
          admissionId: testAdmission.id,
          invoiceDate: "2026-09-16",
          dueDate: "2026-09-30",
          discount: 20.0,
          tax: 15.0,
          billingNotes: "Comprehensive checkup and admission charges",
          items: [
            {
              itemType: "Consultation",
              description: "Specialist Consultation",
              quantity: 1,
              unitPrice: 100.0,
            },
            {
              itemType: "Lab Test",
              description: "Blood Panel",
              quantity: 2,
              unitPrice: 50.0,
            },
          ],
        },
        testUser.id
      );

      assert.ok(invoice, "Invoice should be created");
      createdInvoiceIds.push(invoice.id);

      // 1. Valid creation
      assert.strictEqual(invoice.patientId, testPatient1.id);
      // 2. Invoice number generated
      assert.match(invoice.invoiceNumber, /^INV\d{6}$/);
      // 3. Invoice items created
      assert.strictEqual(invoice.items.length, 2);
      // 4. Line totals calculated
      assert.strictEqual(Number(invoice.items[0].totalPrice), 100.0);
      assert.strictEqual(Number(invoice.items[1].totalPrice), 100.0);
      // 5. Subtotal = 100 + 100 = 200
      assert.strictEqual(Number(invoice.subtotal), 200.0);
      // 6. Discount = 20
      assert.strictEqual(Number(invoice.discount), 20.0);
      // 7. Tax = 15
      assert.strictEqual(Number(invoice.tax), 15.0);
      // 8. Total = 200 - 20 + 15 = 195
      assert.strictEqual(Number(invoice.totalAmount), 195.0);
      // 9. Paid amount starts at 0
      assert.strictEqual(Number(invoice.paidAmount), 0.0);
      // 10. Balance equals total
      assert.strictEqual(Number(invoice.balanceAmount), 195.0);
      // 11. Status starts as PENDING
      assert.strictEqual(invoice.status, "PENDING");

      // 12. Audit event created
      const auditRes = await pool.query(
        `SELECT * FROM audit_logs WHERE event_type = 'INVOICE_CREATED' AND resource_id = $1`,
        [String(invoice.id)]
      );
      assert.strictEqual(auditRes.rows.length >= 1, true, "Audit log must contain INVOICE_CREATED");
    });
  });

  // ============================================================================
  // SECTION B: VALIDATION (Tests 13-22)
  // ============================================================================
  describe("B. VALIDATION", () => {
    test("13. Missing patient rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: 999999,
          items: [{ description: "Check", quantity: 1, unitPrice: 50 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          assert.match(err.message, /Patient with ID 999999 not found/i);
          return true;
        }
      );
    });

    test("14. Missing invoice items rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient1.id,
          items: [],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /at least one line item/i);
          return true;
        }
      );
    });

    test("15. Invalid quantity rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient1.id,
          items: [{ description: "Check", quantity: 0, unitPrice: 50 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /quantity must be a positive integer/i);
          return true;
        }
      );
    });

    test("16. Negative unit price rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient1.id,
          items: [{ description: "Check", quantity: 1, unitPrice: -25.0 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /unit price must be a non-negative number/i);
          return true;
        }
      );
    });

    test("17. Discount greater than subtotal rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient1.id,
          discount: 150.0,
          items: [{ description: "Check", quantity: 1, unitPrice: 100.0 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Discount .* cannot exceed .* subtotal/i);
          return true;
        }
      );
    });

    test("18. Negative tax rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient1.id,
          tax: -10.0,
          items: [{ description: "Check", quantity: 1, unitPrice: 100.0 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Tax cannot be negative/i);
          return true;
        }
      );
    });

    test("19. Invalid appointment rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient1.id,
          appointmentId: 999999,
          items: [{ description: "Check", quantity: 1, unitPrice: 50 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          assert.match(err.message, /Appointment with ID 999999 not found/i);
          return true;
        }
      );
    });

    test("20. Appointment belonging to another patient rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      // testAppointment belongs to testPatient1, but we pass testPatient2
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient2.id,
          appointmentId: testAppointment.id,
          items: [{ description: "Check", quantity: 1, unitPrice: 50 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Appointment does not belong to the specified patient/i);
          return true;
        }
      );
    });

    test("21. Invalid admission rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient1.id,
          admissionId: 999999,
          items: [{ description: "Check", quantity: 1, unitPrice: 50 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          assert.match(err.message, /Admission with ID 999999 not found/i);
          return true;
        }
      );
    });

    test("22. Admission belonging to another patient rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }
      // testAdmission belongs to testPatient1, but we pass testPatient2
      await assert.rejects(
        billingService.createInvoice({
          patientId: testPatient2.id,
          admissionId: testAdmission.id,
          items: [{ description: "Check", quantity: 1, unitPrice: 50 }],
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Admission does not belong to the specified patient/i);
          return true;
        }
      );
    });
  });

  // ============================================================================
  // SECTION C: ITEM MANAGEMENT (Tests 23-29)
  // ============================================================================
  describe("C. ITEM MANAGEMENT", () => {
    let itemTestInvoice = null;

    before(async () => {
      if (!isTestDbConfigured()) return;
      itemTestInvoice = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [
            {
              itemType: "General",
              description: "Initial Item",
              quantity: 1,
              unitPrice: 100.0,
            },
          ],
        },
        testUser.id
      );
      createdInvoiceIds.push(itemTestInvoice.id);
    });

    test("23. Add item to PENDING invoice and verify totals", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const updated = await billingService.addInvoiceItem(
        itemTestInvoice.id,
        {
          itemType: "Procedure",
          description: "Minor Dressing",
          quantity: 2,
          unitPrice: 25.0,
        },
        testUser.id
      );

      assert.strictEqual(updated.items.length, 2);
      // Subtotal should be 100 + 50 = 150
      assert.strictEqual(Number(updated.subtotal), 150.0);
      assert.strictEqual(Number(updated.totalAmount), 150.0);
      assert.strictEqual(Number(updated.balanceAmount), 150.0);
    });

    test("24. Update item and verify recalculation", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const latest = await billingService.getInvoiceById(itemTestInvoice.id);
      const secondItem = latest.items[1];

      const updated = await billingService.updateInvoiceItem(
        itemTestInvoice.id,
        secondItem.id,
        {
          quantity: 3,
          unitPrice: 30.0,
        },
        testUser.id
      );

      // Subtotal should now be 100 + (3 * 30) = 190
      assert.strictEqual(Number(updated.subtotal), 190.0);
      assert.strictEqual(Number(updated.totalAmount), 190.0);
    });

    test("25 & 29. Remove item and verify recalculation", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const latest = await billingService.getInvoiceById(itemTestInvoice.id);
      const secondItem = latest.items[1];

      const updated = await billingService.removeInvoiceItem(
        itemTestInvoice.id,
        secondItem.id,
        testUser.id
      );

      assert.strictEqual(updated.items.length, 1);
      // Subtotal should be back to 100.00
      assert.strictEqual(Number(updated.subtotal), 100.0);
      assert.strictEqual(Number(updated.totalAmount), 100.0);
    });

    test("26. Cannot remove the only remaining item", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const latest = await billingService.getInvoiceById(itemTestInvoice.id);
      assert.strictEqual(latest.items.length, 1);
      const onlyItem = latest.items[0];

      await assert.rejects(
        billingService.removeInvoiceItem(itemTestInvoice.id, onlyItem.id, testUser.id),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Cannot remove the only item/i);
          return true;
        }
      );
    });

    test("27. Cannot modify items after payment is recorded", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const paidInvoice = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Consultation", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(paidInvoice.id);

      // Record a partial payment
      await billingService.recordPayment(
        paidInvoice.id,
        { amount: 20.0, paymentMethod: "Cash" },
        testUser.id
      );

      // Attempt to add item to invoice with existing payment
      await assert.rejects(
        billingService.addInvoiceItem(
          paidInvoice.id,
          { description: "Extra", quantity: 1, unitPrice: 10.0 },
          testUser.id
        ),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Cannot add items to an invoice with status 'PARTIAL'/i);
          return true;
        }
      );
    });

    test("28. Cannot modify items on CANCELLED invoice", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const cancelInvoice = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Consultation", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(cancelInvoice.id);

      await billingService.cancelInvoice(cancelInvoice.id, "Test cancellation", testUser.id);

      await assert.rejects(
        billingService.addInvoiceItem(
          cancelInvoice.id,
          { description: "Extra", quantity: 1, unitPrice: 10.0 },
          testUser.id
        ),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Cannot add items to an invoice with status 'CANCELLED'/i);
          return true;
        }
      );
    });
  });

  // ============================================================================
  // SECTION D: PAYMENT & CONCURRENCY (Tests 30-41 & Concurrency)
  // ============================================================================
  describe("D. PAYMENT", () => {
    let payInvoice = null;

    before(async () => {
      if (!isTestDbConfigured()) return;
      payInvoice = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Surgery Service", quantity: 1, unitPrice: 200.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(payInvoice.id);
    });

    test("30-34. Partial payment succeeds, updates paid amount, balance, status=PARTIAL, audit log", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const result = await billingService.recordPayment(
        payInvoice.id,
        {
          amount: 80.0,
          paymentMethod: "Credit Card",
          referenceNumber: "TXN-001",
          notes: "First installment",
        },
        testUser.id
      );

      assert.ok(result.payment, "Payment record returned");
      assert.match(result.payment.paymentNumber, /^PAY\d{6}$/);
      assert.strictEqual(Number(result.payment.amount), 80.0);
      assert.strictEqual(result.payment.paymentMethod, "Credit Card");

      // Verify invoice state
      assert.strictEqual(Number(result.invoice.paidAmount), 80.0);
      assert.strictEqual(Number(result.invoice.balanceAmount), 120.0);
      assert.strictEqual(result.invoice.status, "PARTIAL");

      // 41. Audit event created
      const auditRes = await pool.query(
        `SELECT * FROM audit_logs WHERE event_type = 'PAYMENT_RECORDED' AND resource_id = $1`,
        [String(result.payment.id)]
      );
      assert.strictEqual(auditRes.rows.length >= 1, true, "Audit log must contain PAYMENT_RECORDED");
    });

    test("35. Full payment changes status to PAID", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const result = await billingService.recordPayment(
        payInvoice.id,
        {
          amount: 120.0,
          paymentMethod: "Debit Card",
          referenceNumber: "TXN-002",
        },
        testUser.id
      );

      assert.strictEqual(Number(result.invoice.paidAmount), 200.0);
      assert.strictEqual(Number(result.invoice.balanceAmount), 0.0);
      assert.strictEqual(result.invoice.status, "PAID");
    });

    test("36. Overpayment rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const newInv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Consultation", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(newInv.id);

      await assert.rejects(
        billingService.recordPayment(
          newInv.id,
          { amount: 100.0, paymentMethod: "Cash" },
          testUser.id
        ),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Payment amount .* exceeds current invoice balance/i);
          return true;
        }
      );
    });

    test("37. Zero payment rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const newInv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Consultation", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(newInv.id);

      await assert.rejects(
        billingService.recordPayment(
          newInv.id,
          { amount: 0, paymentMethod: "Cash" },
          testUser.id
        ),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Payment amount must be a positive number/i);
          return true;
        }
      );
    });

    test("38. Negative payment rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const newInv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Consultation", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(newInv.id);

      await assert.rejects(
        billingService.recordPayment(
          newInv.id,
          { amount: -20.0, paymentMethod: "Cash" },
          testUser.id
        ),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Payment amount must be a positive number/i);
          return true;
        }
      );
    });

    test("39. Payment on CANCELLED invoice rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const newInv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Consultation", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(newInv.id);
      await billingService.cancelInvoice(newInv.id, "Cancel test", testUser.id);

      await assert.rejects(
        billingService.recordPayment(
          newInv.id,
          { amount: 25.0, paymentMethod: "Cash" },
          testUser.id
        ),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Cannot apply payment to a cancelled invoice/i);
          return true;
        }
      );
    });

    test("40. Payment on already PAID invoice rejected", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      // payInvoice is already PAID from test 35
      await assert.rejects(
        billingService.recordPayment(
          payInvoice.id,
          { amount: 10.0, paymentMethod: "Cash" },
          testUser.id
        ),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Invoice is already fully paid/i);
          return true;
        }
      );
    });

    test("E. Concurrency — Simultaneous payment requests are serialized safely without overpayment", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const concurrentInv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Checkup", quantity: 1, unitPrice: 100.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(concurrentInv.id);

      // Fire 3 simultaneous payment requests of $60 each (total $180 against $100 balance)
      // Exactly 1 must succeed and others must fail due to FOR UPDATE row lock and balance checks
      const results = await Promise.allSettled([
        billingService.recordPayment(concurrentInv.id, { amount: 60.0, paymentMethod: "Cash" }, testUser.id),
        billingService.recordPayment(concurrentInv.id, { amount: 60.0, paymentMethod: "Cash" }, testUser.id),
        billingService.recordPayment(concurrentInv.id, { amount: 60.0, paymentMethod: "Cash" }, testUser.id),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      assert.strictEqual(fulfilled.length, 1, "Exactly 1 payment of $60 should succeed");
      assert.strictEqual(rejected.length, 2, "2 payments of $60 must be rejected due to overpayment guard");

      const finalState = await billingService.getInvoiceById(concurrentInv.id);
      assert.strictEqual(Number(finalState.paidAmount), 60.0);
      assert.strictEqual(Number(finalState.balanceAmount), 40.0);
      assert.ok(Number(finalState.paidAmount) <= Number(finalState.totalAmount));
      assert.ok(Number(finalState.balanceAmount) >= 0);
    });
  });

  // ============================================================================
  // SECTION F: CANCELLATION (Tests 42-47)
  // ============================================================================
  describe("F. CANCELLATION", () => {
    test("42-44. Zero-payment invoice can be cancelled, stores CANCELLED status, and logs audit", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const inv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Lab Test", quantity: 1, unitPrice: 75.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(inv.id);

      const cancelled = await billingService.cancelInvoice(
        inv.id,
        "Patient rescheduled service",
        testUser.id
      );

      assert.strictEqual(cancelled.status, "CANCELLED");
      assert.match(cancelled.billingNotes, /Patient rescheduled service/);

      // Audit event
      const auditRes = await pool.query(
        `SELECT * FROM audit_logs WHERE event_type = 'INVOICE_CANCELLED' AND resource_id = $1`,
        [String(inv.id)]
      );
      assert.strictEqual(auditRes.rows.length >= 1, true, "Audit log must contain INVOICE_CANCELLED");
    });

    test("45. Invoice with payment cannot be cancelled", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const inv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Lab Test", quantity: 1, unitPrice: 100.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(inv.id);

      await billingService.recordPayment(
        inv.id,
        { amount: 30.0, paymentMethod: "Cash" },
        testUser.id
      );

      await assert.rejects(
        billingService.cancelInvoice(inv.id, "Cancel attempt", testUser.id),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Cannot cancel an invoice with .* recorded payment/i);
          return true;
        }
      );
    });

    test("46. PAID invoice cannot be cancelled", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const inv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Lab Test", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(inv.id);

      await billingService.recordPayment(
        inv.id,
        { amount: 50.0, paymentMethod: "Cash" },
        testUser.id
      );

      await assert.rejects(
        billingService.cancelInvoice(inv.id, "Cancel attempt", testUser.id),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Cannot cancel an invoice that has been fully paid/i);
          return true;
        }
      );
    });

    test("47. Already cancelled invoice cannot be cancelled again", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const inv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Lab Test", quantity: 1, unitPrice: 50.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(inv.id);

      await billingService.cancelInvoice(inv.id, "First cancel", testUser.id);

      await assert.rejects(
        billingService.cancelInvoice(inv.id, "Second cancel", testUser.id),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Invoice is already cancelled/i);
          return true;
        }
      );
    });
  });

  // ============================================================================
  // SECTION G: READ OPERATIONS (Tests 48-51)
  // ============================================================================
  describe("G. READ OPERATIONS", () => {
    test("48. getInvoiceById returns composite invoice, patient, appointment, admission, items, payments", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const inv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          appointmentId: testAppointment.id,
          admissionId: testAdmission.id,
          items: [
            { itemType: "Consultation", description: "Doc Visit", quantity: 1, unitPrice: 80.0 },
          ],
        },
        testUser.id
      );
      createdInvoiceIds.push(inv.id);

      await billingService.recordPayment(
        inv.id,
        { amount: 40.0, paymentMethod: "Online", referenceNumber: "REF-123" },
        testUser.id
      );

      const detailed = await billingService.getInvoiceById(inv.id);

      assert.ok(detailed, "Detailed invoice found");
      assert.strictEqual(detailed.patient.name, "Alice Billing Patient");
      assert.strictEqual(detailed.appointment.id, testAppointment.id);
      assert.strictEqual(detailed.admission.id, testAdmission.id);
      assert.strictEqual(detailed.items.length, 1);
      assert.strictEqual(detailed.payments.length, 1);
      assert.strictEqual(detailed.payments[0].referenceNumber, "REF-123");
    });

    test("49 & 50. getAllInvoices filters and pagination work accurately", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const listRes = await billingService.getAllInvoices(
        { patientId: testPatient1.id },
        { page: 1, limit: 10 }
      );

      assert.ok(Array.isArray(listRes.invoices), "Invoices array returned");
      assert.ok(listRes.total >= 1, "Total count is at least 1");
      assert.strictEqual(listRes.page, 1);
      assert.strictEqual(listRes.limit, 10);
      assert.ok(listRes.totalPages >= 1);
    });

    test("51. getInvoicePayments returns payment list", async (t) => {
      if (!isTestDbConfigured()) {
        t.skip("Test DB not configured");
        return;
      }

      const inv = await billingService.createInvoice(
        {
          patientId: testPatient1.id,
          items: [{ description: "Medication", quantity: 1, unitPrice: 30.0 }],
        },
        testUser.id
      );
      createdInvoiceIds.push(inv.id);

      await billingService.recordPayment(
        inv.id,
        { amount: 30.0, paymentMethod: "Cash" },
        testUser.id
      );

      const payments = await billingService.getInvoicePayments(inv.id);
      assert.strictEqual(payments.length, 1);
      assert.strictEqual(Number(payments[0].amount), 30.0);
      assert.strictEqual(payments[0].paymentMethod, "Cash");
    });
  });
});
