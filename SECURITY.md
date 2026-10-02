# MedCare Hospital Management System (HMS) — Security Architecture & Guidelines

MedCare HMS implements a robust, multi-layer security architecture designed to protect sensitive hospital data and user sessions.

---

## 1. Application Security Controls (Built-In)
- **Session Authentication**: Secure server-side sessions backed by PostgreSQL (`connect-pg-simple`) with HttpOnly cookies preventing XSS session hijacking.
- **Password Hashing**: User passwords are securely hashed using `bcryptjs` with configurable work factors. Password hashes are strictly excluded from all API responses and audit logs.
- **Role-Based Access Control (RBAC)**: Fine-grained route protection enforcing strict permissions for Administrator, Doctor, and Receptionist roles.
- **Security Headers**: Integration of Helmet middleware for standard HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options).
- **Rate Limiting**: API rate limiting (`express-rate-limit`) on sensitive routes (e.g., login and authentication endpoints) to mitigate brute-force attacks.
- **SQL Injection Prevention**: Parameterized queries and robust ORM query builders preventing SQL injection vectors across all database interactions.
- **Immutable Audit Logging**: Comprehensive audit trail recording significant security and operational events (logins, patient creations, role changes, financial transactions).

## 2. Buyer Deployment Responsibilities
While MedCare HMS includes robust security controls, deployment security depends on the buyer's environment configuration:
- **HTTPS / SSL/TLS**: Production deployments must enforce HTTPS (`Secure` cookies enabled) to encrypt data in transit.
- **Environment Secrets**: Buyers must define a cryptographically strong `SESSION_SECRET` in production `.env` files.
- **Database Security**: PostgreSQL instances must be secured with strong passwords, restricted network access, and regular backups.
- **Demo Credentials**: Default demo accounts (`admin`, `dr.sarah`, `receptionist`) should be disabled or have their passwords changed prior to live hospital deployment.
