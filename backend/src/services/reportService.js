const { pool } = require("../config/db");

function validateDateParam(dateStr, paramName) {
  if (!dateStr) return null;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof dateStr !== "string" || !regex.test(dateStr)) {
    const error = new Error(`Invalid ${paramName} format. Expected YYYY-MM-DD`);
    error.statusCode = 400;
    throw error;
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${paramName} date value`);
    error.statusCode = 400;
    throw error;
  }
  return dateStr;
}

/**
 * 1. High-level Summary KPIs & Analytics Breakdowns
 */
async function getSummary() {
  const [
    patients,
    doctors,
    appointments,
    invoices,
    labOrders,
    prescriptions,
    admissions,
    patientTrends,
    apptStatus,
    deptDist,
    admStatus,
    labStatus,
    revTrend,
    medCount,
    lowStock,
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::integer AS count FROM public.patients"),
    pool.query("SELECT COUNT(*)::integer AS count FROM public.doctors"),
    pool.query("SELECT COUNT(*)::integer AS count FROM public.appointments"),
    pool.query(
      "SELECT COUNT(*)::integer AS count, COALESCE(SUM(total_amount), 0)::numeric AS revenue, COALESCE(SUM(paid_amount), 0)::numeric AS collected, COALESCE(SUM(balance_amount), 0)::numeric AS balance FROM public.invoices"
    ),
    pool.query("SELECT COUNT(*)::integer AS count FROM public.lab_orders"),
    pool.query("SELECT COUNT(*)::integer AS count FROM public.prescriptions"),
    pool.query("SELECT COUNT(*)::integer AS count FROM public.admissions"),
    pool.query(`
      SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*)::integer as count, MIN(created_at) as sort_date
      FROM public.patients
      GROUP BY TO_CHAR(created_at, 'Mon YYYY')
      ORDER BY sort_date ASC
    `),
    pool.query(`
      SELECT status, COUNT(*)::integer as count
      FROM public.appointments
      GROUP BY status
    `),
    pool.query(`
      SELECT COALESCE(department, 'General') as department, COUNT(*)::integer as count
      FROM public.doctors
      GROUP BY COALESCE(department, 'General')
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT status, COUNT(*)::integer as count
      FROM public.admissions
      GROUP BY status
    `),
    pool.query(`
      SELECT status, COUNT(*)::integer as count
      FROM public.lab_orders
      GROUP BY status
    `),
    pool.query(`
      SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
             COALESCE(SUM(total_amount), 0)::numeric as billed,
             COALESCE(SUM(paid_amount), 0)::numeric as collected,
             COALESCE(SUM(balance_amount), 0)::numeric as balance,
             MIN(created_at) as sort_date
      FROM public.invoices
      GROUP BY TO_CHAR(created_at, 'Mon YYYY')
      ORDER BY sort_date ASC
    `),
    pool.query(`
      SELECT
        COUNT(*)::integer AS "totalMedicines",
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::integer AS "activeMedicines"
      FROM public.medicines
    `),
    pool.query(`
      SELECT COUNT(*)::integer AS count
      FROM public.medicines m
      LEFT JOIN (
        SELECT medicine_id, SUM(quantity_in_stock) AS total_stock
        FROM public.medicine_batches
        WHERE status = 'AVAILABLE'
        GROUP BY medicine_id
      ) b ON b.medicine_id = m.id
      WHERE m.status = 'ACTIVE' AND COALESCE(b.total_stock, 0) <= m.reorder_level
    `),
  ]);

  const invRow = invoices.rows[0] || {};

  return {
    totalPatients: patients.rows[0].count,
    totalDoctors: doctors.rows[0].count,
    totalAppointments: appointments.rows[0].count,
    totalInvoices: invoices.rows[0].count,
    totalRevenue: parseFloat(invRow.revenue || 0),
    totalCollected: parseFloat(invRow.collected || 0),
    totalOutstanding: parseFloat(invRow.balance || 0),
    totalLabOrders: labOrders.rows[0].count,
    totalPrescriptions: prescriptions.rows[0].count,
    totalAdmissions: admissions.rows[0].count,
    patientTrends: patientTrends.rows.map((r) => ({
      month: r.month,
      count: Number(r.count || 0),
    })),
    appointmentDistribution: apptStatus.rows.map((r) => ({
      status: r.status,
      count: Number(r.count || 0),
    })),
    departmentDistribution: deptDist.rows.map((r) => ({
      department: r.department,
      count: Number(r.count || 0),
    })),
    admissionStatusDistribution: admStatus.rows.map((r) => ({
      status: r.status,
      count: Number(r.count || 0),
    })),
    laboratoryStatusDistribution: labStatus.rows.map((r) => ({
      status: r.status,
      count: Number(r.count || 0),
    })),
    revenueTrends: revTrend.rows.map((r) => ({
      month: r.month,
      billed: parseFloat(r.billed || 0),
      collected: parseFloat(r.collected || 0),
      balance: parseFloat(r.balance || 0),
    })),
    pharmacyStockSummary: {
      totalMedicines: medCount.rows[0]?.totalMedicines || 0,
      activeMedicines: medCount.rows[0]?.activeMedicines || 0,
      lowStockMedicines: lowStock.rows[0]?.count || 0,
    },
  };
}

/**
 * 2. Financial & Billing Report
 */
async function getFinancialReport(startDate, endDate) {
  const start = validateDateParam(startDate, "startDate");
  const end = validateDateParam(endDate, "endDate");

  const conditions = [];
  const params = [];

  if (start) {
    params.push(start);
    conditions.push(`created_at >= $${params.length}::timestamp`);
  }
  if (end) {
    params.push(`${end} 23:59:59`);
    conditions.push(`created_at <= $${params.length}::timestamp`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Summary invoices query
  const invQuery = `
    SELECT
      COUNT(*)::integer AS "totalInvoices",
      COALESCE(SUM(total_amount), 0)::numeric AS "totalBilled",
      COALESCE(SUM(paid_amount), 0)::numeric AS "totalCollected",
      COALESCE(SUM(balance_amount), 0)::numeric AS "totalOutstanding"
    FROM public.invoices
    ${whereClause}
  `;

  const invResult = await pool.query(invQuery, params);

  // Breakdown by item type in invoice_items
  const itemWhere = conditions.length > 0 ? `WHERE ${conditions.map((c) => `i.${c}`).join(" AND ")}` : "";
  const itemQuery = `
    SELECT
      COALESCE(ii.item_type, 'General') AS "itemType",
      COUNT(*)::integer AS "itemCount",
      COALESCE(SUM(ii.total_price), 0)::numeric AS "revenue"
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    ${itemWhere}
    GROUP BY COALESCE(ii.item_type, 'General')
    ORDER BY revenue DESC
  `;

  const itemResult = await pool.query(itemQuery, params);

  const summary = invResult.rows[0] || {};

  return {
    totalInvoices: parseInt(summary.totalInvoices, 10) || 0,
    totalBilled: parseFloat(summary.totalBilled || 0),
    totalCollected: parseFloat(summary.totalCollected || 0),
    totalOutstanding: parseFloat(summary.totalOutstanding || 0),
    revenueByCategory: itemResult.rows.map((row) => ({
      itemType: row.itemType,
      itemCount: parseInt(row.itemCount, 10) || 0,
      revenue: parseFloat(row.revenue || 0),
    })),
  };
}

/**
 * 3. Clinical & Appointment Report
 */
async function getClinicalReport(startDate, endDate) {
  const start = validateDateParam(startDate, "startDate");
  const end = validateDateParam(endDate, "endDate");

  const conditions = [];
  const params = [];

  if (start) {
    params.push(start);
    conditions.push(`appointment_date >= $${params.length}::date`);
  }
  if (end) {
    params.push(end);
    conditions.push(`appointment_date <= $${params.length}::date`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const apptQuery = `
    SELECT
      status,
      COUNT(*)::integer AS count
    FROM public.appointments
    ${whereClause}
    GROUP BY status
  `;

  const apptResult = await pool.query(apptQuery, params);

  const admConditions = [];
  const admParams = [];
  if (start) {
    admParams.push(start);
    admConditions.push(`admission_date >= $${admParams.length}::date`);
  }
  if (end) {
    admParams.push(end);
    admConditions.push(`admission_date <= $${admParams.length}::date`);
  }
  const admWhere = admConditions.length > 0 ? `WHERE ${admConditions.join(" AND ")}` : "";

  const admQuery = `
    SELECT
      status,
      COUNT(*)::integer AS count
    FROM public.admissions
    ${admWhere}
    GROUP BY status
  `;

  const admResult = await pool.query(admQuery, admParams);

  const appointmentsByStatus = {};
  apptResult.rows.forEach((r) => {
    appointmentsByStatus[r.status] = r.count;
  });

  const admissionsByStatus = {};
  admResult.rows.forEach((r) => {
    admissionsByStatus[r.status] = r.count;
  });

  return {
    appointmentsByStatus,
    admissionsByStatus,
  };
}

/**
 * 4. Pharmacy Inventory & Dispensation Report
 */
async function getPharmacyReport(startDate, endDate) {
  const start = validateDateParam(startDate, "startDate");
  const end = validateDateParam(endDate, "endDate");

  const medCount = await pool.query(`
    SELECT
      COUNT(*)::integer AS "totalMedicines",
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::integer AS "activeMedicines"
    FROM public.medicines
  `);

  const lowStock = await pool.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.medicines m
    LEFT JOIN (
      SELECT medicine_id, SUM(quantity_in_stock) AS total_stock
      FROM public.medicine_batches
      WHERE status = 'AVAILABLE'
      GROUP BY medicine_id
    ) b ON b.medicine_id = m.id
    WHERE m.status = 'ACTIVE' AND COALESCE(b.total_stock, 0) <= m.reorder_level
  `);

  const dispConditions = [];
  const dispParams = [];
  if (start) {
    dispParams.push(start);
    dispConditions.push(`dispensed_at >= $${dispParams.length}::timestamp`);
  }
  if (end) {
    dispParams.push(`${end} 23:59:59`);
    dispConditions.push(`dispensed_at <= $${dispParams.length}::timestamp`);
  }
  const dispWhere = dispConditions.length > 0 ? `WHERE ${dispConditions.join(" AND ")}` : "";

  const dispQuery = `
    SELECT
      COUNT(*)::integer AS "totalDispensations",
      COALESCE(SUM(quantity_dispensed), 0)::integer AS "totalUnitsDispensed",
      COALESCE(SUM(total_price), 0)::numeric AS "totalDispensationValue"
    FROM public.medicine_dispensations
    ${dispWhere}
  `;

  const dispResult = await pool.query(dispQuery, dispParams);
  const dispSummary = dispResult.rows[0];

  return {
    totalMedicines: medCount.rows[0].totalMedicines,
    activeMedicines: medCount.rows[0].activeMedicines,
    lowStockMedicines: lowStock.rows[0].count,
    totalDispensations: parseInt(dispSummary.totalDispensations, 10) || 0,
    totalUnitsDispensed: parseInt(dispSummary.totalUnitsDispensed, 10) || 0,
    totalDispensationValue: parseFloat(dispSummary.totalDispensationValue || 0),
  };
}

