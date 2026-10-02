const pharmacyService = require("../services/pharmacyService");

/**
 * GET /api/v1/pharmacy/medicines
 * Access: admin, doctor, receptionist
 */
async function getMedicines(req, res) {
  try {
    const medicines = await pharmacyService.listMedicines(req.query);
    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines,
    });
  } catch (error) {
    console.error("Error in getMedicines:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve medicines",
    });
  }
}

/**
 * GET /api/v1/pharmacy/medicines/:id
 * Access: admin, doctor, receptionist
 */
async function getMedicineById(req, res) {
  try {
    const medicine = await pharmacyService.getMedicineById(req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.status(200).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    console.error("Error in getMedicineById:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve medicine",
    });
  }
}

/**
 * POST /api/v1/pharmacy/medicines
 * Access: admin
 */
async function createMedicine(req, res) {
  try {
    const created = await pharmacyService.createMedicine(req.body);
    res.status(201).json({
      success: true,
      message: "Medicine created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Error in createMedicine:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create medicine",
    });
  }
}

/**
 * PUT /api/v1/pharmacy/medicines/:id
 * Access: admin
 */
async function updateMedicine(req, res) {
  try {
    const updated = await pharmacyService.updateMedicine(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in updateMedicine:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update medicine",
    });
  }
}

/**
 * GET /api/v1/pharmacy/low-stock
 * Access: admin, doctor, receptionist
 */
async function getLowStock(req, res) {
  try {
    const lowStockMedicines = await pharmacyService.listLowStock();
    res.status(200).json({
      success: true,
      count: lowStockMedicines.length,
      data: lowStockMedicines,
    });
  } catch (error) {
    console.error("Error in getLowStock:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve low-stock medicines",
    });
  }
}

/**
 * POST /api/v1/pharmacy/batches
 * Access: admin
 */
async function addBatch(req, res) {
  try {
    const batch = await pharmacyService.addBatch(req.body);
    res.status(201).json({
      success: true,
      message: "Inventory batch added successfully",
      data: batch,
    });
  } catch (error) {
    console.error("Error in addBatch:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to add inventory batch",
    });
  }
}

/**
 * POST /api/v1/pharmacy/stock-adjust
 * Access: admin
 */
async function adjustStock(req, res) {
  try {
    const adjustment = await pharmacyService.adjustStock(req.body);
    res.status(200).json({
      success: true,
      message: "Stock adjusted successfully",
      data: adjustment,
    });
  } catch (error) {
    console.error("Error in adjustStock:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to adjust stock",
    });
  }
}

/**
 * GET /api/v1/pharmacy/dispensations
 * Access: admin, doctor, receptionist
 */
async function getDispensations(req, res) {
  try {
    const dispensations = await pharmacyService.listDispensations(req.query);
    res.status(200).json({
      success: true,
      count: dispensations.length,
      data: dispensations,
    });
  } catch (error) {
    console.error("Error in getDispensations:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve dispensations",
    });
  }
}

/**
 * POST /api/v1/pharmacy/dispense
 * Access: admin, doctor, receptionist
 */
async function dispenseMedicine(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const result = await pharmacyService.dispenseMedicine(req.body, userId);
    res.status(201).json({
      success: true,
      message: "Medicine dispensed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in dispenseMedicine:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to dispense medicine",
    });
  }
}

module.exports = {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  getLowStock,
  addBatch,
  adjustStock,
  getDispensations,
  dispenseMedicine,
};
