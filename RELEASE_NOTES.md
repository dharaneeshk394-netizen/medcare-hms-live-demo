# MedCare Hospital Management System (HMS) — Release Notes v1.0.0

**Release Version**: `1.0.0`  
**Product**: MedCare Hospital Management System (HMS)  
**Architecture**: React 19 + Express + PostgreSQL  
**Intended Distribution**: Commercial Source-Code Product (Envato / CodeCanyon)

---

## 🚀 Major Features & Capabilities
- **Multi-Role Authentication & RBAC**: Secure session-based authentication supporting Administrator, Doctor, and Receptionist roles with fine-grained route and API protection.
- **Patient & Admission Management**: Complete patient registration, profile tracking, CSV exports, and inpatient ward/bed admission management.
- **Clinical Modules**: Doctors directory, department management, outpatient appointments scheduling, prescriptions with medication items, and clinical medical records.
- **Diagnostic & Pharmacy**: Laboratory test catalog, lab orders, result recording, medicine inventory, batch tracking, and pharmacy dispensation history.
- **Financial Ledger & Billing**: Itemized patient invoicing, payment collection, balance tracking, and summary reporting.
- **Administration & Analytics**: Real-time system notifications, executive analytics charts, immutable security audit logging, and user management console.
- **White-Label Customization**: Hospital profile settings, logo management, currency formatting, tax rates, and document header/footer configuration.
- **Professional Print & Export**: Dedicated A4 print stylesheets for invoices, prescriptions, and lab reports, plus RFC 4180 CSV exports.
- **Design System & UI/UX**: Centralized CSS design tokens, Figma UI kit specification, accessible component library, and responsive mobile/tablet layouts.
- **Buyer Setup & Diagnostics**: Automated setup diagnostic checker (`npm run setup:check`) and idempotent demo database seed scripts.

---

## 🔒 Security Architecture
- HttpOnly session cookies with SameSite and secure production transport flags.
- `bcryptjs` password hashing (password hashes strictly excluded from API responses and audit logs).
- Helmet security headers and API rate limiting on sensitive authentication routes.
- Parameterized SQL queries protecting against SQL injection.
- Immutable audit trail logging all operational and security events.

---

## 📚 Included Documentation
- `README.md`: Product overview, tech stack, and quick start guide.
- `INSTALLATION.md`: Step-by-step buyer installation instructions.
- `USER_GUIDE.md`: Comprehensive module-by-module operational guide.
- `CUSTOMIZATION.md`: White-labeling and settings configuration guide.
- `TROUBLESHOOTING.md`: Solutions for common runtime and environment issues.
- `SECURITY.md`: Security architecture and buyer deployment responsibilities.
- `LICENSE_NOTICES.md`: Third-party open-source dependency licenses.
- `ENVATO_SUBMISSION_CHECKLIST.md`: Self-review preparation checklist.
- `DESIGN_SYSTEM.md`: Design tokens and CSS custom property dictionary.
- `FIGMA_UI_KIT.md`: Complete Figma UI Kit specification and auto-layout guide.
- `CHANGELOG.md`: Development version history.

---

## ⚠️ Known Limitations & Buyer Responsibilities
- **Deployment Environment**: Buyers are responsible for securing their production PostgreSQL database, configuring environment variables (`SESSION_SECRET`), and enforcing HTTPS/SSL.
- **Demo Credentials**: Default demo user accounts (`admin`, `dr.sarah`, `receptionist`) should have their passwords changed or be disabled in live production hospital deployments.
