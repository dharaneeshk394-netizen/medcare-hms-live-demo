# MedCare Hospital Management System (HMS) — Buyer Customization Guide

This guide explains how buyers can customize MedCare HMS for their specific hospital or clinic branding.

---

## 1. Customization via the Settings UI (Recommended)
Administrators can customize core hospital identity and document formatting directly through the **Settings** module (`/settings`):
- **Hospital Name**: Updates the brand title across headers, dashboards, and printable documents.
- **Contact Details**: Address, phone number, and support email.
- **Currency Symbol & Code**: e.g., `$`, `USD`, `EUR`, `GBP`.
- **Tax Rate**: Configurable percentage applied to billing invoices.
- **Document Branding**: Custom header taglines and footer legal notes for invoices, prescriptions, and lab reports.
- **Hospital Logo**: Upload base64 or URL-safe logo image assets.

## 2. Environment & Configuration Customization
For deeper deployment adjustments, edit the `.env` file (copied from `.env.example`):
- **Server Port**: `PORT=8080` (or `3000`)
- **Database Connection**: Configure PostgreSQL connection parameters (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) or `DATABASE_URL`.
- **Session Security**: Define a strong `SESSION_SECRET` for production session persistence.
- **Node Environment**: Set `NODE_ENV=production` for secure cookie flags and production optimizations.

## 3. Styling & Design Tokens
All visual styles, color palettes, typography scales, and spacing units are centralized in `src/App.css` using CSS custom properties (`--*`), enabling rapid re-skinning without altering application logic.