/**
 * 5. Laboratory Diagnostic Report
 */
async function getLaboratoryReport(startDate, endDate) {
  const start = validateDateParam(startDate, "startDate");
  const end = validateDateParam(endDate, "endDate");

  const conditions = [];
  const params = [];
  if (start) {
    params.push(start);
    conditions.push(`created_at >= $${params.length}::timestamp`);
  }
  if (end) {
    params.push(`${end} 23:59:59`);
    conditions.push(`created_at <= $${params.length}::timestamp`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderQuery = `
    SELECT
      status,
      priority,
      COUNT(*)::integer AS count
    FROM public.lab_orders
    ${whereClause}
    GROUP BY status, priority
  `;

  const orderResult = await pool.query(orderQuery, params);

  const statusSummary = {};
  const prioritySummary = {};
  let totalOrders = 0;

  orderResult.rows.forEach((r) => {
    totalOrders += r.count;
    statusSummary[r.status] = (statusSummary[r.status] || 0) + r.count;
    prioritySummary[r.priority] = (prioritySummary[r.priority] || 0) + r.count;
  });

  return {
    totalOrders,
    ordersByStatus: statusSummary,
    ordersByPriority: prioritySummary,
  };
}

module.exports = {
  getSummary,
  getFinancialReport,
  getClinicalReport,
  getPharmacyReport,
  getLaboratoryReport,
};
