import { useEffect, useState, useCallback } from "react";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { downloadExport } from "../utils/exportUtils";
import {
  getSummary,
  getFinancialReport,
  getClinicalReport,
  getPharmacyReport,
  getLaboratoryReport,
} from "../services/reportService";
import { BarChart } from "../components/AnalyticsCharts";

function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Date filter state (YYYY-MM-DD)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");

  // Report data states
  const [summary, setSummary] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [clinical, setClinical] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [laboratory, setLaboratory] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Export states
  const [exportingType, setExportingType] = useState(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState("");
  const [exportErrorMsg, setExportErrorMsg] = useState("");

  const fetchReports = useCallback(async () => {
    setDateError("");
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setDateError("Start date cannot be after end date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [sumRes, finRes, clinRes, pharmRes, labRes] = await Promise.all([
        getSummary(),
        getFinancialReport(startDate, endDate),
        getClinicalReport(startDate, endDate),
        getPharmacyReport(startDate, endDate),
        getLaboratoryReport(startDate, endDate),
      ]);

      setSummary(sumRes);
      setFinancial(finRes);
      setClinical(clinRes);
      setPharmacy(pharmRes);
      setLaboratory(labRes);
    } catch (err) {
      console.error("Failed to load analytics reports:", err);
      setError(err.message || "Failed to load hospital reports.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    setDateError("");
  };

  const handleExport = async (type, filenamePrefix) => {
    if (exportingType) return;

    try {
      setExportingType(type);
      setExportSuccessMsg("");
      setExportErrorMsg("");

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/v1/reports/export/${type}${qs}`;
      const dateSuffix = new Date().toISOString().split("T")[0];
      const defaultFilename = `medcare-${filenamePrefix}-${dateSuffix}.csv`;

      await downloadExport(url, defaultFilename);
      setExportSuccessMsg(`Successfully exported ${filenamePrefix} report (CSV)!`);
    } catch (err) {
      setExportErrorMsg(err.message || `Failed to export ${filenamePrefix} report.`);
    } finally {
      setExportingType(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Hospital Reports & Analytics</h2>
          <p>Comprehensive operational, financial, clinical, and diagnostic intelligence across departments.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handlePrint}
            title="Print or Save as PDF"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="printer" size={15} /> Print / Save PDF
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchReports}
            disabled={loading}
          >
            {loading ? "Refreshing..." : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Icon name="refresh" size={14} /> Refresh Reports
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Export Feedback Alerts */}
      {exportSuccessMsg && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "16px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: "6px",
            color: "#065f46",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="checkCircle" size={16} /> {exportSuccessMsg}
        </div>
      )}

      {exportErrorMsg && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "16px",
            backgroundColor: "#fee2e2",
            border: "1px solid #f87171",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="warning" size={16} /> {exportErrorMsg}
        </div>
      )}

      {/* Date Range Filter Bar & Quick Export Bar */}
      <section className="dashboard-section" style={{ marginBottom: "20px", padding: "16px 20px" }}>
        <form onSubmit={handleApplyFilter} style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "12px" }}>
          <div className="form-field" style={{ margin: 0, minWidth: "180px" }}>
            <label htmlFor="startDateFilter" style={{ fontSize: "13px", fontWeight: 600 }}>Start Date</label>
            <input
              id="startDateFilter"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
          </div>

          <div className="form-field" style={{ margin: 0, minWidth: "180px" }}>
            <label htmlFor="endDateFilter" style={{ fontSize: "13px", fontWeight: 600 }}>End Date</label>
            <input
              id="endDateFilter"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="primary-button" style={{ padding: "9px 16px" }} disabled={loading}>
              Apply Filter
            </button>
            <button type="button" className="secondary-button" style={{ padding: "9px 16px" }} onClick={handleResetFilter} disabled={loading}>
              Reset
            </button>
          </div>
        </form>

        {/* Quick CSV Export Action Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#4b5563", marginRight: "4px" }}>
            Export Reports (CSV):
          </span>
          {isAdmin && (
            <button
              type="button"
              className="secondary-button"
              style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => handleExport("financial", "financial-analytics")}
              disabled={loading || !!exportingType}
            >
              <Icon name="download" size={13} /> {exportingType === "financial" ? "Exporting..." : "Financial Summary"}
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => handleExport("patients", "patients-list")}
            disabled={loading || !!exportingType}
          >
            <Icon name="download" size={13} /> {exportingType === "patients" ? "Exporting..." : "Patients"}
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => handleExport("appointments", "appointments-report")}
            disabled={loading || !!exportingType}
          >
            <Icon name="download" size={13} /> {exportingType === "appointments" ? "Exporting..." : "Appointments"}
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => handleExport("admissions", "admissions-report")}
            disabled={loading || !!exportingType}
          >
            <Icon name="download" size={13} /> {exportingType === "admissions" ? "Exporting..." : "Admissions"}
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => handleExport("pharmacy", "pharmacy-inventory")}
            disabled={loading || !!exportingType}
          >
            <Icon name="download" size={13} /> {exportingType === "pharmacy" ? "Exporting..." : "Pharmacy"}
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => handleExport("laboratory", "laboratory-orders")}
            disabled={loading || !!exportingType}
          >
            <Icon name="download" size={13} /> {exportingType === "laboratory" ? "Exporting..." : "Laboratory"}
          </button>
        </div>

        {dateError && <p className="form-error" style={{ marginTop: "8px" }}>{dateError}</p>}
      </section>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            backgroundColor: "#fee2e2",
            border: "1px solid #f87171",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "14px",
          }}
        >
          <strong>Error: </strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !summary && (
        <div className="empty-state">
          <p>Generating hospital reports and metrics...</p>
        </div>
      )}

      {/* SUMMARY KPI CARDS */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Total Patients</div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#1e40af", marginTop: "6px" }}>{summary.totalPatients}</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Active Doctors</div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#047857", marginTop: "6px" }}>{summary.totalDoctors}</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Total Appointments</div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#b45309", marginTop: "6px" }}>{summary.totalAppointments}</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Gross Revenue</div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#6d28d9", marginTop: "6px" }}>${summary.totalRevenue.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* FINANCIAL REPORT SECTION */}
      {financial && (
        <section className="dashboard-section" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="credit-card" size={20} /> Financial & Billing Analytics
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div style={{ padding: "14px", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Invoices Generated</div>
              <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>{financial.totalInvoices}</div>
            </div>
            <div style={{ padding: "14px", backgroundColor: "#eff6ff", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: "12px", color: "#1e40af" }}>Total Billed Amount</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e40af", marginTop: "4px" }}>${financial.totalBilled.toFixed(2)}</div>
            </div>
            <div style={{ padding: "14px", backgroundColor: "#ecfdf5", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
              <div style={{ fontSize: "12px", color: "#065f46" }}>Total Collected Payments</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#047857", marginTop: "4px" }}>${financial.totalCollected.toFixed(2)}</div>
            </div>
            <div style={{ padding: "14px", backgroundColor: "#fffbeb", borderRadius: "6px", border: "1px solid #fde68a" }}>
              <div style={{ fontSize: "12px", color: "#92400e" }}>Outstanding Balance</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#b45309", marginTop: "4px" }}>${financial.totalOutstanding.toFixed(2)}</div>
            </div>
          </div>

          <h4 style={{ fontSize: "15px", marginBottom: "10px", color: "#374151" }}>Revenue Breakdown by Item Category</h4>
          {financial.revenueByCategory.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "16px" }}>
              <BarChart
                title="Revenue Distribution ($)"
                description="Revenue breakdown across invoice billing item categories."
                data={financial.revenueByCategory}
                xKey="itemType"
                yKey="revenue"
                yLabel="Revenue ($)"
                color="#2563eb"
              />
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Item Category</th>
                      <th>Item Count</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financial.revenueByCategory.map((cat, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{cat.itemType}</td>
                        <td>{cat.itemCount}</td>
                        <td><strong style={{ color: "#1e40af" }}>${cat.revenue.toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontStyle: "italic", fontSize: "14px" }}>No invoice line items recorded for the selected period.</p>
          )}
        </section>
      )}

      {/* CLINICAL & APPOINTMENT SECTION */}
      {clinical && (
        <section className="dashboard-section" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="hospital" size={20} /> Clinical & Appointments Analytics
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div>
              <h4 style={{ fontSize: "15px", marginBottom: "10px", color: "#374151" }}>Appointments by Status</h4>
              <div style={{ backgroundColor: "#f9fafb", padding: "14px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                {Object.keys(clinical.appointmentsByStatus).length > 0 ? (
                  Object.entries(clinical.appointmentsByStatus).map(([status, count]) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  ))
                ) : (
                  <span style={{ color: "#6b7280", fontStyle: "italic" }}>No appointments found.</span>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "15px", marginBottom: "10px", color: "#374151" }}>Admissions by Status</h4>
              <div style={{ backgroundColor: "#f9fafb", padding: "14px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                {Object.keys(clinical.admissionsByStatus).length > 0 ? (
                  Object.entries(clinical.admissionsByStatus).map(([status, count]) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  ))
                ) : (
                  <span style={{ color: "#6b7280", fontStyle: "italic" }}>No admissions found.</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PHARMACY SECTION */}
      {pharmacy && (
        <section className="dashboard-section" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="pill" size={20} /> Pharmacy Inventory & Dispensation
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "14px", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Catalog Medicines</div>
              <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>{pharmacy.totalMedicines} ({pharmacy.activeMedicines} Active)</div>
            </div>
            <div style={{ padding: "14px", backgroundColor: pharmacy.lowStockMedicines > 0 ? "#fee2e2" : "#ecfdf5", borderRadius: "6px", border: pharmacy.lowStockMedicines > 0 ? "1px solid #f87171" : "1px solid #a7f3d0" }}>
              <div style={{ fontSize: "12px", color: pharmacy.lowStockMedicines > 0 ? "#991b1b" : "#065f46" }}>Low Stock Items</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: pharmacy.lowStockMedicines > 0 ? "#b91c1c" : "#047857", marginTop: "4px" }}>{pharmacy.lowStockMedicines}</div>
            </div>
            <div style={{ padding: "14px", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Dispensations</div>
              <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>{pharmacy.totalDispensations} ({pharmacy.totalUnitsDispensed} units)</div>
            </div>
            <div style={{ padding: "14px", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Dispensation Value</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e40af", marginTop: "4px" }}>${pharmacy.totalDispensationValue.toFixed(2)}</div>
            </div>
          </div>
        </section>
      )}

      {/* LABORATORY SECTION */}
      {laboratory && (
        <section className="dashboard-section">
          <h3 style={{ fontSize: "18px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="flask" size={20} /> Laboratory Diagnostics Analytics
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <div style={{ padding: "14px", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Lab Requisitions</div>
              <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>{laboratory.totalOrders}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div>
              <h4 style={{ fontSize: "15px", marginBottom: "10px", color: "#374151" }}>Orders by Status</h4>
              <div style={{ backgroundColor: "#f9fafb", padding: "14px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                {Object.keys(laboratory.ordersByStatus).length > 0 ? (
                  Object.entries(laboratory.ordersByStatus).map(([status, count]) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  ))
                ) : (
                  <span style={{ color: "#6b7280", fontStyle: "italic" }}>No lab orders found.</span>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "15px", marginBottom: "10px", color: "#374151" }}>Orders by Priority</h4>
              <div style={{ backgroundColor: "#f9fafb", padding: "14px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                {Object.keys(laboratory.ordersByPriority).length > 0 ? (
                  Object.entries(laboratory.ordersByPriority).map(([priority, count]) => (
                    <div key={priority} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                      <span>{priority}</span>
                      <strong>{count}</strong>
                    </div>
                  ))
                ) : (
                  <span style={{ color: "#6b7280", fontStyle: "italic" }}>No priority data found.</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Reports;
