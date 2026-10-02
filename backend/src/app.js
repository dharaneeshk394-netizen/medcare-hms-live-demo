const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { pool } = require("./config/db");

const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const admissionRoutes = require("./routes/admissionRoutes");
const authRoutes = require("./routes/authRoutes");
const billingRoutes = require("./routes/billingRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const staffRoutes = require("./routes/staffRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const labRoutes = require("./routes/labRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const userRoutes = require("./routes/userRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const { requireAuth } = require("./middleware/auth");
const { csrfProtection } = require("./middleware/csrf");

const app = express();

const isProduction = process.env.NODE_ENV === "production";

// Disable x-powered-by header to prevent technology fingerprinting
app.disable("x-powered-by");

// Configure trust proxy for the single reverse-proxy hop (container nginx / Cloud Run ingress)
app.set("trust proxy", 1);

// Security Headers:
// In production, enforces strict Content Security Policy (CSP) and clickjacking protection (SAMEORIGIN).
// In development, CSP and frameguard are relaxed to preserve Vite development tooling and preview environments.
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
          },
        }
      : false,
    frameguard: isProduction ? { action: "sameorigin" } : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Whitelisted CORS origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim());
}
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(",").forEach((origin) => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (such as same-origin requests, mobile apps, or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Explicit Request Body Limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// PostgreSQL Session Store & Session Middleware
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  pool,
  tableName: "session",
  createTableIfMissing: false,
});

sessionStore.on("error", (sessionError) => {
  console.error("PostgreSQL Session Store Error:", sessionError.message);
});

let sessionSecret = process.env.SESSION_SECRET;

if (isProduction) {
  if (
    !sessionSecret ||
    typeof sessionSecret !== "string" ||
    sessionSecret.trim().length < 32
  ) {
    throw new Error(
      "SESSION_SECRET must be configured and at least 32 characters long in production."
    );
  }
  sessionSecret = sessionSecret.trim();
} else {
  sessionSecret = sessionSecret || "hospital-management-dev-session-key";
}

app.use(
  session({
    store: sessionStore,
    name: "hms_sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

// Rate Limiter for API endpoints (protects backend while keeping static assets unthrottled)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: Number(process.env.RATE_LIMIT_MAX) || 300, // 300 requests per 15 min per IP
  standardHeaders: true, // Return standard RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false, // Disable legacy X-RateLimit headers
  statusCode: 429,
  validate: {
    forwardedHeader: false,
  },
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
});

app.use("/api", apiLimiter);
app.use("/api", csrfProtection);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Hospital Management System API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Hospital Management System API",
    version: "v1",
    status: isProduction ? "production" : "development",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patients", requireAuth, patientRoutes);
app.use("/api/v1/doctors", requireAuth, doctorRoutes);
app.use("/api/v1/appointments", requireAuth, appointmentRoutes);
app.use("/api/v1/departments", requireAuth, departmentRoutes);
app.use("/api/v1/admissions", requireAuth, admissionRoutes);
app.use("/api/v1/billing", requireAuth, billingRoutes);
app.use("/api/v1/prescriptions", requireAuth, prescriptionRoutes);
app.use("/api/v1/medical-records", requireAuth, medicalRecordRoutes);
app.use("/api/v1/staff", requireAuth, staffRoutes);
app.use("/api/v1/pharmacy", requireAuth, pharmacyRoutes);
app.use("/api/v1/lab", requireAuth, labRoutes);
app.use("/api/v1/notifications", requireAuth, notificationRoutes);
app.use("/api/v1/reports", requireAuth, reportRoutes);
app.use("/api/v1/audit-logs", requireAuth, auditLogRoutes);
app.use("/api/v1/users", requireAuth, userRoutes);
app.use("/api/v1/settings", requireAuth, settingsRoutes);


app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
      path: req.originalUrl,
    });
  }
  next();
});

app.use((err, req, res, _next) => {
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: "Payload too large. Request body exceeds configured limit.",
    });
  }

  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Internal server error",
  });
});

module.exports = app;