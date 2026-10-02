# MedCare Hospital Management System (HMS) — CodeCanyon Submission Copy & Metadata

**Document Purpose:** Ready-to-use copy, item description, and metadata for author submission on Envato Market / CodeCanyon.  
**Product Name:** MedCare Hospital Management System (HMS)  
**Current Release Version:** v1.0.0  
**Source Package:** `/app/applet/MedCare-HMS-v1.0.0.zip`

---

## 1. Product Title
**MedCare — Hospital Management System (React, Express & PostgreSQL)**

---

## 2. Short Description
MedCare HMS is an enterprise-grade, modern healthcare and clinical operations platform built with React 18, Node.js/Express, and PostgreSQL. It features high-density clinical dashboards, electronic health records (EHR), multi-role RBAC, appointment scheduling, printable A4 invoices and lab reports, pharmacy batch inventory, and automated setup diagnostics.

---

## 3. Full Item Description (Marketplace HTML/Markdown Formatted)

```html
<h2>MedCare — Enterprise Hospital Management System (HMS)</h2>
<p>
  <strong>MedCare HMS</strong> is a comprehensive, production-grade Hospital & Clinic Management platform engineered for modern healthcare providers, multi-specialty hospitals, outpatient clinics, and medical centers.
</p>
<p>
  Built on modern technologies—<strong>React 18</strong>, <strong>Express.js</strong>, and a robust <strong>PostgreSQL relational database</strong>—MedCare delivers clinical clarity, sub-second response times, and an intuitive, WCAG-compliant design system.
</p>

<hr>

<h3>🌟 Key Highlights</h3>
<ul>
  <li><strong>Complete Clinical Workflow:</strong> From patient registration and tokenized appointment scheduling to inpatient admissions, digital prescriptions, lab orders, and pharmacy dispensations.</li>
  <li><strong>Enterprise Security Architecture:</strong> Session-based authentication with PostgreSQL persistence (<code>connect-pg-simple</code>), HttpOnly cookies, double-submit cookie CSRF defense, rate limiting, Helmet security headers, and parameterized SQL queries.</li>
  <li><strong>Multi-Role Access Control (RBAC):</strong> Granular permission guards for Administrators, Doctors, Receptionists, and Pharmacists.</li>
  <li><strong>Printable A4 Documents:</strong> High-fidelity, print-ready templates for Hospital Invoices, Doctor Prescriptions, and Laboratory Diagnostic Reports with auto-calculated biological reference ranges.</li>
  <li><strong>Buyer Diagnostic Checker:</strong> Built-in <code>npm run setup:check</code> tool to verify environment compatibility, PostgreSQL connectivity, all 23 database tables, and sequence generators in seconds.</li>
  <li><strong>Design System & Figma Parity:</strong> Centralized CSS token architecture with documented UI kit specifications (<code>FIGMA_UI_KIT.md</code>) and responsive mobile/tablet viewports.</li>
</ul>

<hr>

<h3>🏥 Core Modules & Capabilities</h3>

<h4>1. Executive Clinical Dashboard</h4>
<ul>
  <li>Real-time KPI metrics: Total Patients, Today's Scheduled Appointments, Inpatient Bed Admissions, and Monthly Revenue.</li>
  <li>Quick Action Bar: Instant creation of patients, appointments, invoices, and lab requests.</li>
  <li>Recent activity streams, daily appointment schedules, and departmental bed occupancy distribution charts.</li>
</ul>

<h4>2. Patient Directory & Electronic Medical Records (EMR)</h4>
<ul>
  <li>Searchable patient directory with filtering by department, admission status, and blood group.</li>
  <li>Detailed medical records history: vital signs (blood pressure, pulse, temperature, SpO2, respiratory rate), clinical diagnosis, ICD-10 notes, treatment plans, and doctor observations.</li>
  <li>One-click export of patient lists to Excel (CSV) and print-ready summaries.</li>
</ul>

<h4>3. Doctor & Staff Management</h4>
<ul>
  <li>Specialty and department assignment (Cardiology, Neurology, Pediatrics, Orthopedics, Oncology, etc.).</li>
  <li>Consultation fee management, room numbers, contact info, and status toggles.</li>
  <li>Automated staff number generation (<code>STF-XXXX</code>) and staff role directory.</li>
</ul>

<h4>4. Appointment Scheduling & Calendar</h4>
<ul>
  <li>Tokenized daily scheduling system with doctor and department filters.</li>
  <li>Real-time status tracking: <code>Confirmed</code>, <code>In-Progress</code>, <code>Completed</code>, and <code>Cancelled</code>.</li>
  <li>Appointment history with direct links to medical records and prescriptions.</li>
</ul>

<h4>5. Inpatient Admissions & Bed Management</h4>
<ul>
  <li>Admission tracking with room and bed allocation.</li>
  <li>Attending doctor assignments, admission diagnosis, and discharge summaries with automated duration calculation.</li>
</ul>

<h4>6. Pharmacy & Inventory Management</h4>
<ul>
  <li>Medicine catalog with generic name, category, and unit pricing.</li>
  <li>Batch number tracking with manufacturing and expiry date monitoring.</li>
  <li>Automated <em>Low Stock</em> and <em>Expiring Soon</em> visual warnings.</li>
  <li>Direct dispensation workflow linked to doctor prescriptions.</li>
</ul>

<h4>7. Laboratory & Diagnostics</h4>
<ul>
  <li>Comprehensive diagnostic test catalog with standard pricing and normal biological reference ranges.</li>
  <li>Lab order processing workflow: <code>Pending</code> &rarr; <code>Sample Collected</code> &rarr; <code>Completed</code>.</li>
  <li>Printable formal Laboratory Diagnostic Report.</li>
</ul>

<h4>8. Billing, Invoicing & Payments</h4>
<ul>
  <li>Consolidated hospital invoicing combining consultation fees, laboratory tests, and pharmacy medicines.</li>
  <li>Automated 5% tax computation and discount handling.</li>
  <li>Partial and full payment recording with printable A4 hospital receipt.</li>
</ul>

<h4>9. System Settings & Hospital Profile</h4>
<ul>
  <li>Hospital branding: Name, Address, Emergency Contact, Email, Tax Identification, and Currency (USD, EUR, GBP, INR, etc.).</li>
  <li>User and account management with active/inactive status controls and role reassignments.</li>
  <li>Comprehensive security audit log recording system logins, patient record updates, and financial operations.</li>
</ul>
```

