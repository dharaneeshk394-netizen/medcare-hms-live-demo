# MedCare Hospital Management System (HMS)
## Professional Buyer Installation & Deployment Guide

Welcome to the **MedCare Hospital Management System (HMS)**. This guide provides step-by-step instructions to install, configure, verify, and deploy the application on a local development machine, Virtual Private Server (VPS), or cloud hosting environment.

---

## Table of Contents
1. [System Requirements](#1-system-requirements)
2. [Package Contents](#2-package-contents)
3. [Quick Start (5 Steps)](#3-quick-start-5-steps)
4. [Environment Configuration (.env)](#4-environment-configuration-env)
5. [Database Setup & Seeding](#5-database-setup--seeding)
6. [Setup Diagnostic Tool (npm run setup:check)](#6-setup-diagnostic-tool)
7. [Default Demo Accounts & Roles](#7-default-demo-accounts--roles)
8. [Running the Application](#8-running-the-application)
9. [Production Deployment & Process Management](#9-production-deployment--process-management)
10. [Nginx Reverse Proxy & SSL Setup](#10-nginx-reverse-proxy--ssl-setup)
11. [Running Automated Tests](#11-running-automated-tests)
12. [Troubleshooting Common Issues](#12-troubleshooting-common-issues)
13. [Pre-Launch Production Security Checklist](#13-pre-launch-production-security-checklist)

---

## 1. System Requirements

Ensure your server meets the following minimum prerequisites:

| Component | Minimum Version | Recommended |
| :--- | :--- | :--- |
| **Node.js** | `v20.0.0` LTS | `v20.x` or `v22.x` LTS |
| **npm** | `v10.0.0` | `v10.x` or higher |
| **PostgreSQL** | `v14.0` | `v15.x` or `v16.x` |
| **Operating System** | Linux (Ubuntu 20.04+, Debian 11+, RHEL 9+), macOS, or Windows 11 / WSL2 | Ubuntu 22.04 LTS |
| **Memory (RAM)** | 1 GB minimum | 2 GB+ recommended for production |
| **Disk Space** | 500 MB free disk space | 2 GB+ for production logs and data |

To check your installed versions, run:
```bash
node -v
npm -v
psql --version
```

---

## 2. Package Contents

```
├── backend/
│   ├── src/                  # Express 5 REST API controllers, services, middleware
│   ├── config/               # Database pool and connection configuration
│   ├── scripts/
│   │   ├── setup_check.cjs   # Non-destructive buyer installation diagnostic tool
│   │   └── restore_dump.cjs  # Database schema DDL and idempotent seed generator
│   └── tests/                # 79 automated test suites (429 passing tests)
├── src/                      # React 19 Frontend SPA (Tailwind CSS, React Router v7)
├── dist/                     # Production build output (generated upon 'npm run build')
├── .env.example              # Environment variables template
├── INSTALLATION.md           # This installation and deployment manual
├── package.json              # Dependencies and npm execution scripts
├── server.ts                 # Integrated development server with Vite middleware
├── vite.config.ts            # Vite asset bundler configuration
└── README.md                 # Complete system documentation & architectural specs
```

---

## 3. Quick Start (5 Steps)

Follow these 5 simple steps to get MedCare HMS running in under 5 minutes:

### Step 1: Install Dependencies
Open your terminal in the project root directory and install npm packages:
```bash
npm install
```

### Step 2: Create PostgreSQL Database
Create the primary application database:
```bash
createdb -U postgres hospital_management
```
*(Alternatively, log into psql and run: `CREATE DATABASE hospital_management;`)*

### Step 3: Configure Environment Variables
Copy the environment template and edit `.env`:
```bash
cp .env.example .env
```
Open `.env` in your text editor and set your PostgreSQL username and password:
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=hospital_management
DB_USER=postgres
DB_PASSWORD=your_postgres_password
SESSION_SECRET=your_secure_random_session_secret_min_32_chars
```

### Step 4: Initialize Database & Seed Demo Data
Run the automated schema and seeding script:
```bash
npm run db:seed
```
*(Or use the alias: `npm run db:init`)*

### Step 5: Run Setup Diagnostic & Start Server
Verify your setup:
```bash
npm run setup:check
```
If all checks pass, launch the development server:
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`**.

---

## 4. Environment Configuration (.env)

The application is configured using a `.env` file in the project root.

### Core Configuration Parameters

| Variable | Description | Default | Required |
| :--- | :--- | :--- | :---: |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` | Yes |
| `PORT` | HTTP port for server to listen on | `3000` | No |
| `SESSION_SECRET` | Secret key for signing session cookies | `[Random]` | Yes (in prod) |
| `RATE_LIMIT_MAX` | Max requests per IP per 15-minute window | `300` | No |

### Database Connection Options

You can configure PostgreSQL using **Option A** (URI string) or **Option B** (Discrete variables):

#### Option A: Connection URI (Recommended for Cloud / Hosted DBs)
```env
DATABASE_URL=postgresql://username:password@hostname:5432/hospital_management
```

#### Option B: Discrete Parameters (Recommended for Local / VPS DBs)
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=hospital_management
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MAX=10
```

---

## 5. Database Setup & Seeding

The database setup script (`backend/restore_dump.cjs`) is **safe, repeatable, and idempotent**:
- Creates all 23 relational database tables with proper foreign key cascades and check constraints.
- Creates 9 sequential counter sequences for business numbers (`INV-`, `PT-`, `RX-`, `MED-`, `LBO-`, etc.).
- Initializes the `system_settings` table with default hospital branding and financial currency configuration.
- Seeds realistic, fictional demo records across all clinical and financial modules.

### Commands:
```bash
# Initialize schema and seed demo data
npm run db:seed

# Alternative alias
npm run db:init
```

---

## 6. Setup Diagnostic Tool

MedCare HMS includes a built-in diagnostic tool to help buyers immediately identify any missing prerequisites or misconfigurations:

```bash
npm run setup:check
```

### What It Verifies:
1. **Node.js Runtime**: Ensures compatible LTS version (`>= v20.0.0`).
2. **Environment & Security**: Checks `.env` file presence, `PORT`, `NODE_ENV`, and `SESSION_SECRET` character length.
3. **Database Connectivity**: Establishes a live connection to PostgreSQL and checks engine version.
4. **Database Tables**: Verifies all 23 core database tables exist in the public schema.
5. **Sequence Generators**: Confirms all business numbering sequences are present.
6. **Hospital Settings & Demo Accounts**: Verifies system branding and active administrative user accounts.

---

## 7. Default Demo Accounts & Product Tour Guide

The system comes pre-configured with 3 primary role-based demo accounts for local software evaluation and buyer walkthroughs:

| Role | Username | Default Password | Primary Access & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Demo@1234` | Full access: Settings, Staff, Users, Audit Logs, Analytics, Exports, All Modules |
| **Doctor** | `dr.sarah` | `Demo@1234` | Clinical care: Patients, Appointments, Prescriptions, Medical Records, Lab Results |
| **Receptionist** | `receptionist` | `Demo@1234` | Front desk: Patient Intake, Appointments, Admissions, Invoices, Payments |

*Additional doctor accounts: `dr.priya`, `dr.marcus`, `dr.elena`, `dr.james` (Password: `Demo@1234`)*

> **SECURITY NOTICE:** Demo accounts and fictional sample data are designed for local evaluation. Always change default passwords or disable demo accounts prior to live clinical production use.

### 7.1 Recommended 5-Step Buyer Exploration Path

To experience the full clinical, administrative, and financial lifecycle of MedCare HMS, follow this recommended walkthrough:

1. **Step 1: Administrator Dashboard & Institutional Settings**
   - Log in as `admin`.
   - Explore the executive **Dashboard** with real-time KPI stat cards and interactive charts.
   - Navigate to **Settings** (`/settings`) to customize hospital profile, official tax rates, and document headers.
   - Visit **User Management** (`/users`) and **Audit Logs** (`/audit-logs`) to verify RBAC governance and tamper-evident event tracking.

2. **Step 2: Doctor Clinical Workflow & Electronic Prescriptions**
   - Switch to `dr.sarah` using the in-app role switcher or login screen.
   - Review the outpatient roster in **Appointments** (`/appointments`).
   - Open **Medical Records** (`/medical-records`) to review patient clinical notes and histories.
   - Issue an electronic prescription in **Prescriptions** (`/prescriptions`) with dosage, frequency, and instructions.
   - Click **Print A4 Prescription** to test official browser-native medical document printing.
   - Review diagnostic tests in **Laboratory** (`/laboratory`) and verify completed results.

3. **Step 3: Receptionist Front-Desk Operations & Invoicing**
   - Switch to `receptionist`.
   - Register a new patient in **Patients** (`/patients/add`).
   - Book an appointment in **Appointments** (`/appointments/add`) with double-booking prevention.
   - Assign an inpatient room and bed in **Admissions** (`/admissions/add`).
   - Generate an itemized tax invoice in **Billing** (`/billing/create-invoice`).
   - Record an initial deposit or co-payment in **Invoice Details** (`/billing/invoices/:id`) and verify automatic balance reduction.
   - Click **Print A4 Invoice** to test hospital tax invoice printing.

4. **Step 4: Pharmacy Formulary & Diagnostic Laboratory (LIS)**
   - Browse the **Pharmacy Formulary** (`/pharmacy`) to inspect medication batches, expiry dates, and unit prices.
   - Check **Low Stock Alerts** (`/pharmacy/low-stock`) for items nearing replenishment threshold.
   - Dispense medications against active prescriptions with automated inventory decrement.
   - Access **Laboratory / LIS** (`/laboratory`) to view test catalogs, specimen types, and turnaround hours.
   - Click **Print A4 Lab Report** to preview official diagnostic pathology reporting.

5. **Step 5: Cross-Module Reports & Excel CSV Data Export**
   - Navigate to **Reports & Analytics** (`/reports`).
   - Analyze aggregated financial collections, appointment breakdowns, and laboratory volumes.
   - Test one-click **CSV Exports** across all 7 operational domains (Patients, Appointments, Admissions, Invoices, Pharmacy, Laboratory, Financials): confirm UTF-8 BOM encoding for zero-formatting Microsoft Excel opening and formula injection sanitization.

### 7.2 Role-Based Access Control (RBAC) Permissions Matrix

| System Module | Administrator (`admin`) | Doctor (`dr.sarah`) | Receptionist (`receptionist`) |
| :--- | :--- | :--- | :--- |
| **Executive Dashboard** | Full Analytics & KPIs | Clinical KPIs & Shifts | Front-Desk Flow |
| **Patients Management** | Full Read/Write | Full Read/Write | Full Read/Write |
| **Appointments Scheduling** | Full Read/Write | Full Read/Write | Full Read/Write |
| **Inpatient Admissions** | Full Read/Write | Full Read/Write | Full Read/Write |
| **Electronic Prescriptions** | Full Read/Write | Full Read/Write | Read Only |
| **Medical Records (EMR)** | Full Read/Write | Full Read/Write | Read Only |
| **Staff & HR Directory** | Full Read/Write | Read Only | Read Only |
| **Billing & Invoicing** | Full Read/Write | Read Only | Full Read/Write |
| **Pharmacy & Inventory** | Full Read/Write | Read & Dispense | Read Only |
| **Laboratory LIS Orders** | Full Read/Write | Order & Verify | Read Only |
| **Reports & Analytics** | Full Access | Clinical Reports Only | No Access |
| **System Audit Logs** | Full Access | No Access | No Access |
| **Hospital Settings & Profile** | Full Access | No Access | No Access |
| **User Account Administration** | Full Access | No Access | No Access |
| **Financial Dataset Exports** | Allowed (Admin Only) | Forbidden (403) | Forbidden (403) |

---

## 8. Running the Application

### Development Mode
Runs the Express backend and React frontend with live hot compilation on port 3000:
```bash
npm run dev
```

### Production Build & Launch
Build the optimized client SPA and bundle the Express server:
```bash
# 1. Compile production bundles
npm run build

# 2. Start standalone Node.js production server
npm start
```

---

## 9. Production Deployment & Process Management

For production deployment on a Linux server (Ubuntu/Debian), use **PM2** process manager to ensure high availability, automatic restarts, and log rotation:

### 1. Install PM2 Globally
```bash
npm install -g pm2
```

### 2. Configure Production Environment
In your `.env` file:
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=a_very_long_cryptographically_secure_random_string_64_chars
```

### 3. Build & Start with PM2
```bash
npm run build
pm2 start dist/server.cjs --name "medcare-hms"
pm2 save
pm2 startup
```

### Useful PM2 Management Commands:
```bash
pm2 status             # Check service status
pm2 logs medcare-hms   # View real-time application logs
pm2 restart medcare-hms # Restart service
pm2 stop medcare-hms   # Stop service
```

---

## 10. Nginx Reverse Proxy & SSL Setup

To serve MedCare HMS on port 80/443 with custom domain and SSL, configure Nginx as a reverse proxy:

### Nginx Virtual Host Configuration (`/etc/nginx/sites-available/medcare-hms`)
```nginx
server {
    listen 80;
    server_name hospital.yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hospital.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/hospital.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hospital.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client upload limit (e.g. for hospital logo)
    client_max_body_size 5M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/medcare-hms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. Running Automated Tests

MedCare HMS includes an extensive automated test suite covering authentication, RBAC, database constraints, concurrency locks, billing calculations, and CSV exports:

```bash
# 1. Ensure test database exists
createdb -U postgres hospital_management_test

# 2. Run all 429 automated tests
npm test
```

All 79 test suites run in isolation against `hospital_management_test` without modifying your development or production data.

---

## 12. Troubleshooting Common Issues

### Issue 1: Database Connection Refused (`ECONNREFUSED 127.0.0.1:5432`)
- **Cause:** PostgreSQL server is not running or listening on port 5432.
- **Solution:** Start PostgreSQL service:
  ```bash
  sudo systemctl start postgresql   # Linux
  brew services start postgresql    # macOS
  ```

### Issue 2: Password Authentication Failed (`password authentication failed for user "postgres"`)
- **Cause:** Incorrect `DB_PASSWORD` in `.env`.
- **Solution:** Verify your PostgreSQL password. If needed, reset it:
  ```sql
  ALTER USER postgres WITH PASSWORD 'new_password';
  ```
  Then update `DB_PASSWORD` in `.env`.

### Issue 3: Missing Tables Error (`relation "public.users" does not exist`)
- **Cause:** Database created but tables have not been initialized.
- **Solution:** Run database setup:
  ```bash
  npm run db:seed
  ```

### Issue 4: Port Already in Use (`EADDRINUSE: address already in use :::3000`)
- **Cause:** Another service is listening on port 3000.
- **Solution:** Change `PORT=3001` (or another port) in `.env`, or terminate the conflicting process:
  ```bash
  npx kill-port 3000
  ```

### Issue 5: `SESSION_SECRET is too short`
- **Cause:** In `NODE_ENV=production`, `SESSION_SECRET` must be at least 32 characters.
- **Solution:** Generate a secure key:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Paste the output into `SESSION_SECRET=` in `.env`.

---

## 13. Pre-Launch Production Security Checklist

Before deploying to live hospital operations, complete this verification checklist:

- [ ] **Generate Production `SESSION_SECRET`**: Set a random secret of at least 64 characters.
- [ ] **Set `NODE_ENV=production`**: Enables Helmet Content Security Policy, HTTPS cookie flags (`secure: true`), and production optimizations.
- [ ] **Change Default Admin Password**: Log in as `admin` and update the password via System Settings / Users.
- [ ] **Configure Hospital Profile**: Set official hospital name, contact details, address, currency symbol, tax rates, and official logo in **Settings**.
- [ ] **Enable HTTPS / SSL**: Ensure SSL certificates are active through Nginx or Cloudflare.
- [ ] **Secure Database Access**: Disable remote PostgreSQL access on public ports; allow only localhost (`127.0.0.1`) or private VPC connections.
- [ ] **Verify Backup Strategy**: Configure automated PostgreSQL backups (`pg_dump`) with regular off-site replication.
- [ ] **Run Diagnostic Tool**: Verify `npm run setup:check` returns all green checkmarks.

---

*MedCare Hospital Management System — Commercial Distribution Package*
