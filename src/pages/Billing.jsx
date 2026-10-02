import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getInvoices } from "../services/billingService";
import { downloadExport } from "../utils/exportUtils";

/**
 * Currency formatter for monetary values.
 * Returns consistent $X.XX representation.
 */
function formatCurrency(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) {
    return "$0.00";
  }
  return `$${num.toFixed(2)}`;
}

/**
 * Date formatter for invoice dates.
 * Displays formatted YYYY-MM-DD or readable localized date.
 */
function formatDate(dateString) {
  if (!dateString) return "-";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Billing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userRole = user?.role ? String(user.role).toLowerCase() : "";
  const canCreateInvoice = userRole === "admin" || userRole === "receptionist";

  // Data state
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExportInvoices = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      setExportError("");
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/v1/billing/export${qs}`;
      const defaultFilename = `medcare-invoices-${new Date().toISOString().split("T")[0]}.csv`;
      await downloadExport(url, defaultFilename);
    } catch (err) {
      console.error("Failed to export invoices:", err);
      setExportError(err.message || "Failed to export invoices CSV.");
    } finally {
      setExporting(false);
    }
  };

  // Ref to track latest request to prevent race conditions
  const requestIdRef = useRef(0);

  // Debounce search input by 300ms to avoid excessive API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  /**
   * Fetch invoices from backend via billingService.
   */
  const loadInvoices = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError("");

    try {
      const filters = {
        page: currentPage,
        limit: pageSize,
      };

      if (debouncedSearch) {
        filters.invoiceNumber = debouncedSearch;
      }

      if (statusFilter && statusFilter !== "All") {
        filters.status = statusFilter;
      }

      if (startDate) {
        filters.startDate = startDate;
      }

      if (endDate) {
        filters.endDate = endDate;
      }

      const response = await getInvoices(filters);

      // Only update state if this is still the most recent request
      if (currentRequestId === requestIdRef.current) {
        let invoiceList = [];
        if (Array.isArray(response)) {
          invoiceList = response;
        } else if (Array.isArray(response?.data)) {
          invoiceList = response.data;
        } else if (Array.isArray(response?.invoices)) {
          invoiceList = response.invoices;
        }

        setInvoices(invoiceList);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.warn("Failed to load invoices:", err.message);
        setInvoices([]);
        setError(
          err.message ||
            "Failed to load invoices. Please make sure the backend API is running."
        );
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, debouncedSearch, statusFilter, startDate, endDate]);

  // Trigger data fetch when parameters change
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Handlers for filter controls (reset pagination to page 1)
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setCurrentPage(1);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("All");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const isFiltered =
    Boolean(searchTerm) ||
    statusFilter !== "All" ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Billing &amp; Invoices</h2>
          <p>Manage patient billing records, invoices, and payment statuses.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportInvoices}
            disabled={loading || exporting}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="download" size={15} /> {exporting ? "Exporting..." : "Export CSV"}
          </button>
          {canCreateInvoice && (
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/billing/invoices/create")}
            >
              + Create Invoice
            </button>
          )}
        </div>
      </div>

      {exportError && (
        <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
          <Icon name="warning" size={16} inline style={{ marginRight: "6px" }} />
          {exportError}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <section className="dashboard-section">
          <div className="empty-state">
            <p>Loading invoices...</p>
          </div>
        </section>
      )}

      {/* Error State with Retry Button */}
      {error && !loading && (
        <section className="dashboard-section">
          <div className="empty-state" style={{ padding: "36px 20px" }}>
            <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>Unable to load billing data</h3>
            <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto 20px" }}>{error}</p>
            <button
              type="button"
              className="primary-button"
              onClick={loadInvoices}
            >
              Try Again
            </button>
          </div>
        </section>
      )}

      {/* Main Billing Table Section */}
      <section className="dashboard-section">
        {/* Toolbar with Search, Status Filter, and Date Range */}
        <div className="billing-toolbar">
          <div className="search-field" style={{ minWidth: "220px" }}>
            <label htmlFor="invoice-search">Search Invoices</label>
            <input
              id="invoice-search"
              type="search"
              value={searchTerm}
              placeholder="Search invoice number..."
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="start-date">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="end-date">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
            />
          </div>

          {isFiltered && (
            <div style={{ alignSelf: "flex-end", paddingBottom: "2px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleClearFilters}
                style={{ height: "42px", padding: "0 14px" }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Invoice Data Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>
                        {invoice.invoiceNumber || `INV-${invoice.id}`}
                      </strong>
                    </td>

                    <td>
                      <strong>{invoice.patientName || "Unknown"}</strong>
                      {invoice.patientCode && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#6b7280",
                            marginTop: "2px",
                          }}
                        >
                          {invoice.patientCode}
                        </span>
                      )}
                    </td>

                    <td>{formatDate(invoice.invoiceDate)}</td>

                    <td>{formatDate(invoice.dueDate)}</td>

                    <td>
                      <strong>{formatCurrency(invoice.totalAmount)}</strong>
                    </td>

                    <td style={{ color: "#16a34a" }}>
                      {formatCurrency(invoice.paidAmount)}
                    </td>

                    <td
                      style={{
                        fontWeight: Number(invoice.balanceAmount) > 0 ? "600" : "normal",
                        color: Number(invoice.balanceAmount) > 0 ? "#dc2626" : "#4b5563",
                      }}
                    >
                      {formatCurrency(invoice.balanceAmount)}
                    </td>

                    <td>
                      <StatusBadge status={invoice.status} />
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            navigate(`/billing/invoices/${invoice.id}`)
                          }
                          aria-label={`View invoice ${invoice.invoiceNumber || invoice.id}`}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && !error && (
                  <tr>
                    <td colSpan="9" className="empty-state">
                      <strong>No invoices found</strong>
                      <p>
                        {isFiltered
                          ? "No invoices match your current filters."
                          : "There are currently no invoice records in the system."}
                      </p>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="pagination-container">
          <p className="pagination-info">
            Page {currentPage}
            {invoices.length > 0 && ` • Showing ${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`}
          </p>

          <div className="pagination-controls">
            <button
              type="button"
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </button>

            <button
              type="button"
              className="active-page"
              aria-current="page"
              style={{ cursor: "default" }}
            >
              {currentPage}
            </button>

            <button
              type="button"
              disabled={invoices.length < pageSize || loading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Billing;
