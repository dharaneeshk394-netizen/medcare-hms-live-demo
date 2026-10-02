const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const pharmacyService = require("../../src/services/pharmacyService");

/**
 * Pharmacy Service Unit Tests (Database-Independent Validation & Logic)
 *
 * Verifies input validation, boundary rules, type constraints, and format checks
 * that execute prior to or independent of active PostgreSQL database queries.
 */

describe("Pharmacy Service: Database-Independent Unit Tests", () => {
  describe("1. Medicine ID Validation", () => {
    test("rejects non-numeric string ID", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.getMedicineById("invalid-id");
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Medicine ID: must be a positive integer/i);
          return true;
        }
      );
    });

    test("rejects zero ID", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.getMedicineById(0);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Medicine ID: must be a positive integer/i);
          return true;
        }
      );
    });

    test("rejects negative ID", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.getMedicineById(-15);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Medicine ID: must be a positive integer/i);
          return true;
        }
      );
    });

    test("rejects floating point ID", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.getMedicineById(3.14);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Medicine ID: must be a positive integer/i);
          return true;
        }
      );
    });

    test("rejects null or undefined ID", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.getMedicineById(null);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Medicine ID: must be a positive integer/i);
          return true;
        }
      );
    });
  });

  describe("2. Medicine Creation Input Validation", () => {
    test("rejects null or non-object payload", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.createMedicine(null);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid request body/i);
          return true;
        }
      );
    });

    test("rejects missing medicine name", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.createMedicine({
            name: "   ",
            category: "Antibiotic",
            dosageForm: "Tablet",
            unitPrice: 15.0,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Medicine name is required/i);
          return true;
        }
      );
    });

    test("rejects missing category", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.createMedicine({
            name: "Amoxicillin",
            category: "",
            dosageForm: "Tablet",
            unitPrice: 15.0,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Category is required/i);
          return true;
        }
      );
    });

    test("rejects missing dosage form", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.createMedicine({
            name: "Amoxicillin",
            category: "Antibiotic",
            dosageForm: "  ",
            unitPrice: 15.0,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Dosage form is required/i);
          return true;
        }
      );
    });
  });

  describe("3. Price & Reorder-Level Validation", () => {
    test("rejects negative unit price", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.createMedicine({
            name: "Paracetamol",
            category: "Analgesic",
            dosageForm: "Tablet",
            unitPrice: -5.0,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Unit price must be a non-negative number/i);
          return true;
        }
      );
    });

    test("rejects non-numeric unit price string", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.createMedicine({
            name: "Paracetamol",
            category: "Analgesic",
            dosageForm: "Tablet",
            unitPrice: "not-a-number",
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Unit price must be a non-negative number/i);
          return true;
        }
      );
    });

    test("rejects negative reorder level", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.createMedicine({
            name: "Paracetamol",
            category: "Analgesic",
            dosageForm: "Tablet",
            unitPrice: 10.0,
            reorderLevel: -1,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Reorder level must be a non-negative integer/i);
          return true;
        }
      );
    });
  });

  describe("4. Medicine Update Validation", () => {
    test("rejects invalid medicine ID on update", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.updateMedicine("invalid-id", { name: "Updated Name" });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Medicine ID: must be a positive integer/i);
          return true;
        }
      );
    });

    test("rejects invalid payload on update", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.updateMedicine(1, null);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid request body/i);
          return true;
        }
      );
    });
  });

  describe("5. Batch Input & Expiry Date Validation", () => {
    test("rejects null batch payload", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch(null);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid batch payload/i);
          return true;
        }
      );
    });

    test("rejects invalid medicineId on batch", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch({
            medicineId: "bad-id",
            batchNumber: "B123",
            quantity: 100,
            expiryDate: "2027-12-31",
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Medicine ID: must be a positive integer/i);
          return true;
        }
      );
    });

    test("rejects missing batch number", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch({
            medicineId: 1,
            batchNumber: "   ",
            quantity: 100,
            expiryDate: "2027-12-31",
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Batch number is required/i);
          return true;
        }
      );
    });

    test("rejects negative batch quantity", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch({
            medicineId: 1,
            batchNumber: "B123",
            quantity: -50,
            expiryDate: "2027-12-31",
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Batch quantity must be a non-negative integer/i);
          return true;
        }
      );
    });

    test("rejects invalid expiry date format (slashes instead of YYYY-MM-DD)", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch({
            medicineId: 1,
            batchNumber: "B123",
            quantity: 100,
            expiryDate: "12/31/2027",
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Valid expiry date in YYYY-MM-DD format is required/i);
          return true;
        }
      );
    });

    test("rejects invalid expiry date format (random string)", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch({
            medicineId: 1,
            batchNumber: "B123",
            quantity: 100,
            expiryDate: "invalid-date",
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Valid expiry date in YYYY-MM-DD format is required/i);
          return true;
        }
      );
    });

    test("rejects negative purchase price", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch({
            medicineId: 1,
            batchNumber: "B123",
            quantity: 100,
            expiryDate: "2027-12-31",
            purchasePrice: -10,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Purchase price must be a non-negative number/i);
          return true;
        }
      );
    });

    test("rejects negative selling price", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.addBatch({
            medicineId: 1,
            batchNumber: "B123",
            quantity: 100,
            expiryDate: "2027-12-31",
            sellingPrice: -15,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Selling price must be a non-negative number/i);
          return true;
        }
      );
    });
  });

  describe("6. Stock Adjustment Input Validation", () => {
    test("rejects null stock adjustment payload", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.adjustStock(null);
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid stock adjustment payload/i);
          return true;
        }
      );
    });

    test("rejects invalid batchId on stock adjustment", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.adjustStock({
            batchId: "bad-batch-id",
            reason: "Damaged inventory",
            changeQuantity: -5,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid Batch ID: must be a positive integer/i);
          return true;
        }
      );
    });

    test("rejects missing adjustment reason", async () => {
      await assert.rejects(
        async () => {
          await pharmacyService.adjustStock({
            batchId: 1,
            reason: "   ",
            changeQuantity: -5,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Adjustment reason is required/i);
          return true;
        }
      );
    });
  });

  describe("7. Allowed Status Enums Verification", () => {
    test("ALLOWED_MEDICINE_STATUSES contains ACTIVE, INACTIVE, DISCONTINUED", () => {
      assert.deepEqual(pharmacyService.ALLOWED_MEDICINE_STATUSES, [
        "ACTIVE",
        "INACTIVE",
        "DISCONTINUED",
      ]);
    });

    test("ALLOWED_BATCH_STATUSES contains AVAILABLE, EXPIRED, DEPLETED", () => {
      assert.deepEqual(pharmacyService.ALLOWED_BATCH_STATUSES, [
        "AVAILABLE",
        "EXPIRED",
        "DEPLETED",
      ]);
    });
  });
});
