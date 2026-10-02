const billingService = require("../services/billingService");

/**
 * Controller: getInvoices
 * GET /api/v1/billing/invoices
 */
async function getInvoices(req, res) {
  try {
    const { page, limit, patientId, status, invoiceNumber, startDate, endDate } = req.query;

    const filters = {};
    if (patientId) filters.patientId = Number(patientId);
    if (status) filters.status = status;
    if (invoiceNumber) filters.invoiceNumber = invoiceNumber;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const pagination = {};
    if (page) pagination.page = Number(page);
    if (limit) pagination.limit = Number(limit);

    const result = await billingService.getAllInvoices(filters, pagination);

    res.status(200).json({
      success: true,
      count: result.invoices.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: result.invoices,
    });
  } catch (error) {
    console.error("Error getting invoices:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve invoices",
    });
  }
}

/**
 * Controller: getInvoiceById
 * GET /api/v1/billing/invoices/:id
 */
async function getInvoiceById(req, res) {
  try {
    const invoice = await billingService.getInvoiceById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error getting invoice:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve invoice",
    });
  }
}

/**
 * Controller: createInvoice
 * POST /api/v1/billing/invoices
 */
async function createInvoice(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const invoice = await billingService.createInvoice(req.body, userId);

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create invoice",
    });
  }
}

/**
 * Controller: updateInvoice
 * PUT /api/v1/billing/invoices/:id
 */
async function updateInvoice(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const invoice = await billingService.updateInvoice(req.params.id, req.body, userId);

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update invoice",
    });
  }
}

/**
 * Controller: cancelInvoice
 * POST /api/v1/billing/invoices/:id/cancel
 */
async function cancelInvoice(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const reason = req.body?.reason || "";
    const invoice = await billingService.cancelInvoice(req.params.id, reason, userId);

    res.status(200).json({
      success: true,
      message: "Invoice cancelled successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to cancel invoice",
    });
  }
}

/**
 * Controller: addInvoiceItem
 * POST /api/v1/billing/invoices/:id/items
 */
async function addInvoiceItem(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const invoice = await billingService.addInvoiceItem(req.params.id, req.body, userId);

    res.status(201).json({
      success: true,
      message: "Invoice item added successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error adding invoice item:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to add invoice item",
    });
  }
}

/**
 * Controller: updateInvoiceItem
 * PUT /api/v1/billing/invoices/:id/items/:itemId
 */
async function updateInvoiceItem(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const invoice = await billingService.updateInvoiceItem(
      req.params.id,
      req.params.itemId,
      req.body,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Invoice item updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice item:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update invoice item",
    });
  }
}

/**
 * Controller: removeInvoiceItem
 * DELETE /api/v1/billing/invoices/:id/items/:itemId
 */
async function removeInvoiceItem(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const invoice = await billingService.removeInvoiceItem(
      req.params.id,
      req.params.itemId,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Invoice item removed successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error removing invoice item:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to remove invoice item",
    });
  }
}

/**
 * Controller: getInvoicePayments
 * GET /api/v1/billing/invoices/:id/payments
 */
async function getInvoicePayments(req, res) {
  try {
    const payments = await billingService.getInvoicePayments(req.params.id);

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Error getting invoice payments:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve invoice payments",
    });
  }
}

/**
 * Controller: recordPayment
 * POST /api/v1/billing/invoices/:id/payments
 */
async function recordPayment(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const result = await billingService.recordPayment(req.params.id, req.body, userId);

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to record payment",
    });
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  cancelInvoice,
  addInvoiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  getInvoicePayments,
  recordPayment,
};
