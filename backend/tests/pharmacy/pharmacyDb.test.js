const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getTestPool, isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const pharmacyService = require("../../src/services/pharmacyService");

/**
 * Pharmacy Database Schema & Integration Test Suite
 *
 * Verifies live PostgreSQL database behavior:
 * - Sequence generation (MED-XXXXXX)
 * - CRUD operations and foreign-key integrity
 * - Unique constraint on (medicine_id, batch_number)
 * - Active stock aggregation (excluding expired and depleted batches)
 * - Row locking and transactional stock adjustments
 *
 * Guarded by isTestDbConfigured() to skip cleanly when no dedicated test DB is configured.
 */

describe("Pharmacy Database Integration Suite", () => {
  let pool = null;
  const createdMedicineIds = [];
  const createdBatchIds = [];

  before(async () => {
    if (!isTestDbConfigured()) {
      return;
    }
    pool = getTestPool();

    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS public.medicines_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE SEQUENCE IF NOT EXISTS public.medicine_code_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE SEQUENCE IF NOT EXISTS public.medicine_batches_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE SEQUENCE IF NOT EXISTS public.medicine_dispensations_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE SEQUENCE IF NOT EXISTS public.dispensation_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

      CREATE TABLE IF NOT EXISTS public.medicines (
        id integer NOT NULL DEFAULT nextval('public.medicines_id_seq'::regclass),
        medicine_code character varying(30) NOT NULL DEFAULT ('MED-'::text || lpad((nextval('public.medicine_code_seq'::regclass))::text, 6, '0'::text)),
        name character varying(255) NOT NULL,
        generic_name character varying(255),
        category character varying(100) NOT NULL,
        dosage_form character varying(50) NOT NULL,
        strength character varying(100),
        unit_price numeric(10,2) NOT NULL DEFAULT 0.00,
        reorder_level integer NOT NULL DEFAULT 10,
        status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT medicines_pkey PRIMARY KEY (id),
        CONSTRAINT medicines_medicine_code_key UNIQUE (medicine_code),
        CONSTRAINT medicines_unit_price_check CHECK (unit_price >= 0),
        CONSTRAINT medicines_reorder_level_check CHECK (reorder_level >= 0),
        CONSTRAINT medicines_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'DISCONTINUED'::character varying])::text[])))
      );

      CREATE TABLE IF NOT EXISTS public.medicine_batches (
        id integer NOT NULL DEFAULT nextval('public.medicine_batches_id_seq'::regclass),
        batch_number character varying(50) NOT NULL,
        medicine_id integer NOT NULL,
        quantity_in_stock integer NOT NULL DEFAULT 0,
        expiry_date date NOT NULL,
        purchase_price numeric(10,2) NOT NULL DEFAULT 0.00,
        selling_price numeric(10,2) NOT NULL DEFAULT 0.00,
        supplier_name character varying(150),
        status character varying(20) NOT NULL DEFAULT 'AVAILABLE'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT medicine_batches_pkey PRIMARY KEY (id),
        CONSTRAINT medicine_batches_medicine_batch_key UNIQUE (medicine_id, batch_number),
        CONSTRAINT medicine_batches_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicines(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_batches_quantity_in_stock_check CHECK (quantity_in_stock >= 0),
        CONSTRAINT medicine_batches_purchase_price_check CHECK (purchase_price >= 0),
        CONSTRAINT medicine_batches_selling_price_check CHECK (selling_price >= 0),
        CONSTRAINT medicine_batches_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'EXPIRED'::character varying, 'DEPLETED'::character varying])::text[])))
      );

      CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine_id ON public.medicine_batches(medicine_id);
      CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry_date ON public.medicine_batches(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_medicine_batches_status ON public.medicine_batches(status);

      CREATE TABLE IF NOT EXISTS public.medicine_dispensations (
        id integer NOT NULL DEFAULT nextval('public.medicine_dispensations_id_seq'::regclass),
        dispensation_number character varying(30) NOT NULL DEFAULT ('DSP-'::text || lpad((nextval('public.dispensation_number_seq'::regclass))::text, 6, '0'::text)),
        prescription_id integer,
        prescription_item_id integer,
        medicine_id integer NOT NULL,
        batch_id integer NOT NULL,
        patient_id integer NOT NULL,
        quantity_dispensed integer NOT NULL,
        unit_price numeric(10,2) NOT NULL,
        total_price numeric(10,2) NOT NULL,
        dispensed_by integer,
        dispensed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        notes text,
        CONSTRAINT medicine_dispensations_pkey PRIMARY KEY (id),
        CONSTRAINT medicine_dispensations_dispensation_number_key UNIQUE (dispensation_number),
        CONSTRAINT medicine_dispensations_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL,
        CONSTRAINT medicine_dispensations_prescription_item_id_fkey FOREIGN KEY (prescription_item_id) REFERENCES public.prescription_items(id) ON DELETE SET NULL,
        CONSTRAINT medicine_dispensations_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicines(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_dispensations_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.medicine_batches(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_dispensations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_dispensations_dispensed_by_fkey FOREIGN KEY (dispensed_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT medicine_dispensations_quantity_dispensed_check CHECK (quantity_dispensed > 0)
      );
    `);
  });

  after(async () => {
    if (!pool) return;
    try {
      if (createdBatchIds.length > 0) {
        await pool.query(
          `DELETE FROM public.medicine_batches WHERE id = ANY($1::int[])`,
          [createdBatchIds]
        );
      }
      if (createdMedicineIds.length > 0) {
        await pool.query(
          `DELETE FROM public.medicines WHERE id = ANY($1::int[])`,
          [createdMedicineIds]
        );
      }
    } catch (err) {
      console.error("Cleanup error in pharmacyDb.test.js:", err.message);
    } finally {
      await closeTestDb();
      await closeAppDb();
    }
  });

  test("1. Medicine creation & MED-XXXXXX code generation", async (t) => {
    if (!isTestDbConfigured() || !pool) {
      t.skip("PostgreSQL test database is not configured");
      return;
    }

    const created = await pharmacyService.createMedicine({
      name: `Test Amoxicillin ${Date.now()}`,
      genericName: "Amoxicillin",
      category: "Antibiotic",
      dosageForm: "Capsule",
      strength: "500mg",
      unitPrice: 12.5,
      reorderLevel: 15,
      status: "ACTIVE",
    });

    assert.ok(created.id > 0, "Medicine should have positive integer ID");
    assert.match(
      created.medicineCode,
      /^MED-\d{6}$/,
      "Generated medicine code must match MED-XXXXXX sequence format"
    );
    createdMedicineIds.push(created.id);

    // Verify directly in PostgreSQL
    const dbRes = await pool.query(
      `SELECT id, medicine_code, name, category, unit_price FROM public.medicines WHERE id = $1`,
      [created.id]
    );
    assert.equal(dbRes.rows.length, 1);
    assert.equal(dbRes.rows[0].medicine_code, created.medicineCode);
  });

  test("2. Medicine batch insertion (AVAILABLE, EXPIRED, DEPLETED)", async (t) => {
    if (!isTestDbConfigured() || !pool) {
      t.skip("PostgreSQL test database is not configured");
      return;
    }

    const med = await pharmacyService.createMedicine({
      name: `Test Ciprofloxacin ${Date.now()}`,
      category: "Antibiotic",
      dosageForm: "Tablet",
      unitPrice: 8.0,
      reorderLevel: 20,
    });
    createdMedicineIds.push(med.id);

    // Batch A: Available and non-expired (50 units)
    const batchA = await pharmacyService.addBatch({
      medicineId: med.id,
      batchNumber: `BAT-A-${Date.now()}`,
      quantity: 50,
      expiryDate: "2028-12-31",
      purchasePrice: 5.0,
      sellingPrice: 8.0,
      supplierName: "PharmaCorp Ltd",
    });
    createdBatchIds.push(batchA.id);
    assert.equal(batchA.status, "AVAILABLE");
    assert.equal(batchA.quantityInStock, 50);

    // Batch B: Expired batch inserted directly to test DB status
    const expRes = await pool.query(
      `INSERT INTO public.medicine_batches (
        batch_number, medicine_id, quantity_in_stock, expiry_date, purchase_price, selling_price, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, status`,
      [`BAT-EXP-${Date.now()}`, med.id, 25, "2020-01-01", 4.0, 7.0, "EXPIRED"]
    );
    createdBatchIds.push(expRes.rows[0].id);

    // Batch C: Depleted batch (0 units)
    const batchC = await pharmacyService.addBatch({
      medicineId: med.id,
      batchNumber: `BAT-DEP-${Date.now()}`,
      quantity: 0,
      expiryDate: "2028-12-31",
      purchasePrice: 5.0,
      sellingPrice: 8.0,
    });
    createdBatchIds.push(batchC.id);
    assert.equal(batchC.status, "DEPLETED");
  });

  test("3. Stock aggregation & Low-stock calculation", async (t) => {
    if (!isTestDbConfigured() || !pool) {
      t.skip("PostgreSQL test database is not configured");
      return;
    }

    const med = await pharmacyService.createMedicine({
      name: `Test Ibuprofen ${Date.now()}`,
      category: "Analgesic",
      dosageForm: "Tablet",
      unitPrice: 5.0,
      reorderLevel: 40,
    });
    createdMedicineIds.push(med.id);

    // Add 30 available units (below reorder_level 40)
    const batch1 = await pharmacyService.addBatch({
      medicineId: med.id,
      batchNumber: `IBU-B1-${Date.now()}`,
      quantity: 30,
      expiryDate: "2028-12-31",
    });
    createdBatchIds.push(batch1.id);

    // Add 20 expired units (should NOT count toward totalStock)
    const expRes = await pool.query(
      `INSERT INTO public.medicine_batches (
        batch_number, medicine_id, quantity_in_stock, expiry_date, status
      ) VALUES ($1, $2, 30, '2019-01-01', 'EXPIRED') RETURNING id`,
      [`IBU-EXP-${Date.now()}`, med.id]
    );
    createdBatchIds.push(expRes.rows[0].id);

    const fetched = await pharmacyService.getMedicineById(med.id);
    assert.equal(
      fetched.totalStock,
      30,
      "Total available stock must only count non-expired, available batches"
    );
    assert.equal(
      fetched.isLowStock,
      true,
      "isLowStock must be true when totalStock (30) <= reorderLevel (40)"
    );
  });

  test("4. Stock adjustment (quantity change, DEPLETED status, negative stock guard)", async (t) => {
    if (!isTestDbConfigured() || !pool) {
      t.skip("PostgreSQL test database is not configured");
      return;
    }

    const med = await pharmacyService.createMedicine({
      name: `Test Paracetamol ${Date.now()}`,
      category: "Analgesic",
      dosageForm: "Syrup",
      unitPrice: 10.0,
      reorderLevel: 5,
    });
    createdMedicineIds.push(med.id);

    const batch = await pharmacyService.addBatch({
      medicineId: med.id,
      batchNumber: `PARA-B1-${Date.now()}`,
      quantity: 20,
      expiryDate: "2028-12-31",
    });
    createdBatchIds.push(batch.id);

    // Step 1: Valid reduction of 15 units
    const adj1 = await pharmacyService.adjustStock({
      batchId: batch.id,
      changeQuantity: -15,
      reason: "Dispensed to ER",
    });
    assert.equal(adj1.previousQuantity, 20);
    assert.equal(adj1.newQuantity, 5);
    assert.equal(adj1.status, "AVAILABLE");

    // Step 2: Attempt overdraft (reducing by 10 when stock is 5)
    await assert.rejects(
      async () => {
        await pharmacyService.adjustStock({
          batchId: batch.id,
          changeQuantity: -10,
          reason: "Excessive decrement",
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Insufficient stock/i);
        return true;
      }
    );

    // Verify DB still holds 5 units (transaction rolled back safely)
    const checkRes = await pool.query(
      `SELECT quantity_in_stock, status FROM public.medicine_batches WHERE id = $1`,
      [batch.id]
    );
    assert.equal(checkRes.rows[0].quantity_in_stock, 5);

    // Step 3: Reduce remaining 5 units to 0 -> Status becomes DEPLETED
    const adj2 = await pharmacyService.adjustStock({
      batchId: batch.id,
      newQuantity: 0,
      reason: "Inventory clear",
    });
    assert.equal(adj2.newQuantity, 0);
    assert.equal(adj2.status, "DEPLETED");

    const finalCheck = await pool.query(
      `SELECT quantity_in_stock, status FROM public.medicine_batches WHERE id = $1`,
      [batch.id]
    );
    assert.equal(finalCheck.rows[0].quantity_in_stock, 0);
    assert.equal(finalCheck.rows[0].status, "DEPLETED");
  });

  test("5. Unique constraint on (medicine_id, batch_number)", async (t) => {
    if (!isTestDbConfigured() || !pool) {
      t.skip("PostgreSQL test database is not configured");
      return;
    }

    const med = await pharmacyService.createMedicine({
      name: `Test Unique Med ${Date.now()}`,
      category: "General",
      dosageForm: "Tablet",
      unitPrice: 1.0,
    });
    createdMedicineIds.push(med.id);

    const batchNumber = `UNIQUE-BATCH-${Date.now()}`;
    const batch1 = await pharmacyService.addBatch({
      medicineId: med.id,
      batchNumber,
      quantity: 10,
      expiryDate: "2028-12-31",
    });
    createdBatchIds.push(batch1.id);

    // Re-attempting same batch_number for same medicine
    await assert.rejects(
      async () => {
        await pharmacyService.addBatch({
          medicineId: med.id,
          batchNumber,
          quantity: 20,
          expiryDate: "2028-12-31",
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already exists/i);
        return true;
      }
    );
  });

  test("6. Foreign-key integrity on medicine_id", async (t) => {
    if (!isTestDbConfigured() || !pool) {
      t.skip("PostgreSQL test database is not configured");
      return;
    }

    await assert.rejects(
      async () => {
        await pharmacyService.addBatch({
          medicineId: 9999999,
          batchNumber: `INVALID-FK-${Date.now()}`,
          quantity: 10,
          expiryDate: "2028-12-31",
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /does not exist/i);
        return true;
      }
    );
  });
});
