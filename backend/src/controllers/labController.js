const labService = require("../services/labService");

/**
 * GET /api/v1/lab/tests
 * Roles: admin, doctor, receptionist
 */
async function getTests(req, res) {
  try {
    const tests = await labService.listTests(req.query);
    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    console.error("Error in getTests:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve lab tests",
    });
  }
}

/**
 * GET /api/v1/lab/tests/:id
 * Roles: admin, doctor, receptionist
 */
async function getTestById(req, res) {
  try {
    const test = await labService.getTestById(req.params.id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found",
      });
    }
    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    console.error("Error in getTestById:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve lab test",
    });
  }
}

/**
 * POST /api/v1/lab/tests
 * Roles: admin
 */
async function createTest(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const created = await labService.createTest(req.body, userId);
    res.status(201).json({
      success: true,
      message: "Lab test created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Error in createTest:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create lab test",
    });
  }
}

/**
 * GET /api/v1/lab/orders
 * Roles: admin, doctor, receptionist
 */
async function getOrders(req, res) {
  try {
    const orders = await labService.listOrders(req.query);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error in getOrders:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve lab orders",
    });
  }
}

/**
 * GET /api/v1/lab/orders/:id
 * Roles: admin, doctor, receptionist
 */
async function getOrderById(req, res) {
  try {
    const order = await labService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Lab order not found",
      });
    }
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error in getOrderById:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve lab order",
    });
  }
}

/**
 * POST /api/v1/lab/orders
 * Roles: admin, doctor
 */
async function createOrder(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const order = await labService.createOrder(req.body, userId);
    res.status(201).json({
      success: true,
      message: "Lab order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create lab order",
    });
  }
}

/**
 * PUT /api/v1/lab/orders/:id/sample
 * Roles: admin, doctor, receptionist
 */
async function recordSpecimen(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const order = await labService.recordSpecimen(req.params.id, userId);
    res.status(200).json({
      success: true,
      message: "Specimen collection recorded successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error in recordSpecimen:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to record specimen collection",
    });
  }
}

/**
 * POST /api/v1/lab/orders/:id/results
 * Roles: admin, doctor
 */
async function recordResults(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const order = await labService.recordResults(req.params.id, req.body, userId);
    res.status(200).json({
      success: true,
      message: "Lab results recorded successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error in recordResults:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to record lab results",
    });
  }
}

/**
 * PUT /api/v1/lab/orders/:id/cancel
 * Roles: admin, doctor
 */
async function cancelOrder(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const order = await labService.cancelOrder(req.params.id, req.body?.reason, userId);
    res.status(200).json({
      success: true,
      message: "Lab order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to cancel lab order",
    });
  }
}

module.exports = {
  getTests,
  getTestById,
  createTest,
  getOrders,
  getOrderById,
  createOrder,
  recordSpecimen,
  recordResults,
  cancelOrder,
};
