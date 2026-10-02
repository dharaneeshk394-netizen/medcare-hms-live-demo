const reportService = require("../services/reportService");

/**
 * GET /api/v1/reports/summary
 */
async function getSummary(req, res) {
  try {
    const summary = await reportService.getSummary();
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error in getSummary report:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve report summary",
    });
  }
}

/**
 * GET /api/v1/reports/financial
 */
async function getFinancial(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportService.getFinancialReport(startDate, endDate);
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error in getFinancial report:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve financial report",
    });
  }
}

/**
 * GET /api/v1/reports/clinical
 */
async function getClinical(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportService.getClinicalReport(startDate, endDate);
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error in getClinical report:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve clinical report",
    });
  }
}

/**
 * GET /api/v1/reports/pharmacy
 */
async function getPharmacy(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportService.getPharmacyReport(startDate, endDate);
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error in getPharmacy report:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve pharmacy report",
    });
  }
}

/**
 * GET /api/v1/reports/laboratory
 */
async function getLaboratory(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportService.getLaboratoryReport(startDate, endDate);
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error in getLaboratory report:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve laboratory report",
    });
  }
}

module.exports = {
  getSummary,
  getFinancial,
  getClinical,
  getPharmacy,
  getLaboratory,
};
