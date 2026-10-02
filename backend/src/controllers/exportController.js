const exportService = require("../services/exportService");
const auditService = require("../services/auditService");

/**
 * Helper to generate standardized dynamic filenames
 */
function getExportFilename(prefix) {
  const dateStr = new Date().toISOString().split("T")[0];
  return `medcare-${prefix}-${dateStr}.csv`;
}

/**
 * Helper to send CSV with standard attachment headers and audit log
 */
function sendCsvResponse(res, req, csvData, filename, eventType, resourceType) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  // Non-blocking audit logging
  auditService.logAuditEvent({
    eventType,
    userId: req.user?.id || req.session?.user?.id || null,
    role: req.user?.role || req.session?.user?.role || null,
    action: "EXPORT",
    resourceType,
    resourceId: filename,
    outcome: "SUCCESS",
    ipAddress: req.ip,
  });

  return res.status(200).send(csvData);
}

/**
 * Controller: Export Patients CSV
 */
async function exportPatients(req, res) {
  try {
    const filters = {
      status: req.query.status,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const csvData = await exportService.exportPatients(filters);
    const filename = getExportFilename("patients");
    return sendCsvResponse(res, req, csvData, filename, "PATIENT_EXPORT", "PATIENTS");
  } catch (err) {
    console.error("Error exporting patients CSV:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export patients dataset.",
    });
  }
}

/**
 * Controller: Export Appointments CSV
 */
async function exportAppointments(req, res) {
  try {
    const filters = {
      status: req.query.status,
      doctorId: req.query.doctorId,
      patientId: req.query.patientId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    };

    const csvData = await exportService.exportAppointments(filters);
    const filename = getExportFilename("appointments");
    return sendCsvResponse(res, req, csvData, filename, "APPOINTMENT_EXPORT", "APPOINTMENTS");
  } catch (err) {
    console.error("Error exporting appointments CSV:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export appointments dataset.",
    });
  }
}

/**
 * Controller: Export Invoices CSV (Billing)
 */
async function exportInvoices(req, res) {
  try {
    const filters = {
      status: req.query.status,
      invoiceNumber: req.query.invoiceNumber || req.query.search,
      patientId: req.query.patientId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const csvData = await exportService.exportInvoices(filters);
    const filename = getExportFilename("invoices");
    return sendCsvResponse(res, req, csvData, filename, "BILLING_EXPORT", "INVOICES");
  } catch (err) {
    console.error("Error exporting invoices CSV:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export billing invoices.",
    });
  }
}

/**
 * Controller: Export Financial Summary Report CSV (Admin only)
 */
async function exportFinancialSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const csvData = await exportService.exportFinancialSummary(startDate, endDate);
    const filename = getExportFilename("financial-report");
    return sendCsvResponse(res, req, csvData, filename, "REPORT_EXPORT", "FINANCIAL_REPORT");
  } catch (err) {
    console.error("Error exporting financial report CSV:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export financial analytics report.",
    });
  }
}

/**
 * Controller: Export Admissions CSV
 */
async function exportAdmissions(req, res) {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    };

    const csvData = await exportService.exportAdmissions(filters);
    const filename = getExportFilename("admissions");
    return sendCsvResponse(res, req, csvData, filename, "REPORT_EXPORT", "ADMISSIONS");
  } catch (err) {
    console.error("Error exporting admissions CSV:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export admissions report.",
    });
  }
}

/**
 * Controller: Export Medicines / Pharmacy Inventory CSV
 */
async function exportMedicines(req, res) {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
    };

    const csvData = await exportService.exportMedicines(filters);
    const filename = getExportFilename("pharmacy-inventory");
    return sendCsvResponse(res, req, csvData, filename, "PHARMACY_EXPORT", "MEDICINES");
  } catch (err) {
    console.error("Error exporting pharmacy medicines CSV:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export pharmacy inventory.",
    });
  }
}

/**
 * Controller: Export Lab Orders CSV
 */
async function exportLabOrders(req, res) {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const csvData = await exportService.exportLabOrders(filters);
    const filename = getExportFilename("laboratory-orders");
    return sendCsvResponse(res, req, csvData, filename, "LAB_EXPORT", "LAB_ORDERS");
  } catch (err) {
    console.error("Error exporting lab orders CSV:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export laboratory orders.",
    });
  }
}

module.exports = {
  exportPatients,
  exportAppointments,
  exportInvoices,
  exportFinancialSummary,
  exportAdmissions,
  exportMedicines,
  exportLabOrders,
};
