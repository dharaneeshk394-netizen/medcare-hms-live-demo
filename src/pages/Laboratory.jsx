import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { getLabOrders, getLabTests, createLabTest } from "../services/labService";
import { downloadExport } from "../utils/exportUtils";


function formatDoctorName(name) {
  if (!name || name === "—") return "General Physician";
  const trimmed = name.trim();
  if (/^Dr\.?\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

function Laboratory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role ? String(user.role).toLowerCase() : "";
  const canCreateOrder = ["admin", "doctor"].includes(userRole);
  const isAdmin = userRole === "admin";

  // Tab State: "orders" or "catalog"
  const [activeTab, setActiveTab] = useState("orders");

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [orderPriorityFilter, setOrderPriorityFilter] = useState("All");

  // Catalog State
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testsError, setTestsError] = useState("");
  const [testSearch, setTestSearch] = useState("");
  const [testCategoryFilter, setTestCategoryFilter] = useState("All");

  // Modal State for Admin Add Test Catalog
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    category: "Hematology",
    sampleType: "Blood",
    referenceRange: "",
    unit: "",
    price: "",
    turnaroundHours: "24",
  });
  const [addTestError, setAddTestError] = useState("");
  const [isAddingTest, setIsAddingTest] = useState(false);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExportOrders = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      setExportError("");
      const params = new URLSearchParams();
      if (debouncedOrderSearch) params.append("search", debouncedOrderSearch);
      if (orderStatusFilter && orderStatusFilter !== "All") params.append("status", orderStatusFilter);
      if (orderPriorityFilter && orderPriorityFilter !== "All") params.append("priority", orderPriorityFilter);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/v1/lab/export${qs}`;
      const defaultFilename = `medcare-lab-orders-${new Date().toISOString().split("T")[0]}.csv`;
      await downloadExport(url, defaultFilename);
    } catch (err) {
      console.error("Failed to export lab orders:", err);
      setExportError(err.message || "Failed to export laboratory orders CSV.");
    } finally {
      setExporting(false);
    }
  };

  const orderRequestIdRef = useRef(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrderSearch(orderSearch.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [orderSearch]);

  // Load Orders
  const loadOrders = useCallback(async () => {
    const reqId = ++orderRequestIdRef.current;
    setLoadingOrders(true);
    setOrdersError("");

    try {
      const data = await getLabOrders({
        search: debouncedOrderSearch,
        status: orderStatusFilter,
        priority: orderPriorityFilter,
      });

      if (reqId === orderRequestIdRef.current) {
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (reqId === orderRequestIdRef.current) {
        console.error("Failed to load lab orders:", err);
        setOrdersError(err.message || "Failed to load lab orders.");
      }
    } finally {
      if (reqId === orderRequestIdRef.current) {
        setLoadingOrders(false);
      }
    }
  }, [debouncedOrderSearch, orderStatusFilter, orderPriorityFilter]);

  // Load Tests
  const loadTests = useCallback(async () => {
    setLoadingTests(true);
    setTestsError("");

    try {
      const data = await getLabTests({
        search: testSearch,
        category: testCategoryFilter,
      });
      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load lab tests:", err);
      setTestsError(err.message || "Failed to load test catalog.");
    } finally {
      setLoadingTests(false);
    }
  }, [testSearch, testCategoryFilter]);

  useEffect(() => {
    if (activeTab === "orders") {
      loadOrders();
    } else {
      loadTests();
    }
  }, [activeTab, loadOrders, loadTests]);

  const handleCreateTestSubmit = async (e) => {
    e.preventDefault();
    setAddTestError("");

    if (!newTest.name.trim()) {
      setAddTestError("Test name is required.");
      return;
    }
    if (!newTest.category.trim()) {
      setAddTestError("Category is required.");
      return;
    }
    if (!newTest.sampleType.trim()) {
      setAddTestError("Sample type is required.");
      return;
    }

    const priceVal = parseFloat(newTest.price);
    if (Number.isNaN(priceVal) || priceVal < 0) {
      setAddTestError("Price must be a valid non-negative number.");
      return;
    }

    const hoursVal = parseInt(newTest.turnaroundHours, 10);
    if (Number.isNaN(hoursVal) || hoursVal < 1) {
      setAddTestError("Turnaround time must be at least 1 hour.");
      return;
    }

    try {
      setIsAddingTest(true);
      await createLabTest({
        name: newTest.name.trim(),
        category: newTest.category.trim(),
        sampleType: newTest.sampleType.trim(),
        referenceRange: newTest.referenceRange.trim() || null,
        unit: newTest.unit.trim() || null,
        price: priceVal,
        turnaroundHours: hoursVal,
        status: "ACTIVE",
      });

      setShowAddTestModal(false);
      setNewTest({
        name: "",
        category: "Hematology",
        sampleType: "Blood",
        referenceRange: "",
        unit: "",
        price: "",
        turnaroundHours: "24",
      });
      await loadTests();
    } catch (err) {
      console.error("Failed to add test to catalog:", err);
      setAddTestError(err.message || "Failed to add test to catalog.");
    } finally {
      setIsAddingTest(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "STAT":
        return { backgroundColor: "#fee2e2", color: "#991b1b", border: "1px solid #f87171" };
      case "Urgent":
        return { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
    }
  };

  return (
    <div>
      {/* Page Heading & Main Action Buttons */}
      <div className="page-heading page-heading-with-action">
        <div>
          <h2>Laboratory Information System (LIS)</h2>
          <p>Manage diagnostic lab orders, specimen collection, test catalog, and patient results.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {activeTab === "orders" && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleExportOrders}
              disabled={loadingOrders || exporting}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Export filtered lab orders to CSV"
            >
              <Icon name="download" size={14} /> {exporting ? "Exporting..." : "Export CSV"}
            </button>
          )}
          {canCreateOrder && (
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/laboratory/orders/new")}
              title="Create new lab order"
            >
              + Create Lab Order
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowAddTestModal(true)}
              title="Add diagnostic test to catalog"
            >
              + Add Test Catalog
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={activeTab === "orders" ? loadOrders : loadTests}
            disabled={loadingOrders || loadingTests}
            title="Refresh current view"
          >
            {loadingOrders || loadingTests ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "2px solid #e5e7eb" }}>
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          style={{
            padding: "10px 20px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: "none",
            color: activeTab === "orders" ? "#1e40af" : "#4b5563",
            borderBottom: activeTab === "orders" ? "3px solid #1e40af" : "3px solid transparent",
            marginBottom: "-2px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Icon name="flask" size={16} /> Lab Orders
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          style={{
            padding: "10px 20px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: "none",
            color: activeTab === "catalog" ? "#1e40af" : "#4b5563",
            borderBottom: activeTab === "catalog" ? "3px solid #1e40af" : "3px solid transparent",
            marginBottom: "-2px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Icon name="clipboard" size={16} /> Test Catalog Directory
          </span>
        </button>
      </div>

      {/* TAB 1: LAB ORDERS */}
      {activeTab === "orders" && (
        <section className="dashboard-section">
          {exportError && (
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
              <Icon name="warning" size={16} /> {exportError}
            </div>
          )}
          {/* Toolbar */}
          <div
            className="prescription-toolbar billing-toolbar"
            style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}
          >
            <div className="search-field" style={{ minWidth: "260px", flex: 1 }}>
              <label htmlFor="lab-order-search">Search Orders</label>
              <input
                id="lab-order-search"
                type="search"
                value={orderSearch}
                placeholder="Search order #, patient name, patient ID..."
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>

            <div className="filter-field" style={{ minWidth: "160px" }}>
              <label htmlFor="order-status-filter">Status</label>
              <select
                id="order-status-filter"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="SAMPLE_COLLECTED">SAMPLE_COLLECTED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="filter-field" style={{ minWidth: "140px" }}>
              <label htmlFor="order-priority-filter">Priority</label>
              <select
                id="order-priority-filter"
                value={orderPriorityFilter}
                onChange={(e) => setOrderPriorityFilter(e.target.value)}
              >
                <option value="All">All Priorities</option>
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="STAT">STAT</option>
              </select>
            </div>
          </div>

          {/* Error Banner */}
          {ordersError && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                backgroundColor: "#fee2e2",
                border: "1px solid #f87171",
                borderRadius: "6px",
                color: "#991b1b",
                fontSize: "14px",
              }}
            >
              <strong>Error: </strong> {ordersError}
            </div>
          )}

          {/* Loading State */}
          {loadingOrders && (
            <div className="empty-state">
              <p>Loading lab orders...</p>
            </div>
          )}

          {/* Populated Orders Table */}
          {!loadingOrders && !ordersError && orders.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Patient</th>
                    <th>Requesting Doctor</th>
                    <th>Priority</th>
                    <th>Tests Count</th>
                    <th>Total Price</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600, color: "#1e40af" }}>
                        <span
                          style={{ cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => navigate(`/laboratory/orders/${o.id}`)}
                          title="View order details and results"
                        >
                          {o.orderNumber || `ORD-LAB-${String(o.id).padStart(6, "0")}`}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/laboratory/orders/${o.id}`)}
                        >
                          <strong>{o.patientName}</strong>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {o.patientCode}
                          </div>
                        </div>
                      </td>
                      <td>{o.doctorName ? formatDoctorName(o.doctorName) : "General Physician"}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            ...getPriorityStyle(o.priority),
                          }}
                        >
                          {o.priority}
                        </span>
                      </td>
                      <td>
                        <strong>{o.itemCount} test{o.itemCount !== 1 ? "s" : ""}</strong>
                      </td>
                      <td>
                        <strong style={{ color: "#1e40af" }}>
                          ${parseFloat(o.totalPrice || 0).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <StatusBadge status={o.status || "PENDING"} />
                      </td>
                      <td style={{ fontSize: "13px", color: "#4b5563" }}>
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => navigate(`/laboratory/orders/${o.id}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loadingOrders && !ordersError && orders.length === 0 && (
            <div className="empty-state">
              <p>No lab orders found matching the filter criteria.</p>
              {canCreateOrder && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate("/laboratory/orders/new")}
                  style={{ marginTop: "12px" }}
                >
                  Create First Lab Order
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: TEST CATALOG */}
      {activeTab === "catalog" && (
        <section className="dashboard-section">
          {/* Catalog Toolbar */}
          <div
            className="prescription-toolbar billing-toolbar"
            style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}
          >
            <div className="search-field" style={{ minWidth: "260px", flex: 1 }}>
              <label htmlFor="test-catalog-search">Search Diagnostic Tests</label>
              <input
                id="test-catalog-search"
                type="search"
                value={testSearch}
                placeholder="Search test name, code, category..."
                onChange={(e) => setTestSearch(e.target.value)}
              />
            </div>

            <div className="filter-field" style={{ minWidth: "180px" }}>
              <label htmlFor="test-category-filter">Category</label>
              <select
                id="test-category-filter"
                value={testCategoryFilter}
                onChange={(e) => setTestCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Hematology">Hematology</option>
                <option value="Biochemistry">Biochemistry</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Pathology">Pathology</option>
                <option value="Immunology">Immunology</option>
                <option value="Urinalysis">Urinalysis</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Error Banner */}
          {testsError && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                backgroundColor: "#fee2e2",
                border: "1px solid #f87171",
                borderRadius: "6px",
                color: "#991b1b",
                fontSize: "14px",
              }}
            >
              <strong>Error: </strong> {testsError}
            </div>
          )}

          {/* Loading State */}
          {loadingTests && (
            <div className="empty-state">
              <p>Loading test catalog...</p>
            </div>
          )}

          {/* Populated Catalog Table */}
          {!loadingTests && !testsError && tests.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Test Code</th>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Sample Type</th>
                    <th>Reference Range</th>
                    <th>Price</th>
                    <th>Turnaround</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, color: "#1e40af" }}>{t.testCode}</td>
                      <td>
                        <strong>{t.name}</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            backgroundColor: "#f3f4f6",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td>{t.sampleType}</td>
                      <td>
                        {t.referenceRange ? (
                          <span>
                            {t.referenceRange} {t.unit && `(${t.unit})`}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>-</span>
                        )}
                      </td>
                      <td>
                        <strong>${parseFloat(t.price || 0).toFixed(2)}</strong>
                      </td>
                      <td>{t.turnaroundHours} hours</td>
                      <td>
                        <StatusBadge status={t.status || "ACTIVE"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty Catalog State */}
          {!loadingTests && !testsError && tests.length === 0 && (
            <div className="empty-state">
              <p>No catalog tests found matching criteria.</p>
              {isAdmin && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowAddTestModal(true)}
                  style={{ marginTop: "12px" }}
                >
                  + Add First Test
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Admin Add Test Catalog Modal */}
      {showAddTestModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              maxWidth: "540px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Add Diagnostic Test to Catalog</h3>
              <button
                type="button"
                onClick={() => setShowAddTestModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                aria-label="Close modal"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {addTestError && (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: "16px",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #f87171",
                  borderRadius: "6px",
                  color: "#991b1b",
                  fontSize: "13px",
                }}
              >
                {addTestError}
              </div>
            )}

            <form onSubmit={handleCreateTestSubmit}>
              <div className="form-field" style={{ marginBottom: "14px" }}>
                <label htmlFor="testName">Test Name *</label>
                <input
                  id="testName"
                  type="text"
                  placeholder="e.g. Complete Blood Count (CBC)"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  disabled={isAddingTest}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label htmlFor="testCat">Category *</label>
                  <select
                    id="testCat"
                    value={newTest.category}
                    onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                    disabled={isAddingTest}
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Urinalysis">Urinalysis</option>
                    <option value="General">General</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-field" style={{ flex: 1 }}>
                  <label htmlFor="sampleType">Sample Type *</label>
                  <select
                    id="sampleType"
                    value={newTest.sampleType}
                    onChange={(e) => setNewTest({ ...newTest, sampleType: e.target.value })}
                    disabled={isAddingTest}
                  >
                    <option value="Blood">Blood</option>
                    <option value="Serum">Serum</option>
                    <option value="Plasma">Plasma</option>
                    <option value="Urine">Urine</option>
                    <option value="Swab">Swab</option>
                    <option value="Sputum">Sputum</option>
                    <option value="Stool">Stool</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                <div className="form-field" style={{ flex: 2 }}>
                  <label htmlFor="refRange">Reference Range</label>
                  <input
                    id="refRange"
                    type="text"
                    placeholder="e.g. 4.5 - 11.0"
                    value={newTest.referenceRange}
                    onChange={(e) => setNewTest({ ...newTest, referenceRange: e.target.value })}
                    disabled={isAddingTest}
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label htmlFor="unit">Unit</label>
                  <input
                    id="unit"
                    type="text"
                    placeholder="e.g. mg/dL"
                    value={newTest.unit}
                    onChange={(e) => setNewTest({ ...newTest, unit: e.target.value })}
                    disabled={isAddingTest}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label htmlFor="testPrice">Price ($) *</label>
                  <input
                    id="testPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newTest.price}
                    onChange={(e) => setNewTest({ ...newTest, price: e.target.value })}
                    disabled={isAddingTest}
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label htmlFor="turnaround">Turnaround (Hours)</label>
                  <input
                    id="turnaround"
                    type="number"
                    min="1"
                    placeholder="24"
                    value={newTest.turnaroundHours}
                    onChange={(e) => setNewTest({ ...newTest, turnaroundHours: e.target.value })}
                    disabled={isAddingTest}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddTestModal(false)}
                  disabled={isAddingTest}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isAddingTest}
                >
                  {isAddingTest ? "Adding..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Laboratory;
