const auditLogService = require("../services/auditLogService");

/**
 * GET /api/v1/audit-logs
 * Admin only retrieval of security audit logs.
 */
async function getAuditLogs(req, res) {
  try {
    const result = await auditLogService.listAuditLogs(req.query);
    res.status(200).json({
      success: true,
      count: result.logs.length,
      totalCount: result.totalCount,
      limit: result.limit,
      offset: result.offset,
      data: result.logs,
    });
  } catch (error) {
    console.error("Error in getAuditLogs controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve audit logs",
    });
  }
}

module.exports = {
  getAuditLogs,
};
