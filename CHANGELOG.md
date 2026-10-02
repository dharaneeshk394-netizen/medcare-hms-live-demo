# MedCare Hospital Management System (HMS) — Changelog

All notable changes to MedCare HMS are documented in this file.

---

## [1.0.0] — 2026-10-01
### Initial Commercial Release
- **Core Architecture**: Full-stack React 19 + Express + PostgreSQL architecture.
- **Authentication & RBAC**: Secure session authentication with role-based access control for Administrator, Doctor, and Receptionist roles.
- **Patient & Admission Management**: Patient registration, profile records, inpatient ward/bed admissions, and discharge tracking.
- **Clinical Modules**: Doctors directory, department management, outpatient appointments scheduling, prescriptions with medication items, and clinical medical records.
- **Diagnostic & Pharmacy**: Laboratory test catalog, lab orders, result recording, medicine inventory, batch tracking, and pharmacy dispensation.
- **Billing & Financials**: Itemized invoicing, payment collection, balance tracking, and financial summary reporting.
- **Admin & Reporting**: System notifications, executive reporting analytics charts, immutable audit logging, and user management console.
- **Customization & Branding**: Hospital profile settings, logo management, tax rates, currency formatting, and document header/footer customization.
- **Print & Export**: Dedicated A4 print stylesheets for invoices, prescriptions, and lab reports, plus RFC 4180 CSV data exports.
- **Design System & UI/UX**: Centralized CSS design tokens, Figma UI kit specification, accessible components, and responsive mobile/tablet layouts.
- **Setup & Diagnostics**: Automated setup diagnostic checker (`npm run setup:check`) and idempotent demo database seed scripts.
