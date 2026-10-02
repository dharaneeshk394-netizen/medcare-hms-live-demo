# MedCare Hospital Management System (HMS) — Buyer & User Guide

Welcome to the official User Guide for **MedCare Hospital Management System (HMS)**, a commercial-grade healthcare management platform built with React, Express, and PostgreSQL.

---

## 1. Product Overview
MedCare HMS provides a comprehensive, responsive, multi-role hospital management workflow. It streamlines administrative operations, clinical consultations, pharmacy dispensing, laboratory diagnostics, financial billing, and audit reporting.

## 2. Authentication & Demo Access
The system supports secure session authentication with Role-Based Access Control (RBAC). 
- **Demo Quick Login**: On the login page (`/login`), buyers can use the interactive Demo Role Switcher to instantly test pre-configured accounts for Administrator, Doctor, and Receptionist.
- **Default Demo Credentials** (local development only):
  - **Administrator**: `admin` / `Demo@1234`
  - **Doctor**: `dr.sarah` / `Demo@1234`
  - **Receptionist**: `receptionist` / `Demo@1234`

## 3. Core Modules & Navigation
- **Dashboard (`/`)**: Executive KPI counters (total patients, doctors, departments, appointments), occupancy overview, and recent activity logs.
- **Patients (`/patients`)**: Patient registration, demographic details, contact records, status tracking, CSV exports, and visit history.
- **Doctors (`/doctors`)**: Physician profiles, department assignments, consultation schedules, and availability statuses.
- **Departments (`/departments`)**: Hospital specialty units and clinical service management.
- **Appointments (`/appointments`)**: Outpatient scheduling, date filtering, status updates (Scheduled, Completed, Cancelled).
- **Admissions (`/admissions`)**: Inpatient ward and bed management, admission date tracking, and discharge workflows.
- **Prescriptions (`/prescriptions`)**: Clinical medication orders linked to patients and doctors, complete with printable A4 prescription view.
- **Medical Records (`/medical-records`)**: Patient clinical notes, diagnoses, vital signs, and treatment histories.
- **Staff (`/staff`)**: Hospital personnel directory, roles, employment status, and contact management.
- **Billing (`/billing`)**: Patient invoices, itemized billing (consultations, labs, pharmacy, room charges), payment collection, balances, and printable A4 invoices.
- **Pharmacy (`/pharmacy`)**: Medicine catalog, batch management, stock tracking, and pharmacy dispensing history.
- **Laboratory (`/laboratory`)**: Diagnostic test catalog, lab orders, result recording, and printable A4 lab reports.
- **Notifications (`/notifications`)**: Real-time system alerts and operational updates.
- **Reports (`/reports`)**: Financial and clinical analytics charts and summaries.
- **Audit Logs (`/audit-logs`)**: Immutable security and operational audit trail tracking user actions.
- **User Management (`/users`)**: Administrator console for managing user roles and account statuses.
- **Settings (`/settings`)**: Hospital profile configuration, document branding, currency selection, tax rates, and logo management.

---

## 4. Printing & CSV Exports
- **Printable A4 Documents**: Invoices, prescriptions, and lab reports feature a dedicated clean A4 print stylesheet that automatically hides screen chrome and formats professional medical documents.
- **CSV Exports**: All major data lists support RFC 4180 CSV file downloads with UTF-8 BOM encoding for seamless Microsoft Excel compatibility.