---

## 4. Feature List
- **Full-Stack Single Page Application (SPA):** High-performance React 18 client paired with Node.js/Express RESTful backend.
- **Relational PostgreSQL Architecture:** 23 normalized tables with foreign keys, check constraints, cascade protections, and 9 business document sequence generators.
- **Enterprise RBAC:** Dedicated roles for `ADMIN`, `DOCTOR`, `RECEPTIONIST`, and `PHARMACIST`.
- **Deterministic Number Sequencing:** Unique document formatting for Patients (`PAT-XXXX`), Invoices (`INV-XXXX`), Prescriptions (`RX-XXXX`), Staff (`STF-XXXX`), and Lab Orders (`LAB-XXXX`).
- **Comprehensive Automated Tests:** 435 unit, integration, and security tests across 83 test suites (`npm test`).
- **Zero Heavy External UI Frameworks:** Clean, responsive design tokens with lightweight CSS custom properties and localized accessible SVGs.
- **Dark/Light Accessible Palette:** High contrast ratios complying with WCAG AA accessibility standards.
- **Figma UI Kit Documentation:** Component anatomy, spacing scales, typography hierarchy, and color tokens documented in `FIGMA_UI_KIT.md`.

---

## 5. Complete Module List
1. **Authentication & Session Management** (Login, Logout, Session Expiry, Role Guards)
2. **Clinical Dashboard & KPI Analytics** (Metrics, Charts, Quick Actions)
3. **Patient Management** (Directory, Registration, Demographics, Export)
4. **Doctor Management** (Profiles, Specialties, Consultation Fees, Schedules)
5. **Department Management** (Medical Departments, Heads, Room Allocations)
6. **Appointment Management** (Token Queue, Scheduling, Status Lifecycle)
7. **Inpatient Admissions** (Bed Tracking, Inpatient Care, Discharge Summaries)
8. **Digital Prescriptions** (Medication Dosage, Frequency, Duration, Instructions)
9. **Electronic Medical Records** (Vital Signs, Diagnoses, Clinical Notes)
10. **Staff Management** (Staff Directory, Roles, Auto-Generated Staff IDs)
11. **Billing & Invoicing** (Multi-Item Invoices, Tax Calculation, Payment History)
12. **Pharmacy & Medicine Inventory** (Stock Tracking, Batch Numbers, Expiry Alerts, Dispensation)
13. **Laboratory Management** (Test Catalog, Order Tracking, Diagnostic Results Drawer)
14. **Notification System** (Real-Time Clinical & Administrative Alerts)
15. **Financial & Operational Reports** (Revenue Trends, Patient Volumes, Department Occupancy)
16. **Security Audit Logs** (Immutable Action Tracking, IP Logging, Timestamps)
17. **User & Account Management** (Credential Provisioning, Role Assignment, Account Lock/Unlock)
18. **Hospital Profile & System Configuration** (Hospital Info, Currency, Tax Rate, Preferences)

