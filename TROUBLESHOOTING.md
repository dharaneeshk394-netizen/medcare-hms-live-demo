# MedCare Hospital Management System (HMS) — Troubleshooting Guide

Practical solutions for common installation and runtime issues.

---

### 1. Node.js Version Incompatibility
- **Issue**: `npm install` or build errors citing syntax or engine incompatibilities.
- **Solution**: Ensure Node.js version >= v20.0.0 is installed (`node -v`). We recommend Node.js LTS v20 or v22.

### 2. PostgreSQL Connection Failure
- **Issue**: `setup:check` or server startup fails with connection refused (`ECONNREFUSED`).
- **Solution**: Verify PostgreSQL is running and credentials in `.env` are correct. Test connection using `psql` or pgAdmin.

### 3. Database Initialization & Seeding Issues
- **Issue**: Missing tables or foreign key constraint errors.
- **Solution**: Run `npm run db:init` or `npm run db:seed` to reset and idempotently seed the database with clean demo records.

### 4. Setup Diagnostic Check
- **Issue**: Unsure if environment variables and tables are correctly set up.
- **Solution**: Run `npm run setup:check` to execute the automated diagnostic checker which verifies Node version, env config, PostgreSQL connectivity, all 23 tables, sequence generators, and demo user accounts.

### 5. Port Already in Use
- **Issue**: `EADDRINUSE` error on port 8080 or 3000.
- **Solution**: Terminate existing processes occupying the port or update `PORT` in `.env`.

### 6. Login / Session Problems
- **Issue**: Unable to maintain login session across page refreshes.
- **Solution**: Ensure `SESSION_SECRET` is set in `.env` and browser cookies are enabled. For local development, check that CORS headers match the frontend origin.

### 7. Build Failures
- **Issue**: Vite or esbuild errors during `npm run build`.
- **Solution**: Run `npm install` to ensure all dependencies are populated in `node_modules`, then re-run `npm run build`.
