import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";

import Patients from "./pages/Patients";
import AddPatient from "./pages/AddPatient";
import EditPatient from "./pages/EditPatient";

import Doctors from "./pages/Doctors";
import AddDoctor from "./pages/AddDoctor";
import EditDoctor from "./pages/EditDoctor";

import Appointments from "./pages/Appointments";
import AddAppointment from "./pages/AddAppointment";
import EditAppointment from "./pages/EditAppointment";

import Prescriptions from "./pages/Prescriptions";
import AddPrescription from "./pages/AddPrescription";
import EditPrescription from "./pages/EditPrescription";
import PrescriptionDetails from "./pages/PrescriptionDetails";

import MedicalRecords from "./pages/MedicalRecords";
import AddMedicalRecord from "./pages/AddMedicalRecord";
import MedicalRecordDetails from "./pages/MedicalRecordDetails";
import EditMedicalRecord from "./pages/EditMedicalRecord";

import Departments from "./pages/Departments";
import AddDepartment from "./pages/AddDepartment";
import EditDepartment from "./pages/EditDepartment";

import Staff from "./pages/Staff";
import AddStaff from "./pages/AddStaff";
import StaffDetails from "./pages/StaffDetails";
import EditStaff from "./pages/EditStaff";

import Admissions from "./pages/Admissions";
import AddAdmission from "./pages/AddAdmission";
import EditAdmission from "./pages/EditAdmission";

import Billing from "./pages/Billing";
import CreateInvoice from "./pages/CreateInvoice";
import InvoiceDetails from "./pages/InvoiceDetails";

import Pharmacy from "./pages/Pharmacy";
import AddMedicine from "./pages/AddMedicine";
import AddBatch from "./pages/AddBatch";
import DispenseMedicine from "./pages/DispenseMedicine";
import MedicineDetails from "./pages/MedicineDetails";
import EditMedicine from "./pages/EditMedicine";
import DispensationHistory from "./pages/DispensationHistory";
import LowStock from "./pages/LowStock";

import Laboratory from "./pages/Laboratory";
import CreateLabOrder from "./pages/CreateLabOrder";
import LabOrderDetails from "./pages/LabOrderDetails";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";

/**
 * Route guard component for authenticated pages.
 * - Displays a loading indicator while session bootstrap is in progress.
 * - Redirects unauthenticated visitors to /login, preserving the attempted location.
 * - If allowedRoles is specified, checks whether user.role is in allowedRoles;
 *   redirects unauthorized users to fallbackPath.
 * - Wraps protected content within the HMS AppLayout.
 */
function ProtectedRoute({ children, allowedRoles, fallbackPath = "/dashboard" }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          color: "#4b5563",
          fontFamily: "Arial, Helvetica, sans-serif",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid #e5e7eb",
            borderTop: "3px solid #2563eb",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>
          Verifying session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

/**
 * Public Route guard for Login page:
 * - If already authenticated, redirects directly to intended page or /dashboard.
 * - Otherwise renders the Login page without AppLayout.
 */
function PublicLoginRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    const returnTo = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={returnTo} replace />;
  }

  return <Login />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login Route — NOT wrapped in AppLayout */}
          <Route path="/login" element={<PublicLoginRoute />} />

          {/* Root Route — Redirects to /dashboard if authenticated, else /login */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Patients */}
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <Patients />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients/add"
            element={
              <ProtectedRoute>
                <AddPatient />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients/edit/:id"
            element={
              <ProtectedRoute>
                <EditPatient />
              </ProtectedRoute>
            }
          />

          {/* Doctors */}
          <Route
            path="/doctors"
            element={
              <ProtectedRoute>
                <Doctors />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctors/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]} fallbackPath="/doctors">
                <AddDoctor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctors/edit/:id"
            element={
              <ProtectedRoute allowedRoles={["admin"]} fallbackPath="/doctors">
                <EditDoctor />
              </ProtectedRoute>
            }
          />

          {/* Appointments */}
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointments/add"
            element={
              <ProtectedRoute>
                <AddAppointment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointments/edit/:id"
            element={
              <ProtectedRoute>
                <EditAppointment />
              </ProtectedRoute>
            }
          />

          {/* Prescriptions */}
          <Route
            path="/prescriptions"
            element={
              <ProtectedRoute>
                <Prescriptions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/prescriptions/add"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor"]} fallbackPath="/prescriptions">
                <AddPrescription />
              </ProtectedRoute>
            }
          />

          <Route
            path="/prescriptions/:id"
            element={
              <ProtectedRoute>
                <PrescriptionDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/prescriptions/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor"]} fallbackPath="/prescriptions">
                <EditPrescription />
              </ProtectedRoute>
            }
          />

          {/* Medical Records */}
          <Route
            path="/medical-records"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <MedicalRecords />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medical-records/add"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor"]} fallbackPath="/medical-records">
                <AddMedicalRecord />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medical-records/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <MedicalRecordDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medical-records/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor"]} fallbackPath="/medical-records">
                <EditMedicalRecord />
              </ProtectedRoute>
            }
          />

          {/* Departments */}
          <Route
            path="/departments"
            element={
              <ProtectedRoute>
                <Departments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/departments/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]} fallbackPath="/departments">
                <AddDepartment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/departments/edit/:id"
            element={
              <ProtectedRoute allowedRoles={["admin"]} fallbackPath="/departments">
                <EditDepartment />
              </ProtectedRoute>
            }
          />

          {/* Staff */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <Staff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]} fallbackPath="/staff">
                <AddStaff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <StaffDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin"]} fallbackPath="/staff">
                <EditStaff />
              </ProtectedRoute>
            }
          />

          {/* Admissions */}
          <Route
            path="/admissions"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admissions/add"
            element={
              <ProtectedRoute>
                <AddAdmission />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admissions/edit/:id"
            element={
              <ProtectedRoute>
                <EditAdmission />
              </ProtectedRoute>
            }
          />

          {/* Billing */}
          <Route
            path="/billing"
            element={
              <ProtectedRoute allowedRoles={["admin", "receptionist", "doctor"]}>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/create"
            element={
              <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                <CreateInvoice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "receptionist", "doctor"]}>
                <InvoiceDetails />
              </ProtectedRoute>
            }
          />

          {/* Pharmacy */}
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <Pharmacy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AddMedicine />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/batches/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AddBatch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/dispense"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <DispenseMedicine />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/medicines/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <MedicineDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/medicines/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <EditMedicine />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/dispensations"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <DispensationHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/low-stock"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <LowStock />
              </ProtectedRoute>
            }
          />

          {/* Laboratory */}
          <Route
            path="/laboratory"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <Laboratory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laboratory/orders/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor"]}>
                <CreateLabOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laboratory/orders/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <LabOrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "receptionist"]}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