---

## 6. Security Features
- **Session-Based Authentication:** Secure session handling via PostgreSQL table storage (`connect-pg-simple`) with `HttpOnly` and `SameSite` cookies.
- **CSRF Protection:** Double-submit cookie pattern with custom header verification for state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Password Hashing:** Industry-standard `bcrypt` hashing with salt rounds.
- **SQL Injection Prevention:** 100% parameterized queries via `pg` pool queries (no raw string interpolation).
- **HTTP Security Headers:** Integrated `helmet` middleware enforcing CSP, X-Frame-Options, and HSTS.
- **Rate Limiting:** IP-based request throttling (`express-rate-limit`) on sensitive authentication routes.
- **Role-Based Middleware Guards:** Route-level RBAC verifying user roles before granting API access.
- **Audit Logging:** Database-backed audit trail logging user identity, IP address, action type, and timestamp for all critical mutations.

---

## 7. Technology Stack
- **Frontend:** React 18, React Router v7, Vite 8, Modern CSS Custom Properties / Design Tokens
- **Backend:** Node.js (v20+ LTS), Express.js 5
- **Database:** PostgreSQL (v14+)
- **Build Tools:** Vite, Esbuild, TypeScript (type checking)
- **Testing:** Node.js Native Test Runner, Supertest (435 automated tests)
- **Linting:** Oxlint (zero errors)

---

## 8. Buyer System Requirements
- **Node.js:** v20.0.0 LTS or higher
- **PostgreSQL Database:** v14.0 or higher
- **Package Manager:** `npm` (included with Node.js)
- **Supported Operating Systems:** Linux (Ubuntu, Debian, CentOS), macOS, Windows Server

---

## 9. Demo Information & Credentials

MedCare HMS comes with automated seed scripts (`npm run db:seed`) providing fictional, HIPAA-compliant demo data for immediate testing.

