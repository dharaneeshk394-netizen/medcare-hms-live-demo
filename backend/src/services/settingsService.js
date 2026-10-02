const { pool } = require("../config/db");

/**
 * Default Hospital System Settings Initial Values
 */
const DEFAULT_SETTINGS = {
  id: 1,
  hospitalName: "MedCare Hospital",
  hospitalLogo: null,
  addressLine1: "100 Medical Center Parkway",
  addressLine2: "Suite 400",
  city: "Metropolis",
  state: "NY",
  postalCode: "10001",
  country: "United States",
  phone: "+1 (555) 019-2834",
  email: "info@medcare-hospital.org",
  website: "https://medcare-hospital.org",
  currencyCode: "USD",
  currencySymbol: "$",
  taxEnabled: true,
  taxName: "Tax",
  taxRate: 5.00,
  invoiceFooter: "Thank you for choosing MedCare Hospital. Official computer-generated tax invoice.",
  prescriptionHeader: "MedCare Hospital Outpatient & Clinical Care Department",
  reportHeader: "MedCare Hospital Diagnostic Laboratory & Clinical Pathology Department",
};

/**
 * Format database row into clean camelCase JS object
 */
function mapRowToSettings(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    hospitalName: row.hospital_name || "MedCare Hospital",
    hospitalLogo: row.hospital_logo || null,
    addressLine1: row.address_line_1 || "",
    addressLine2: row.address_line_2 || "",
    city: row.city || "",
    state: row.state || "",
    postalCode: row.postal_code || "",
    country: row.country || "",
    phone: row.phone || "",
    email: row.email || "",
    website: row.website || "",
    currencyCode: row.currency_code || "USD",
    currencySymbol: row.currency_symbol || "$",
    taxEnabled: Boolean(row.tax_enabled),
    taxName: row.tax_name || "Tax",
    taxRate: Number(row.tax_rate) || 0,
    invoiceFooter: row.invoice_footer || "",
    prescriptionHeader: row.prescription_header || "",
    reportHeader: row.report_header || "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    updatedBy: row.updated_by ? Number(row.updated_by) : null,
  };
}

/**
 * Idempotently ensure that system_settings table exists and is populated with initial default row
 */
async function ensureSettingsTableExists() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS public.system_settings (
      id integer NOT NULL PRIMARY KEY DEFAULT 1,
      hospital_name character varying(255) NOT NULL DEFAULT 'MedCare Hospital',
      hospital_logo text,
      address_line_1 character varying(255) DEFAULT '100 Medical Center Parkway',
      address_line_2 character varying(255) DEFAULT 'Suite 400',
      city character varying(100) DEFAULT 'Metropolis',
      state character varying(100) DEFAULT 'NY',
      postal_code character varying(20) DEFAULT '10001',
      country character varying(100) DEFAULT 'United States',
      phone character varying(50) DEFAULT '+1 (555) 019-2834',
      email character varying(255) DEFAULT 'info@medcare-hospital.org',
      website character varying(255) DEFAULT 'https://medcare-hospital.org',
      currency_code character varying(10) DEFAULT 'USD',
      currency_symbol character varying(10) DEFAULT '$',
      tax_enabled boolean DEFAULT true,
      tax_name character varying(50) DEFAULT 'Tax',
      tax_rate numeric(5,2) DEFAULT 5.00,
      invoice_footer text DEFAULT 'Thank you for choosing MedCare Hospital. Official computer-generated tax invoice.',
      prescription_header text DEFAULT 'MedCare Hospital Outpatient & Clinical Care Department',
      report_header text DEFAULT 'MedCare Hospital Diagnostic Laboratory & Clinical Pathology Department',
      updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      updated_by integer REFERENCES public.users(id) ON DELETE SET NULL,
      CONSTRAINT single_row_check CHECK (id = 1)
    );
  `;

  const seedRowSql = `
    INSERT INTO public.system_settings (
      id, hospital_name, hospital_logo, address_line_1, address_line_2,
      city, state, postal_code, country, phone, email, website,
      currency_code, currency_symbol, tax_enabled, tax_name, tax_rate,
      invoice_footer, prescription_header, report_header
    )
    VALUES (
      1, $1, $2, $3, $4,
      $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    await pool.query(createTableSql);
    await pool.query(seedRowSql, [
      DEFAULT_SETTINGS.hospitalName,
      DEFAULT_SETTINGS.hospitalLogo,
      DEFAULT_SETTINGS.addressLine1,
      DEFAULT_SETTINGS.addressLine2,
      DEFAULT_SETTINGS.city,
      DEFAULT_SETTINGS.state,
      DEFAULT_SETTINGS.postalCode,
      DEFAULT_SETTINGS.country,
      DEFAULT_SETTINGS.phone,
      DEFAULT_SETTINGS.email,
      DEFAULT_SETTINGS.website,
      DEFAULT_SETTINGS.currencyCode,
      DEFAULT_SETTINGS.currencySymbol,
      DEFAULT_SETTINGS.taxEnabled,
      DEFAULT_SETTINGS.taxName,
      DEFAULT_SETTINGS.taxRate,
      DEFAULT_SETTINGS.invoiceFooter,
      DEFAULT_SETTINGS.prescriptionHeader,
      DEFAULT_SETTINGS.reportHeader,
    ]);
  } catch (err) {
    console.error("Error ensuring system_settings table exists:", err.message);
  }
}

/**
 * Retrieve current active hospital system settings
 */
async function getSettings() {
  await ensureSettingsTableExists();

  const query = "SELECT * FROM public.system_settings WHERE id = 1 LIMIT 1;";
  const result = await pool.query(query);

  if (result.rows.length === 0) {
    return DEFAULT_SETTINGS;
  }

  return mapRowToSettings(result.rows[0]);
}

/**
 * Update system settings (Admin only)
 */
async function updateSettings(data, userId) {
  await ensureSettingsTableExists();

  const updateSql = `
    UPDATE public.system_settings
    SET
      hospital_name = $1,
      hospital_logo = $2,
      address_line_1 = $3,
      address_line_2 = $4,
      city = $5,
      state = $6,
      postal_code = $7,
      country = $8,
      phone = $9,
      email = $10,
      website = $11,
      currency_code = $12,
      currency_symbol = $13,
      tax_enabled = $14,
      tax_name = $15,
      tax_rate = $16,
      invoice_footer = $17,
      prescription_header = $18,
      report_header = $19,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = $20
    WHERE id = 1
    RETURNING *;
  `;

  const params = [
    data.hospitalName,
    data.hospitalLogo || null,
    data.addressLine1 || "",
    data.addressLine2 || "",
    data.city || "",
    data.state || "",
    data.postalCode || "",
    data.country || "",
    data.phone || "",
    data.email || "",
    data.website || "",
    data.currencyCode || "USD",
    data.currencySymbol || "$",
    Boolean(data.taxEnabled),
    data.taxName || "Tax",
    Number(data.taxRate) || 0,
    data.invoiceFooter || "",
    data.prescriptionHeader || "",
    data.reportHeader || "",
    userId || null,
  ];

  const result = await pool.query(updateSql, params);

  if (result.rows.length === 0) {
    throw new Error("Failed to update system settings row");
  }

  return mapRowToSettings(result.rows[0]);
}

module.exports = {
  getSettings,
  updateSettings,
  ensureSettingsTableExists,
};
