import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";

import { getPatients } from "../services/patientService";
import { getDepartments } from "../services/departmentService";
import { getDoctors } from "../services/doctorService";
import { getAppointments } from "../services/appointmentService";
import { getSummary } from "../services/reportService";
import {
  LineAreaChart,
  BarChart,
  DonutChart,
  FinancialBarChart,
  ChartSkeleton,
} from "../components/AnalyticsCharts";

function Dashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [patientData, departmentData, doctorData, appointmentData, summaryRes] =
        await Promise.all([
          getPatients(),
          getDepartments(),
          getDoctors(),
          getAppointments(),
          getSummary().catch(() => null),
        ]);

      setPatients(Array.isArray(patientData) ? patientData : []);
      setDepartments(Array.isArray(departmentData) ? departmentData : []);
      setDoctors(Array.isArray(doctorData) ? doctorData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setSummaryData(summaryRes || null);
      setError("");
    } catch (err) {
      console.warn("Dashboard data from REST API unavailable:", err.message);
      setError(err.message || "Failed to load dashboard data");
      setPatients([]);
      setDepartments([]);
      setDoctors([]);
      setAppointments([]);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalPatients = patients.length;
  const totalDepartments = departments.length;
  const totalDoctors = doctors.length;
  const totalAppointments = appointments.length;

  return (
    <div>
      <div className="page-heading">
        <h2>Dashboard</h2>
        <p>Welcome to MedCare Hospital Management & Analytics System.</p>
      </div>

      {error && (
        <div
          className="dashboard-section"
          style={{
            borderLeft: "4px solid #f59e0b",
            backgroundColor: "#fffbeb",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 6px 0", color: "#92400e", fontSize: "16px" }}>
                Backend API Notice
              </h3>
              <p style={{ margin: 0, color: "#78350f", fontSize: "14px" }}>
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={loadDashboardData}
              style={{
                padding: "8px 16px",
                backgroundColor: "#d97706",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "14px",
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Stat Cards */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => navigate("/patients")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/patients");
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Total Patients: ${totalPatients}. Click to view patients.`}
        >
          <div className="stat-icon" aria-hidden="true"><Icon name="patients" size={20} /></div>
          <p>Total Patients</p>
          <h3>{totalPatients}</h3>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate("/doctors")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/doctors");
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Total Doctors: ${totalDoctors}. Click to view doctors.`}
        >
          <div className="stat-icon" aria-hidden="true"><Icon name="stethoscope" size={20} /></div>
          <p>Doctors</p>
          <h3>{totalDoctors}</h3>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate("/appointments")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/appointments");
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Total Appointments: ${totalAppointments}. Click to view appointments.`}
        >
          <div className="stat-icon" aria-hidden="true"><Icon name="calendar" size={20} /></div>
          <p>Appointments</p>
          <h3>{totalAppointments}</h3>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate("/departments")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/departments");
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Total Departments: ${totalDepartments}. Click to view departments.`}
        >
          <div className="stat-icon" aria-hidden="true"><Icon name="hospital" size={20} /></div>
          <p>Departments</p>
          <h3>{totalDepartments}</h3>
        </div>
      </div>

      {/* Interactive Visual Analytics Charts Grid */}
      <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
        {/* 1. Patient Registration Trend */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <LineAreaChart
              title="Patient Registration Trend"
              description="Monthly volume of new registered patients."
              data={summaryData?.patientTrends || []}
              xKey="month"
              yKey="count"
              yLabel="New Patients"
              color="#2563eb"
            />
          )}
        </section>

        {/* 2. Appointment Status Distribution */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <DonutChart
              title="Appointment Status Breakdown"
              description="Distribution of patient appointment statuses."
              data={summaryData?.appointmentDistribution || []}
              nameKey="status"
              valueKey="count"
              colors={["#16a34a", "#2563eb", "#dc2626", "#d97706"]}
            />
          )}
        </section>

        {/* 3. Department Medical Distribution */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <BarChart
              title="Doctors by Clinical Department"
              description="Active physician distribution across hospital departments."
              data={summaryData?.departmentDistribution || []}
              xKey="department"
              yKey="count"
              yLabel="Physicians"
              color="#0f766e"
            />
          )}
        </section>

        {/* 4. Financial & Billing Overview */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <FinancialBarChart
              title="Revenue & Billing Collections"
              description="Monthly comparison of billed total, collected payments, and balance due."
              data={summaryData?.revenueTrends || []}
            />
          )}
        </section>

        {/* 5. Inpatient Admission Status */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <DonutChart
              title="Inpatient Admission Status"
              description="Active admitted vs discharged patient status."
              data={summaryData?.admissionStatusDistribution || []}
              nameKey="status"
              valueKey="count"
              colors={["#2563eb", "#16a34a", "#d97706"]}
            />
          )}
        </section>

        {/* 6. Laboratory Diagnostic Order Status */}
        <section className="dashboard-section" style={{ margin: 0 }}>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <DonutChart
              title="Laboratory Diagnostic Orders"
              description="Processing status for diagnostic laboratory orders."
              data={summaryData?.laboratoryStatusDistribution || []}
              nameKey="status"
              valueKey="count"
              colors={["#16a34a", "#0284c7", "#d97706", "#dc2626"]}
            />
          )}
        </section>
      </div>

      {/* Operational System Health Overview */}
      <section className="dashboard-section" style={{ marginTop: "24px" }}>
        <div className="section-header">
          <div>
            <h3>System Health & Core Services</h3>
            <p>Real-time operational status for core hospital management modules.</p>
          </div>
        </div>

        <div className="development-list">
          <div>
            <span>Patient Records</span>
            <strong className="success-text">Operational</strong>
          </div>

          <div>
            <span>Doctor Directory</span>
            <strong className="success-text">Operational</strong>
          </div>

          <div>
            <span>Appointment Scheduling</span>
            <strong className="success-text">Operational</strong>
          </div>

          <div>
            <span>Clinical Departments</span>
            <strong className="success-text">Operational</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