| Role | Username | Demo Password | Primary Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Demo@1234` | Full access to all clinical, financial, settings, and user management modules |
| **Doctor** | `dr.sarah` | `Demo@1234` | Access to patients, appointments, medical records, prescriptions, and lab orders |
| **Receptionist** | `receptionist` | `Demo@1234` | Access to patient registration, appointment booking, and admissions |

*(Note: In production environments, administrators are advised to change default passwords and configure a unique `SESSION_SECRET` in `.env`)*

---

## 10. Buyer Installation Summary

1. **Extract Archive:** Unzip `MedCare-HMS-v1.0.0.zip`.
2. **Install Dependencies:** Run `npm install`.
3. **Configure Environment:** Copy `.env.example` to `.env` and set your PostgreSQL credentials and `SESSION_SECRET`.
4. **Initialize Database:** Run `npm run db:init` (or `npm run db:seed` to include demo data).
5. **Verify Installation:** Run `npm run setup:check` to run the 6-point automated diagnostic check.
6. **Start Application:**
   - Development mode: `npm run dev`
   - Production mode: `npm run build && npm start`

*For full, detailed instructions, refer to `INSTALLATION.md` included in the root folder.*

---

## 11. Customization & Theming
- **Hospital Profile:** Hospital name, contact details, currency symbol, and tax rates can be updated directly from the UI (*Settings > Hospital Profile*).
- **Design Tokens:** Primary colors, secondary accents, typography scales, spacing units, and border radii can be customized in `src/App.css`.
- **Figma Design System:** Refer to `FIGMA_UI_KIT.md` and `DESIGN_SYSTEM.md` to customize UI components in Figma.

---

## 12. Support & Troubleshooting
- A dedicated troubleshooting guide is included in `TROUBLESHOOTING.md` covering database connection errors, session issues, port conflicts, and migration assistance.
- For buyer inquiries, contact author support via the CodeCanyon author profile page.

---

## 13. License & Third-Party Notices
- Distributed under standard Envato CodeCanyon licenses (Regular License / Extended License).
- All bundled third-party libraries use commercially permissive open-source licenses (MIT, Apache 2.0, BSD, ISC) documented in `LICENSE_NOTICES.md`.

---

## 14. Changelog & Release Notes
- **Version 1.0.0 (Initial Release):**
  - Complete 18-module Hospital Management System.
  - Relational PostgreSQL schema with 23 tables and 9 sequence generators.
  - Full RBAC integration for Admin, Doctor, Receptionist, and Pharmacist.
  - Printable A4 Invoices, Prescriptions, and Lab Reports.
  - Automated diagnostic tool `setup_check.cjs`.
  - 435 automated test suites verified.

---

## 15. Marketplace Tags
`hospital management`, `clinic management`, `medical records`, `electronic health records`, `ehr`, `hospital billing`, `doctor appointments`, `pharmacy inventory`, `laboratory system`, `react hospital`, `nodejs postgresql`, `patient management`, `healthcare portal`, `hms`

---

## 16. CodeCanyon Category
- **Category:** `JavaScript > Full Applications`  
*(Verify against the current CodeCanyon category selector before submission)*

---

## 17. Live Demo
**Live demo:** To be provided after deployment.

---

## 18. Promotional Screenshots & Preview Assets
The visual assets in `/marketplace_assets/` are ready for submission:
- `01_codecanyon_main_preview.jpg` — Main Item Preview Banner (1920 × 1080 px)
- `02_codecanyon_item_thumbnail.jpg` — Item Thumbnail Icon (1024 × 1024 px)
- `screenshot_01_login.jpg` — Login & Demo Quick-Select
- `screenshot_02_dashboard.jpg` — Clinical KPI Dashboard
- `screenshot_03_patients.jpg` — Patient Directory & EMR
- `screenshot_04_appointments.jpg` — Appointment Scheduler & Doctor Calendar
- `screenshot_05_billing.jpg` — Billing & Printable A4 Invoice
- `screenshot_06_pharmacy.jpg` — Pharmacy & Stock Alerts
- `screenshot_07_laboratory.jpg` — Diagnostic Lab Orders & Reports
- `screenshot_08_reports.jpg` — Financial & Occupancy Analytics
- `screenshot_09_settings.jpg` — Hospital Settings & RBAC User Roles
- `screenshot_10_mobile.jpg` — Responsive Mobile/Tablet Interface

---

## 19. Author Pre-Submission Checklist
- [x] **Downloadable ZIP Ready:** `/app/applet/MedCare-HMS-v1.0.0.zip` (565 KB, clean, zero secrets/node_modules).
- [x] **Documentation Complete:** 15 comprehensive guides included in release archive.
- [x] **Code Quality & Tests:** 435 tests passing, production build passing (`npm run build`).
- [x] **Marketplace Visual Assets:** 12 master preview and screenshot assets organized in `/marketplace_assets/`.
- [x] **Submission Copy & Metadata:** `CODECANYON_SUBMISSION_COPY.md` finalized.
- [ ] **Live Demo URL:** Host public instance and add URL into submission form (Pending external hosting).
- [ ] **Envato Author Account:** Log in to CodeCanyon author portal and submit item (Pending author action).
