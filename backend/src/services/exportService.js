const { pool } = require("../config/db");
const { generateCsv } = require("../utils/csvHelper");

/**
 * Format Date to YYYY-MM-DD
 */
function formatDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toISOString().split("T")[0];
}

/**
 * Format DateTime to readable ISO or YYYY-MM-DD HH:MM
 */
function formatDateTime(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Format numeric currency amount to 2 decimal places
 */
function formatMoney(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}

/**
 * 1. Export Patients CSV
 */
async function exportPatients(filters = {}) {
  const { status, search, startDate, endDate } = filters;
  const conditions = [];
  const params = [];

  if (status && status !== "All") {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  if (search && typeof search === "string" && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(p.name) LIKE $${params.length} OR LOWER(p.patient_id) LIKE $${params.length} OR LOWER(p.phone) LIKE $${params.length} OR LOWER(COALESCE(p.email, '')) LIKE $${params.length})`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`p.created_at >= $${params.length}::date`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`p.created_at <= ($${params.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT
      p.id,
      p.patient_id,
      p.name,
      p.age,
      p.gender,
      p.phone,
      p.email,
      p.blood_group,
      p.status,
      p.created_at
    FROM public.patients p
    ${whereClause}
    ORDER BY p.id DESC
    LIMIT 5000;
  `;

  const result = await pool.query(sql, params);

  const columns = [
    { key: "patient_id", label: "Patient Code" },
    { key: "name", label: "Full Name" },
    { key: "age", label: "Age" },
    { key: "gender", label: "Gender" },
    { key: "phone", label: "Phone Number" },
    { key: "email", label: "Email Address" },
    { key: "blood_group", label: "Blood Group" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Registration Date", format: formatDate },
  ];

  return generateCsv(columns, result.rows);
}

/**
 * 2. Export Appointments CSV
 */
async function exportAppointments(filters = {}) {
  const { status, doctorId, patientId, startDate, endDate, search } = filters;
  const conditions = [];
  const params = [];

  if (status && status !== "All") {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

  if (doctorId) {
    params.push(Number(doctorId));
    conditions.push(`a.doctor_id = $${params.length}`);
  }

  if (patientId) {
    params.push(Number(patientId));
    conditions.push(`a.patient_id = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`a.appointment_date >= $${params.length}::date`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`a.appointment_date <= $${params.length}::date`);
  }

  if (search && typeof search === "string" && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(a.appointment_id) LIKE $${params.length} OR LOWER(p.name) LIKE $${params.length} OR LOWER(d.name) LIKE $${params.length} OR LOWER(COALESCE(a.reason, '')) LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT
      a.id,
      a.appointment_id,
      p.name AS patient_name,
      p.patient_id AS patient_code,
      d.name AS doctor_name,
      d.department,
      a.appointment_date,
      a.appointment_time,
      a.status,
      a.reason,
      a.created_at
    FROM public.appointments a
    JOIN public.patients p ON a.patient_id = p.id
    JOIN public.doctors d ON a.doctor_id = d.id
    ${whereClause}
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
    LIMIT 5000;
  `;

  const result = await pool.query(sql, params);

  const columns = [
    { key: "appointment_id", label: "Appointment Code" },
    { key: "patient_name", label: "Patient Name" },
    { key: "patient_code", label: "Patient Code" },
    { key: "doctor_name", label: "Doctor" },
    { key: "department", label: "Department" },
    { key: "appointment_date", label: "Date", format: formatDate },
    { key: "appointment_time", label: "Time" },
    { key: "status", label: "Status" },
    { key: "reason", label: "Reason / Notes" },
    { key: "created_at", label: "Booked On", format: formatDateTime },
  ];

  return generateCsv(columns, result.rows);
}

/**
 * 3. Export Invoices CSV (Billing)
 */
async function exportInvoices(filters = {}) {
  const { status, invoiceNumber, patientId, startDate, endDate } = filters;
  const conditions = [];
  const params = [];

  if (status && status !== "All") {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }

  if (invoiceNumber && typeof invoiceNumber === "string" && invoiceNumber.trim()) {
    params.push(`%${invoiceNumber.trim().toLowerCase()}%`);
    conditions.push(`LOWER(i.invoice_number) LIKE $${params.length}`);
  }

  if (patientId) {
    params.push(Number(patientId));
    conditions.push(`i.patient_id = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`i.invoice_date >= $${params.length}::date`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`i.invoice_date <= $${params.length}::date`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT
      i.id,
      i.invoice_number,
      p.name AS patient_name,
      p.patient_id AS patient_code,
      i.invoice_date,
      i.due_date,
      i.subtotal,
      i.discount,
      i.tax,
      i.total_amount,
      i.paid_amount,
      i.balance_amount,
      i.status,
      i.created_at
    FROM public.invoices i
    JOIN public.patients p ON i.patient_id = p.id
    ${whereClause}
    ORDER BY i.invoice_date DESC, i.id DESC
    LIMIT 5000;
  `;

  const result = await pool.query(sql, params);

  const columns = [
    { key: "invoice_number", label: "Invoice Number" },
    { key: "patient_name", label: "Patient Name" },
    { key: "patient_code", label: "Patient Code" },
    { key: "invoice_date", label: "Invoice Date", format: formatDate },
    { key: "due_date", label: "Due Date", format: formatDate },
    { key: "subtotal", label: "Subtotal ($)", format: formatMoney },
    { key: "discount", label: "Discount ($)", format: formatMoney },
    { key: "tax", label: "Tax ($)", format: formatMoney },
    { key: "total_amount", label: "Total Amount ($)", format: formatMoney },
    { key: "paid_amount", label: "Paid Amount ($)", format: formatMoney },
    { key: "balance_amount", label: "Balance ($)", format: formatMoney },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Generated On", format: formatDateTime },
  ];

  return generateCsv(columns, result.rows);
}

/**
 * 4. Export Financial Summary Report CSV (Admin only)
 */
async function exportFinancialSummary(startDate, endDate) {
  const conditions = [];
  const params = [];

  if (startDate) {
    params.push(startDate);
    conditions.push(`invoice_date >= $${params.length}::date`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`invoice_date <= $${params.length}::date`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Summary aggregation
  const summaryRes = await pool.query(`
    SELECT
      COUNT(*)::integer AS total_invoices,
      COALESCE(SUM(total_amount), 0)::numeric AS total_billed,
      COALESCE(SUM(paid_amount), 0)::numeric AS total_collected,
      COALESCE(SUM(balance_amount), 0)::numeric AS total_outstanding
    FROM public.invoices
    ${whereClause}
  `, params);

  const summary = summaryRes.rows[0];

  // Category breakdown
  const itemWhere = conditions.length > 0
    ? `WHERE ${conditions.map((c) => c.replace(/invoice_date/g, "i.invoice_date")).join(" AND ")}`
    : "";

  const categoryRes = await pool.query(`
    SELECT
      COALESCE(it.item_type, 'General') AS item_type,
      COUNT(it.id)::integer AS item_count,
      COALESCE(SUM(it.total_price), 0)::numeric AS revenue
    FROM public.invoice_items it
    JOIN public.invoices i ON it.invoice_id = i.id
    ${itemWhere}
    GROUP BY COALESCE(it.item_type, 'General')
    ORDER BY revenue DESC
  `, params);

  // Build combined structured report
  const rows = [];
  rows.push({
    section: "FINANCIAL OVERVIEW",
    metric: "Total Invoices Generated",
    count_or_detail: summary.total_invoices,
    amount: "-",
  });
  rows.push({
    section: "FINANCIAL OVERVIEW",
    metric: "Total Billed Amount",
    count_or_detail: "-",
    amount: formatMoney(summary.total_billed),
  });
  rows.push({
    section: "FINANCIAL OVERVIEW",
    metric: "Total Collected Amount",
    count_or_detail: "-",
    amount: formatMoney(summary.total_collected),
  });
  rows.push({
    section: "FINANCIAL OVERVIEW",
    metric: "Total Outstanding Balance",
    count_or_detail: "-",
    amount: formatMoney(summary.total_outstanding),
  });

  categoryRes.rows.forEach((cat) => {
    rows.push({
      section: "REVENUE BY ITEM CATEGORY",
      metric: cat.item_type,
      count_or_detail: `${cat.item_count} items`,
      amount: formatMoney(cat.revenue),
    });
  });

  const columns = [
    { key: "section", label: "Report Section" },
    { key: "metric", label: "Metric / Item Category" },
    { key: "count_or_detail", label: "Count / Detail" },
    { key: "amount", label: "Amount ($)" },
  ];

  return generateCsv(columns, rows);
}

/**
 * 5. Export Admissions CSV
 */
async function exportAdmissions(filters = {}) {
  const { status, startDate, endDate, search } = filters;
  const conditions = [];
  const params = [];

  if (status && status !== "All") {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`a.admission_date >= $${params.length}::date`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`a.admission_date <= $${params.length}::date`);
  }

  if (search && typeof search === "string" && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(a.admission_id) LIKE $${params.length} OR LOWER(p.name) LIKE $${params.length} OR LOWER(d.name) LIKE $${params.length} OR LOWER(COALESCE(a.room_number, '')) LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT
      a.id,
      a.admission_id,
      p.name AS patient_name,
      p.patient_id AS patient_code,
      a.room_number,
      a.bed_number,
      d.department,
      d.name AS doctor_name,
      a.admission_date,
      COALESCE(a.actual_discharge_date, a.expected_discharge_date) AS discharge_date,
      a.status,
      a.diagnosis AS admission_reason
    FROM public.admissions a
    JOIN public.patients p ON a.patient_id = p.id
    LEFT JOIN public.doctors d ON a.doctor_id = d.id
    ${whereClause}
    ORDER BY a.admission_date DESC
    LIMIT 5000;
  `;

  const result = await pool.query(sql, params);

  const columns = [
    { key: "admission_id", label: "Admission Code" },
    { key: "patient_name", label: "Patient Name" },
    { key: "patient_code", label: "Patient Code" },
    { key: "room_number", label: "Room" },
    { key: "bed_number", label: "Bed" },
    { key: "department", label: "Department" },
    { key: "doctor_name", label: "Admitting Doctor" },
    { key: "admission_date", label: "Admission Date", format: formatDate },
    { key: "discharge_date", label: "Discharge Date", format: formatDate },
    { key: "status", label: "Status" },
    { key: "admission_reason", label: "Reason / Diagnosis" },
  ];

  return generateCsv(columns, result.rows);
}

/**
 * 6. Export Medicines / Pharmacy Inventory CSV
 */
async function exportMedicines(filters = {}) {
  const { category, status, search } = filters;
  const conditions = [];
  const params = [];

  if (category && category !== "All") {
    params.push(category);
    conditions.push(`m.category = $${params.length}`);
  }

  if (status && status !== "All") {
    params.push(status);
    conditions.push(`m.status = $${params.length}`);
  }

  if (search && typeof search === "string" && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(m.name) LIKE $${params.length} OR LOWER(COALESCE(m.generic_name, '')) LIKE $${params.length} OR LOWER(m.medicine_code) LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT
      m.id,
      m.medicine_code,
      m.name AS medicine_name,
      m.generic_name,
      m.category,
      m.dosage_form,
      m.strength,
      m.unit_price,
      COALESCE(b.total_stock, 0)::integer AS total_stock,
      m.reorder_level,
      CASE
        WHEN COALESCE(b.total_stock, 0) <= m.reorder_level THEN 'LOW STOCK'
        ELSE 'NORMAL'
      END AS stock_status,
      m.status
    FROM public.medicines m
    LEFT JOIN (
      SELECT medicine_id, SUM(quantity_in_stock) AS total_stock
      FROM public.medicine_batches
      WHERE status = 'AVAILABLE'
      GROUP BY medicine_id
    ) b ON b.medicine_id = m.id
    ${whereClause}
    ORDER BY m.name ASC
    LIMIT 5000;
  `;

  const result = await pool.query(sql, params);

  const columns = [
    { key: "medicine_code", label: "Medicine Code" },
    { key: "medicine_name", label: "Brand Name" },
    { key: "generic_name", label: "Generic Name" },
    { key: "category", label: "Category" },
    { key: "dosage_form", label: "Dosage Form" },
    { key: "strength", label: "Strength" },
    { key: "unit_price", label: "Unit Price ($)", format: formatMoney },
    { key: "total_stock", label: "Available Stock" },
    { key: "reorder_level", label: "Reorder Level" },
    { key: "stock_status", label: "Stock Level Status" },
    { key: "status", label: "Catalog Status" },
  ];

  return generateCsv(columns, result.rows);
}

/**
 * 7. Export Lab Orders CSV
 */
async function exportLabOrders(filters = {}) {
  const { status, priority, search, startDate, endDate } = filters;
  const conditions = [];
  const params = [];

  if (status && status !== "All") {
    params.push(status);
    conditions.push(`lo.status = $${params.length}`);
  }

  if (priority && priority !== "All") {
    params.push(priority);
    conditions.push(`lo.priority = $${params.length}`);
  }

  if (search && typeof search === "string" && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(lo.order_number) LIKE $${params.length} OR LOWER(p.name) LIKE $${params.length} OR LOWER(p.patient_id) LIKE $${params.length} OR LOWER(d.name) LIKE $${params.length})`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`lo.created_at >= $${params.length}::date`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`lo.created_at <= ($${params.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT
      lo.id,
      lo.order_number,
      p.name AS patient_name,
      p.patient_id AS patient_code,
      d.name AS doctor_name,
      lo.priority,
      lo.status,
      lo.clinical_notes,
      lo.created_at,
      lo.sample_collected_at,
      lo.completed_at
    FROM public.lab_orders lo
    JOIN public.patients p ON lo.patient_id = p.id
    LEFT JOIN public.doctors d ON lo.doctor_id = d.id
    ${whereClause}
    ORDER BY lo.created_at DESC
    LIMIT 5000;
  `;

  const result = await pool.query(sql, params);

  const columns = [
    { key: "order_number", label: "Lab Order #" },
    { key: "patient_name", label: "Patient Name" },
    { key: "patient_code", label: "Patient Code" },
    { key: "doctor_name", label: "Ordering Doctor" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Order Status" },
    { key: "clinical_notes", label: "Clinical Notes" },
    { key: "created_at", label: "Order Date", format: formatDateTime },
    { key: "sample_collected_at", label: "Sample Collected", format: formatDateTime },
    { key: "completed_at", label: "Completed On", format: formatDateTime },
  ];

  return generateCsv(columns, result.rows);
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
