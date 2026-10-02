import { useState, useEffect, useCallback } from "react";
import Icon from "../components/Icon";
import { getSettings, updateSettings } from "../services/settingsService";

const CURRENCY_PRESETS = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "CAD", symbol: "CA$", label: "CAD (CA$) - Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD (A$) - Australian Dollar" },
  { code: "AED", symbol: "AED", label: "AED (AED) - UAE Dirham" },
  { code: "SAR", symbol: "SAR", label: "SAR (SAR) - Saudi Riyal" },
];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    hospitalName: "",
    hospitalLogo: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    currencyCode: "USD",
    currencySymbol: "$",
    taxEnabled: true,
    taxName: "Tax",
    taxRate: "5.00",
    invoiceFooter: "",
    prescriptionHeader: "",
    reportHeader: "",
  });

  const loadSettingsData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const data = await getSettings();
      if (data) {
        setForm({
          hospitalName: data.hospitalName || "",
          hospitalLogo: data.hospitalLogo || "",
          addressLine1: data.addressLine1 || "",
          addressLine2: data.addressLine2 || "",
          city: data.city || "",
          state: data.state || "",
          postalCode: data.postalCode || "",
          country: data.country || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          currencyCode: data.currencyCode || "USD",
          currencySymbol: data.currencySymbol || "$",
          taxEnabled: Boolean(data.taxEnabled),
          taxName: data.taxName || "Tax",
          taxRate: data.taxRate !== undefined ? String(data.taxRate) : "5.00",
          invoiceFooter: data.invoiceFooter || "",
          prescriptionHeader: data.prescriptionHeader || "",
          reportHeader: data.reportHeader || "",
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setErrorMsg(err.message || "Failed to load hospital settings. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (successMsg) setSuccessMsg("");
    if (errorMsg) setErrorMsg("");
  };

  const handleCurrencyPresetChange = (e) => {
    const selectedCode = e.target.value;
    const preset = CURRENCY_PRESETS.find((p) => p.code === selectedCode);
    if (preset) {
      setForm((prev) => ({
        ...prev,
        currencyCode: preset.code,
        currencySymbol: preset.symbol,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        currencyCode: selectedCode,
      }));
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      setFieldErrors((prev) => ({
        ...prev,
        hospitalLogo: "Image size exceeds 500KB limit. Please choose a smaller image.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        hospitalLogo: reader.result,
      }));
      if (fieldErrors.hospitalLogo) {
        setFieldErrors((prev) => ({ ...prev, hospitalLogo: "" }));
      }
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.hospitalName.trim()) {
      errors.hospitalName = "Hospital name is required.";
    } else if (form.hospitalName.length > 255) {
      errors.hospitalName = "Hospital name cannot exceed 255 characters.";
    }

    if (form.taxEnabled) {
      const numTax = Number(form.taxRate);
      if (Number.isNaN(numTax) || numTax < 0 || numTax > 100) {
        errors.taxRate = "Tax rate must be a valid number between 0% and 100%.";
      }
    }

    if (!form.currencyCode.trim()) {
      errors.currencyCode = "Currency code is required.";
    }

    if (!form.currencySymbol.trim()) {
      errors.currencySymbol = "Currency symbol is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = {
        hospitalName: (form.hospitalName || "").trim(),
        hospitalLogo: form.hospitalLogo ? form.hospitalLogo.trim() : null,
        addressLine1: (form.addressLine1 || "").trim(),
        addressLine2: (form.addressLine2 || "").trim(),
        city: (form.city || "").trim(),
        state: (form.state || "").trim(),
        postalCode: (form.postalCode || "").trim(),
        country: (form.country || "").trim(),
        phone: (form.phone || "").trim(),
        email: (form.email || "").trim(),
        website: (form.website || "").trim(),
        currencyCode: (form.currencyCode || "USD").trim().toUpperCase(),
        currencySymbol: (form.currencySymbol || "$").trim(),
        taxEnabled: Boolean(form.taxEnabled),
        taxName: (form.taxName || "Tax").trim(),
        taxRate: Number(form.taxRate) || 0,
        invoiceFooter: (form.invoiceFooter || "").trim(),
        prescriptionHeader: (form.prescriptionHeader || "").trim(),
        reportHeader: (form.reportHeader || "").trim(),
      };

      const updated = await updateSettings(payload);
      setSuccessMsg("Hospital profile and system settings saved successfully!");
      if (updated) {
        setForm({
          hospitalName: updated.hospitalName || "",
          hospitalLogo: updated.hospitalLogo || "",
          addressLine1: updated.addressLine1 || "",
          addressLine2: updated.addressLine2 || "",
          city: updated.city || "",
          state: updated.state || "",
          postalCode: updated.postalCode || "",
          country: updated.country || "",
          phone: updated.phone || "",
          email: updated.email || "",
          website: updated.website || "",
          currencyCode: updated.currencyCode || "USD",
          currencySymbol: updated.currencySymbol || "$",
          taxEnabled: Boolean(updated.taxEnabled),
          taxName: updated.taxName || "Tax",
          taxRate: updated.taxRate !== undefined ? String(updated.taxRate) : "5.00",
          invoiceFooter: updated.invoiceFooter || "",
          prescriptionHeader: updated.prescriptionHeader || "",
          reportHeader: updated.reportHeader || "",
        });
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      setErrorMsg(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state" style={{ padding: "60px 0", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p>Loading hospital settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" id="main-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon name="settings" size={28} style={{ color: "#2563eb" }} />
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>
              System Settings & Hospital Profile
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: "4px 0 0 38px" }}>
            Manage organization details, regional billing defaults, and printable document headers.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: "20px" }}>
          <Icon name="checkCircle" size={18} inline style={{ marginRight: "8px" }} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
          <Icon name="warning" size={18} inline style={{ marginRight: "8px" }} />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* SECTION A: HOSPITAL PROFILE */}
        <div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
            <Icon name="doctors" size={20} style={{ color: "#2563eb" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>
              A. Hospital Branding & Facility Profile
            </h2>
          </div>

          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {/* Hospital Name */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="hospitalName" style={{ fontWeight: "600" }}>
                Hospital Name <span className="required-star" style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                id="hospitalName"
                name="hospitalName"
                className={`form-control ${fieldErrors.hospitalName ? "is-invalid" : ""}`}
                placeholder="e.g. MedCare Hospital"
                value={form.hospitalName}
                onChange={handleChange}
                maxLength={255}
                disabled={saving}
              />
              {fieldErrors.hospitalName && (
                <span className="error-text" style={{ color: "#dc2626", fontSize: "12px" }}>{fieldErrors.hospitalName}</span>
              )}
            </div>

            {/* Logo URL or Upload */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="hospitalLogo" style={{ fontWeight: "600" }}>
                Hospital Logo
              </label>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginTop: "4px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    id="hospitalLogo"
                    name="hospitalLogo"
                    className="form-control"
                    placeholder="Image URL or Data URI (e.g. https://example.com/logo.png)"
                    value={form.hospitalLogo}
                    onChange={handleChange}
                    disabled={saving}
                  />
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Or upload logo image file:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      disabled={saving}
                      style={{ fontSize: "12px" }}
                    />
                  </div>
                </div>

                {/* Logo Preview */}
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "8px",
                    border: "1px dashed #d1d5db",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f9fafb",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {form.hospitalLogo ? (
                    <img
                      src={form.hospitalLogo}
                      alt="Logo preview"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>No Logo</span>
                  )}
                </div>
              </div>
              {fieldErrors.hospitalLogo && (
                <span className="error-text" style={{ color: "#dc2626", fontSize: "12px" }}>{fieldErrors.hospitalLogo}</span>
              )}
            </div>

            {/* Address Line 1 */}
            <div className="form-group">
              <label htmlFor="addressLine1">Address Line 1</label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                className="form-control"
                placeholder="e.g. 100 Medical Center Parkway"
                value={form.addressLine1}
                onChange={handleChange}
                maxLength={255}
                disabled={saving}
              />
            </div>

            {/* Address Line 2 */}
            <div className="form-group">
              <label htmlFor="addressLine2">Address Line 2 / Suite</label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                className="form-control"
                placeholder="e.g. Suite 400"
                value={form.addressLine2}
                onChange={handleChange}
                maxLength={255}
                disabled={saving}
              />
            </div>

            {/* City */}
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                className="form-control"
                placeholder="e.g. Metropolis"
                value={form.city}
                onChange={handleChange}
                maxLength={100}
                disabled={saving}
              />
            </div>

            {/* State */}
            <div className="form-group">
              <label htmlFor="state">State / Province</label>
              <input
                type="text"
                id="state"
                name="state"
                className="form-control"
                placeholder="e.g. NY"
                value={form.state}
                onChange={handleChange}
                maxLength={100}
                disabled={saving}
              />
            </div>

            {/* Postal Code */}
            <div className="form-group">
              <label htmlFor="postalCode">Postal Code</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                className="form-control"
                placeholder="e.g. 10001"
                value={form.postalCode}
                onChange={handleChange}
                maxLength={20}
                disabled={saving}
              />
            </div>

            {/* Country */}
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                className="form-control"
                placeholder="e.g. United States"
                value={form.country}
                onChange={handleChange}
                maxLength={100}
                disabled={saving}
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">Phone / Hotline</label>
              <input
                type="text"
                id="phone"
                name="phone"
                className="form-control"
                placeholder="e.g. +1 (555) 019-2834"
                value={form.phone}
                onChange={handleChange}
                maxLength={50}
                disabled={saving}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Official Contact Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                placeholder="e.g. info@medcare-hospital.org"
                value={form.email}
                onChange={handleChange}
                maxLength={255}
                disabled={saving}
              />
            </div>

            {/* Website */}
            <div className="form-group">
              <label htmlFor="website">Website URL</label>
              <input
                type="text"
                id="website"
                name="website"
                className="form-control"
                placeholder="e.g. https://medcare-hospital.org"
                value={form.website}
                onChange={handleChange}
                maxLength={255}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* SECTION B: REGIONAL & BILLING SETTINGS */}
        <div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
            <Icon name="billing" size={20} style={{ color: "#2563eb" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>
              B. Regional Currency & Tax Policy
            </h2>
          </div>

          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {/* Currency Preset Quick Select */}
            <div className="form-group">
              <label htmlFor="currencyPreset" style={{ fontWeight: "600" }}>
                Preset Currency Selection
              </label>
              <select
                id="currencyPreset"
                className="form-control"
                value={form.currencyCode}
                onChange={handleCurrencyPresetChange}
                disabled={saving}
              >
                {CURRENCY_PRESETS.map((preset) => (
                  <option key={preset.code} value={preset.code}>
                    {preset.label}
                  </option>
                ))}
                <option value="CUSTOM">Other / Custom Currency</option>
              </select>
            </div>

            {/* Currency Code */}
            <div className="form-group">
              <label htmlFor="currencyCode" style={{ fontWeight: "600" }}>
                Currency Code <span className="required-star" style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                id="currencyCode"
                name="currencyCode"
                className="form-control"
                placeholder="e.g. USD, EUR, GBP, INR"
                value={form.currencyCode}
                onChange={handleChange}
                maxLength={10}
                disabled={saving}
              />
              {fieldErrors.currencyCode && (
                <span className="error-text" style={{ color: "#dc2626", fontSize: "12px" }}>{fieldErrors.currencyCode}</span>
              )}
            </div>

            {/* Currency Symbol */}
            <div className="form-group">
              <label htmlFor="currencySymbol" style={{ fontWeight: "600" }}>
                Currency Symbol <span className="required-star" style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                id="currencySymbol"
                name="currencySymbol"
                className="form-control"
                placeholder="e.g. $, €, £, ₹"
                value={form.currencySymbol}
                onChange={handleChange}
                maxLength={10}
                disabled={saving}
              />
              {fieldErrors.currencySymbol && (
                <span className="error-text" style={{ color: "#dc2626", fontSize: "12px" }}>{fieldErrors.currencySymbol}</span>
              )}
            </div>

            {/* Tax Enable Checkbox */}
            <div className="form-group" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
              <input
                type="checkbox"
                id="taxEnabled"
                name="taxEnabled"
                checked={form.taxEnabled}
                onChange={handleChange}
                disabled={saving}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="taxEnabled" style={{ fontWeight: "600", cursor: "pointer", margin: 0 }}>
                Enable Automatic Tax / VAT Calculation on Invoices
              </label>
            </div>

            {/* Tax Name */}
            {form.taxEnabled && (
              <>
                <div className="form-group">
                  <label htmlFor="taxName" style={{ fontWeight: "600" }}>
                    Tax Label Name
                  </label>
                  <input
                    type="text"
                    id="taxName"
                    name="taxName"
                    className="form-control"
                    placeholder="e.g. Tax, VAT, GST"
                    value={form.taxName}
                    onChange={handleChange}
                    maxLength={50}
                    disabled={saving}
                  />
                </div>

                {/* Tax Rate */}
                <div className="form-group">
                  <label htmlFor="taxRate" style={{ fontWeight: "600" }}>
                    Default Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    id="taxRate"
                    name="taxRate"
                    step="0.01"
                    min="0"
                    max="100"
                    className="form-control"
                    placeholder="e.g. 5.00"
                    value={form.taxRate}
                    onChange={handleChange}
                    disabled={saving}
                  />
                  {fieldErrors.taxRate && (
                    <span className="error-text" style={{ color: "#dc2626", fontSize: "12px" }}>{fieldErrors.taxRate}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION C: DOCUMENT BRANDING */}
        <div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
            <Icon name="fileText" size={20} style={{ color: "#2563eb" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>
              C. Printable Document Branding & Disclaimers
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Invoice Footer */}
            <div className="form-group">
              <label htmlFor="invoiceFooter" style={{ fontWeight: "600" }}>
                Tax Invoice Footer Notice / Payment Disclaimer
              </label>
              <textarea
                id="invoiceFooter"
                name="invoiceFooter"
                className="form-control"
                rows={3}
                placeholder="Disclaimers rendered at the bottom of printed A4 invoices..."
                value={form.invoiceFooter}
                onChange={handleChange}
                maxLength={1000}
                disabled={saving}
              />
              <span className="field-hint" style={{ fontSize: "12px", color: "#6b7280" }}>
                {form.invoiceFooter.length}/1000 characters. Appears on Printable Invoice footer.
              </span>
            </div>

            {/* Prescription Header */}
            <div className="form-group">
              <label htmlFor="prescriptionHeader" style={{ fontWeight: "600" }}>
                Prescription Department Tagline / Header Subtitle
              </label>
              <input
                type="text"
                id="prescriptionHeader"
                name="prescriptionHeader"
                className="form-control"
                placeholder="e.g. Outpatient & Clinical Care Department"
                value={form.prescriptionHeader}
                onChange={handleChange}
                maxLength={255}
                disabled={saving}
              />
              <span className="field-hint" style={{ fontSize: "12px", color: "#6b7280" }}>
                Appears on Printable Prescription header under Hospital Name.
              </span>
            </div>

            {/* Report Header */}
            <div className="form-group">
              <label htmlFor="reportHeader" style={{ fontWeight: "600" }}>
                Laboratory Report Header Subtitle
              </label>
              <input
                type="text"
                id="reportHeader"
                name="reportHeader"
                className="form-control"
                placeholder="e.g. Diagnostic Laboratory & Clinical Pathology Department"
                value={form.reportHeader}
                onChange={handleChange}
                maxLength={255}
                disabled={saving}
              />
              <span className="field-hint" style={{ fontSize: "12px", color: "#6b7280" }}>
                Appears on Printable Lab Report header under Hospital Name.
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "32px" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={loadSettingsData}
            disabled={saving}
          >
            Reset Changes
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", minWidth: "160px", justifyContent: "center" }}
          >
            {saving ? (
              <>
                <div className="spinner-sm" /> Saving Settings...
              </>
            ) : (
              <>
                <Icon name="check" size={18} /> Save Hospital Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
