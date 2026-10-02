/**
 * Server-Side Input and Parameter Validation Middleware
 *
 * Provides centralized, strict validation for:
 * - Route parameters (e.g. :id must be a positive integer)
 * - Request bodies (type checking, length limits, regex patterns, enums, dates)
 * - Query parameters (e.g. pagination, filters)
 *
 * All validation errors return HTTP 400 Bad Request with consistent structure:
 * {
 *   success: false,
 *   message: string,
 *   errors: [ { field: string, message: string } ]
 * }
 */

// ============================================================================
// Helper Validation Functions
// ============================================================================

/**
 * Validates whether a value is a positive integer (>= 1).
 * Accepts number or clean numeric string.
 */
function isPositiveInteger(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0;
  }
  if (typeof value === "string") {
    return /^[1-9]\d*$/.test(value.trim());
  }
  return false;
}

/**
 * Validates integer within a given range [min, max].
 * Accepts number or numeric string.
 */
function isIntegerInRange(value, min, max) {
  let num;
  if (typeof value === "number") {
    num = value;
  } else if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    num = Number(value.trim());
  } else {
    return false;
  }
  return Number.isInteger(num) && num >= min && num <= max;
}

/**
 * Validates whether a string is non-empty after trimming.
 */
function isNonEmptyString(value, maxLength = Infinity) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

/**
 * Validates email format.
 */
function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length > 150) return false;
  // Standard RFC-compatible regex for email validation
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

/**
 * Validates phone format. Allows optional leading +, digits, spaces, hyphens, and parentheses.
 * Must contain between 7 and 20 total characters and at least 7 digits.
 */
function isValidPhone(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 7 || trimmed.length > 20) return false;
  if (!/^\+?[\d\s().-]{7,20}$/.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
}

/**
 * Validates calendar date in YYYY-MM-DD format.
 * Ensures the date is a valid Gregorian calendar date (rejects Feb 30, Month 13, etc.).
 */
function isValidDate(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

/**
 * Validates time in HH:MM or HH:MM:SS format (24-hour).
 */
function isValidTime(value) {
  if (typeof value !== "string") return false;
  return /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.test(value.trim());
}

/**
 * Validates if value matches one of allowed enum values (case-insensitive comparison).
 * Returns canonical enum value if valid, or null if invalid.
 */
function matchEnum(value, allowedEnums) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  for (const item of allowedEnums) {
    if (item.toLowerCase() === trimmed) {
      return item;
    }
  }
  return null;
}

/**
 * Standard HTTP 400 response formatter for validation errors.
 */
function sendValidationErrors(res, errors) {
  const primaryMessage =
    errors.length === 1
      ? errors[0].message
      : `Validation failed: ${errors.map((err) => err.message).join("; ")}`;

  return res.status(400).json({
    success: false,
    message: primaryMessage,
    errors,
  });
}

// ============================================================================
// Parameter Validation Middleware
// ============================================================================

/**
 * Validates route parameters such as :id.
 * Must be a strictly positive integer (> 0).
 */
function validateIdParam(paramName = "id") {
  return (req, res, next) => {
    const rawValue = req.params[paramName];
    if (!rawValue || !isPositiveInteger(rawValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} parameter: must be a positive integer`,
        errors: [
          {
            field: paramName,
            message: `${paramName} must be a positive integer (e.g. 1, 2, 3)`,
          },
        ],
      });
    }
    // Normalize parameter to integer on req.params
    req.params[paramName] = String(parseInt(rawValue, 10));
    next();
  };
}

// ============================================================================
// Query Parameter Validation Middleware
// ============================================================================

/**
 * Validates optional common query parameters (page, limit, status, search).
 */
function validateQuery(req, res, next) {
  const errors = [];
  const { page, limit, status, search } = req.query;

  if (page !== undefined && page !== "") {
    if (!isPositiveInteger(page)) {
      errors.push({
        field: "page",
        message: "Query parameter 'page' must be a positive integer",
      });
    }
  }

  if (limit !== undefined && limit !== "") {
    if (!isIntegerInRange(limit, 1, 100)) {
      errors.push({
        field: "limit",
        message: "Query parameter 'limit' must be an integer between 1 and 100",
      });
    }
  }

  if (status !== undefined && status !== "") {
    if (typeof status !== "string" || status.trim().length > 50) {
      errors.push({
        field: "status",
        message: "Query parameter 'status' must be a valid string up to 50 characters",
      });
    }
  }

  if (search !== undefined && search !== "") {
    if (typeof search !== "string" || search.trim().length > 100) {
      errors.push({
        field: "search",
        message: "Query parameter 'search' must be a valid string up to 100 characters",
      });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

// ============================================================================
// Patient Validation Middlewares
// ============================================================================

const VALID_PATIENT_GENDERS = ["Male", "Female", "Other"];
const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VALID_PATIENT_STATUSES = ["Active", "Inactive", "Admitted"];

function validateCreatePatient(req, res, next) {
  const errors = [];
  const body = req.body || {};

  // Required: name
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.push({ field: "name", message: "Name is required" });
  } else if (body.name.trim().length > 100) {
    errors.push({ field: "name", message: "Name must not exceed 100 characters" });
  }

  // Required: age
  if (body.age === undefined || body.age === null || body.age === "") {
    errors.push({ field: "age", message: "Age is required" });
  } else if (!isIntegerInRange(body.age, 0, 150)) {
    errors.push({ field: "age", message: "Age must be an integer between 0 and 150" });
  }

  // Required: gender
  if (!body.gender || typeof body.gender !== "string" || !body.gender.trim()) {
    errors.push({ field: "gender", message: "Gender is required" });
  } else {
    const matchedGender = matchEnum(body.gender, VALID_PATIENT_GENDERS);
    if (!matchedGender) {
      errors.push({
        field: "gender",
        message: `Gender must be one of: ${VALID_PATIENT_GENDERS.join(", ")}`,
      });
    } else {
      req.body.gender = matchedGender;
    }
  }

  // Required: phone
  if (!body.phone || typeof body.phone !== "string" || !body.phone.trim()) {
    errors.push({ field: "phone", message: "Phone is required" });
  } else if (!isValidPhone(body.phone)) {
    errors.push({
      field: "phone",
      message: "Phone number must be valid (7-20 digits with optional +, spaces, hyphens)",
    });
  }

  // Optional: email
  if (body.email !== undefined && body.email !== null && body.email !== "") {
    if (!isValidEmail(body.email)) {
      errors.push({ field: "email", message: "Email format is invalid" });
    }
  }

  // Optional: bloodGroup
  if (body.bloodGroup !== undefined && body.bloodGroup !== null && body.bloodGroup !== "") {
    const matchedBG = matchEnum(body.bloodGroup, VALID_BLOOD_GROUPS);
    if (!matchedBG) {
      errors.push({
        field: "bloodGroup",
        message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(", ")}`,
      });
    } else {
      req.body.bloodGroup = matchedBG;
    }
  }

  // Optional: status
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_PATIENT_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_PATIENT_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  // Preserve original controller message if all 4 core fields are missing
  if (
    !body.name &&
    (body.age === undefined || body.age === null || body.age === "") &&
    !body.gender &&
    !body.phone
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, age, gender, and phone are required",
      errors,
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  // Sanitize and normalize fields
  req.body.name = body.name.trim();
  req.body.age = Number(body.age);
  req.body.phone = body.phone.trim();
  if (body.email) req.body.email = body.email.trim();
  if (body.bloodGroup) req.body.bloodGroup = body.bloodGroup.trim();
  if (!req.body.status) req.body.status = "Active";

  next();
}

function validateUpdatePatient(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one field must be provided" }],
    });
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.push({ field: "name", message: "Name cannot be empty" });
    } else if (body.name.trim().length > 100) {
      errors.push({ field: "name", message: "Name must not exceed 100 characters" });
    } else {
      req.body.name = body.name.trim();
    }
  }

  if (body.age !== undefined) {
    if (!isIntegerInRange(body.age, 0, 150)) {
      errors.push({ field: "age", message: "Age must be an integer between 0 and 150" });
    } else {
      req.body.age = Number(body.age);
    }
  }

  if (body.gender !== undefined) {
    const matchedGender = matchEnum(body.gender, VALID_PATIENT_GENDERS);
    if (!matchedGender) {
      errors.push({
        field: "gender",
        message: `Gender must be one of: ${VALID_PATIENT_GENDERS.join(", ")}`,
      });
    } else {
      req.body.gender = matchedGender;
    }
  }

  if (body.phone !== undefined) {
    if (!isValidPhone(body.phone)) {
      errors.push({
        field: "phone",
        message: "Phone number must be valid (7-20 digits with optional +, spaces, hyphens)",
      });
    } else {
      req.body.phone = body.phone.trim();
    }
  }

  if (body.email !== undefined && body.email !== null && body.email !== "") {
    if (!isValidEmail(body.email)) {
      errors.push({ field: "email", message: "Email format is invalid" });
    } else {
      req.body.email = body.email.trim();
    }
  }

  if (body.bloodGroup !== undefined && body.bloodGroup !== null && body.bloodGroup !== "") {
    const matchedBG = matchEnum(body.bloodGroup, VALID_BLOOD_GROUPS);
    if (!matchedBG) {
      errors.push({
        field: "bloodGroup",
        message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(", ")}`,
      });
    } else {
      req.body.bloodGroup = matchedBG;
    }
  }

  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_PATIENT_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_PATIENT_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

// ============================================================================
// Doctor Validation Middlewares
// ============================================================================

const VALID_DOCTOR_STATUSES = ["Active", "Inactive", "On Leave"];

function validateCreateDoctor(req, res, next) {
  const errors = [];
  const body = req.body || {};

  // Required: name
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.push({ field: "name", message: "Name is required" });
  } else if (body.name.trim().length > 100) {
    errors.push({ field: "name", message: "Name must not exceed 100 characters" });
  }

  // Required: specialization
  if (!body.specialization || typeof body.specialization !== "string" || !body.specialization.trim()) {
    errors.push({ field: "specialization", message: "Specialization is required" });
  } else if (body.specialization.trim().length > 100) {
    errors.push({ field: "specialization", message: "Specialization must not exceed 100 characters" });
  }

  // Required: phone
  if (!body.phone || typeof body.phone !== "string" || !body.phone.trim()) {
    errors.push({ field: "phone", message: "Phone is required" });
  } else if (!isValidPhone(body.phone)) {
    errors.push({
      field: "phone",
      message: "Phone number must be valid (7-20 digits with optional +, spaces, hyphens)",
    });
  }

  // Optional: email
  if (body.email !== undefined && body.email !== null && body.email !== "") {
    if (!isValidEmail(body.email)) {
      errors.push({ field: "email", message: "Email format is invalid" });
    }
  }

  // Optional: department
  if (body.department !== undefined && body.department !== null && body.department !== "") {
    if (typeof body.department !== "string" || body.department.trim().length > 100) {
      errors.push({ field: "department", message: "Department must not exceed 100 characters" });
    }
  }

  // Optional: status
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_DOCTOR_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_DOCTOR_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  // Preserve controller message if all 3 core fields are missing
  if (!body.name && !body.specialization && !body.phone) {
    return res.status(400).json({
      success: false,
      message: "Name, specialization, and phone are required",
      errors,
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  // Sanitize
  req.body.name = body.name.trim();
  req.body.specialization = body.specialization.trim();
  req.body.phone = body.phone.trim();
  if (body.email) req.body.email = body.email.trim();
  if (body.department) req.body.department = body.department.trim();
  if (!req.body.status) req.body.status = "Active";

  next();
}

function validateUpdateDoctor(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one field must be provided" }],
    });
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.push({ field: "name", message: "Name cannot be empty" });
    } else if (body.name.trim().length > 100) {
      errors.push({ field: "name", message: "Name must not exceed 100 characters" });
    } else {
      req.body.name = body.name.trim();
    }
  }

  if (body.specialization !== undefined) {
    if (typeof body.specialization !== "string" || !body.specialization.trim()) {
      errors.push({ field: "specialization", message: "Specialization cannot be empty" });
    } else if (body.specialization.trim().length > 100) {
      errors.push({ field: "specialization", message: "Specialization must not exceed 100 characters" });
    } else {
      req.body.specialization = body.specialization.trim();
    }
  }

  if (body.phone !== undefined) {
    if (!isValidPhone(body.phone)) {
      errors.push({
        field: "phone",
        message: "Phone number must be valid (7-20 digits with optional +, spaces, hyphens)",
      });
    } else {
      req.body.phone = body.phone.trim();
    }
  }

  if (body.email !== undefined && body.email !== null && body.email !== "") {
    if (!isValidEmail(body.email)) {
      errors.push({ field: "email", message: "Email format is invalid" });
    } else {
      req.body.email = body.email.trim();
    }
  }

  if (body.department !== undefined && body.department !== null && body.department !== "") {
    if (typeof body.department !== "string" || body.department.trim().length > 100) {
      errors.push({ field: "department", message: "Department must not exceed 100 characters" });
    } else {
      req.body.department = body.department.trim();
    }
  }

  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_DOCTOR_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_DOCTOR_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

// ============================================================================
// Appointment Validation Middlewares
// ============================================================================

const VALID_APPOINTMENT_STATUSES = [
  "Scheduled",
  "Confirmed",
  "Completed",
  "Cancelled",
  "No Show",
];

function validateCreateAppointment(req, res, next) {
  const errors = [];
  const body = req.body || {};

  // Required: patientId
  if (!body.patientId || !isPositiveInteger(body.patientId)) {
    errors.push({ field: "patientId", message: "Valid patient ID is required" });
  }

  // Required: doctorId
  if (!body.doctorId || !isPositiveInteger(body.doctorId)) {
    errors.push({ field: "doctorId", message: "Valid doctor ID is required" });
  }

  // Required: appointmentDate
  if (!body.appointmentDate || typeof body.appointmentDate !== "string" || !body.appointmentDate.trim()) {
    errors.push({ field: "appointmentDate", message: "Appointment date is required" });
  } else if (!isValidDate(body.appointmentDate)) {
    errors.push({ field: "appointmentDate", message: "Appointment date must be a valid date (YYYY-MM-DD)" });
  }

  // Required: appointmentTime
  if (!body.appointmentTime || typeof body.appointmentTime !== "string" || !body.appointmentTime.trim()) {
    errors.push({ field: "appointmentTime", message: "Appointment time is required" });
  } else if (!isValidTime(body.appointmentTime)) {
    errors.push({ field: "appointmentTime", message: "Appointment time must be valid 24-hour time (HH:MM or HH:MM:SS)" });
  }

  // Optional: reason
  if (body.reason !== undefined && body.reason !== null && body.reason !== "") {
    if (typeof body.reason !== "string" || body.reason.trim().length > 255) {
      errors.push({ field: "reason", message: "Reason must not exceed 255 characters" });
    }
  }

  // Optional: status
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_APPOINTMENT_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_APPOINTMENT_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  // Preserve controller message if all 4 core fields are missing
  if (!body.patientId && !body.doctorId && !body.appointmentDate && !body.appointmentTime) {
    return res.status(400).json({
      success: false,
      message: "Patient, doctor, date, and time are required",
      errors,
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  // Sanitize
  req.body.patientId = Number(body.patientId);
  req.body.doctorId = Number(body.doctorId);
  req.body.appointmentDate = body.appointmentDate.trim();
  req.body.appointmentTime = body.appointmentTime.trim();
  if (body.reason) req.body.reason = body.reason.trim();
  if (!req.body.status) req.body.status = "Scheduled";

  next();
}

function validateUpdateAppointment(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one field must be provided" }],
    });
  }

  if (body.patientId !== undefined) {
    if (!isPositiveInteger(body.patientId)) {
      errors.push({ field: "patientId", message: "Patient ID must be a positive integer" });
    } else {
      req.body.patientId = Number(body.patientId);
    }
  }

  if (body.doctorId !== undefined) {
    if (!isPositiveInteger(body.doctorId)) {
      errors.push({ field: "doctorId", message: "Doctor ID must be a positive integer" });
    } else {
      req.body.doctorId = Number(body.doctorId);
    }
  }

  if (body.appointmentDate !== undefined) {
    if (!isValidDate(body.appointmentDate)) {
      errors.push({ field: "appointmentDate", message: "Appointment date must be a valid date (YYYY-MM-DD)" });
    } else {
      req.body.appointmentDate = body.appointmentDate.trim();
    }
  }

  if (body.appointmentTime !== undefined) {
    if (!isValidTime(body.appointmentTime)) {
      errors.push({ field: "appointmentTime", message: "Appointment time must be valid 24-hour time (HH:MM or HH:MM:SS)" });
    } else {
      req.body.appointmentTime = body.appointmentTime.trim();
    }
  }

  if (body.reason !== undefined && body.reason !== null && body.reason !== "") {
    if (typeof body.reason !== "string" || body.reason.trim().length > 255) {
      errors.push({ field: "reason", message: "Reason must not exceed 255 characters" });
    } else {
      req.body.reason = body.reason.trim();
    }
  }

  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_APPOINTMENT_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_APPOINTMENT_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

// ============================================================================
// Department Validation Middlewares
// ============================================================================

const VALID_DEPARTMENT_STATUSES = ["Active", "Inactive"];

function validateCreateDepartment(req, res, next) {
  const errors = [];
  const body = req.body || {};

  // Required: name
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.push({ field: "name", message: "Department name is required" });
  } else if (body.name.trim().length > 100) {
    errors.push({ field: "name", message: "Department name must not exceed 100 characters" });
  }

  // Optional: description
  if (body.description !== undefined && body.description !== null && body.description !== "") {
    if (typeof body.description !== "string" || body.description.trim().length > 255) {
      errors.push({ field: "description", message: "Description must not exceed 255 characters" });
    }
  }

  // Optional: status
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_DEPARTMENT_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_DEPARTMENT_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  // Sanitize
  req.body.name = body.name.trim();
  if (body.description) req.body.description = body.description.trim();
  if (!req.body.status) req.body.status = "Active";

  next();
}

function validateUpdateDepartment(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one field must be provided" }],
    });
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.push({ field: "name", message: "Department name cannot be empty" });
    } else if (body.name.trim().length > 100) {
      errors.push({ field: "name", message: "Department name must not exceed 100 characters" });
    } else {
      req.body.name = body.name.trim();
    }
  }

  if (body.description !== undefined && body.description !== null && body.description !== "") {
    if (typeof body.description !== "string" || body.description.trim().length > 255) {
      errors.push({ field: "description", message: "Description must not exceed 255 characters" });
    } else {
      req.body.description = body.description.trim();
    }
  }

  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_DEPARTMENT_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_DEPARTMENT_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

// ============================================================================
// Admission Validation Middlewares
// ============================================================================

const VALID_ADMISSION_STATUSES = ["Admitted", "Discharged", "Transferred"];

function validateCreateAdmission(req, res, next) {
  const errors = [];
  const body = req.body || {};

  // Required: patientId
  if (!body.patientId || !isPositiveInteger(body.patientId)) {
    errors.push({ field: "patientId", message: "Patient is required" });
  }

  // Required: doctorId
  if (!body.doctorId || !isPositiveInteger(body.doctorId)) {
    errors.push({ field: "doctorId", message: "Doctor is required" });
  }

  // Required: admissionDate
  if (!body.admissionDate || typeof body.admissionDate !== "string" || !body.admissionDate.trim()) {
    errors.push({ field: "admissionDate", message: "Admission date is required" });
  } else if (!isValidDate(body.admissionDate)) {
    errors.push({ field: "admissionDate", message: "Admission date must be a valid date (YYYY-MM-DD)" });
  }

  // Optional: expectedDischargeDate
  if (
    body.expectedDischargeDate !== undefined &&
    body.expectedDischargeDate !== null &&
    body.expectedDischargeDate !== ""
  ) {
    if (!isValidDate(body.expectedDischargeDate)) {
      errors.push({
        field: "expectedDischargeDate",
        message: "Expected discharge date must be a valid date (YYYY-MM-DD)",
      });
    } else if (
      isValidDate(body.admissionDate) &&
      body.expectedDischargeDate.trim() < body.admissionDate.trim()
    ) {
      errors.push({
        field: "expectedDischargeDate",
        message: "Expected discharge date cannot be earlier than admission date",
      });
    }
  }

  // Optional: actualDischargeDate
  if (
    body.actualDischargeDate !== undefined &&
    body.actualDischargeDate !== null &&
    body.actualDischargeDate !== ""
  ) {
    if (!isValidDate(body.actualDischargeDate)) {
      errors.push({
        field: "actualDischargeDate",
        message: "Actual discharge date must be a valid date (YYYY-MM-DD)",
      });
    } else if (
      isValidDate(body.admissionDate) &&
      body.actualDischargeDate.trim() < body.admissionDate.trim()
    ) {
      errors.push({
        field: "actualDischargeDate",
        message: "Actual discharge date cannot be earlier than admission date",
      });
    }
  }

  // Optional: roomNumber
  if (body.roomNumber !== undefined && body.roomNumber !== null && body.roomNumber !== "") {
    if (typeof body.roomNumber !== "string" || body.roomNumber.trim().length > 20) {
      errors.push({ field: "roomNumber", message: "Room number must not exceed 20 characters" });
    }
  }

  // Optional: bedNumber
  if (body.bedNumber !== undefined && body.bedNumber !== null && body.bedNumber !== "") {
    if (typeof body.bedNumber !== "string" || body.bedNumber.trim().length > 20) {
      errors.push({ field: "bedNumber", message: "Bed number must not exceed 20 characters" });
    }
  }

  // Optional: diagnosis
  if (body.diagnosis !== undefined && body.diagnosis !== null && body.diagnosis !== "") {
    if (typeof body.diagnosis !== "string" || body.diagnosis.trim().length > 255) {
      errors.push({ field: "diagnosis", message: "Diagnosis must not exceed 255 characters" });
    }
  }

  // Optional: status
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_ADMISSION_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_ADMISSION_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  // Sanitize
  req.body.patientId = Number(body.patientId);
  req.body.doctorId = Number(body.doctorId);
  req.body.admissionDate = body.admissionDate.trim();
  req.body.expectedDischargeDate =
    body.expectedDischargeDate && body.expectedDischargeDate.trim()
      ? body.expectedDischargeDate.trim()
      : null;
  req.body.actualDischargeDate =
    body.actualDischargeDate && body.actualDischargeDate.trim()
      ? body.actualDischargeDate.trim()
      : null;
  req.body.roomNumber = body.roomNumber ? body.roomNumber.trim() : "";
  req.body.bedNumber = body.bedNumber ? body.bedNumber.trim() : "";
  req.body.diagnosis = body.diagnosis ? body.diagnosis.trim() : "";
  if (!req.body.status) req.body.status = "Admitted";

  next();
}

function validateUpdateAdmission(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one field must be provided" }],
    });
  }

  if (body.patientId !== undefined) {
    if (!isPositiveInteger(body.patientId)) {
      errors.push({ field: "patientId", message: "Patient ID must be a positive integer" });
    } else {
      req.body.patientId = Number(body.patientId);
    }
  }

  if (body.doctorId !== undefined) {
    if (!isPositiveInteger(body.doctorId)) {
      errors.push({ field: "doctorId", message: "Doctor ID must be a positive integer" });
    } else {
      req.body.doctorId = Number(body.doctorId);
    }
  }

  if (body.admissionDate !== undefined) {
    if (!isValidDate(body.admissionDate)) {
      errors.push({ field: "admissionDate", message: "Admission date must be a valid date (YYYY-MM-DD)" });
    } else {
      req.body.admissionDate = body.admissionDate.trim();
    }
  }

  if (
    body.expectedDischargeDate !== undefined &&
    body.expectedDischargeDate !== null &&
    body.expectedDischargeDate !== ""
  ) {
    if (!isValidDate(body.expectedDischargeDate)) {
      errors.push({
        field: "expectedDischargeDate",
        message: "Expected discharge date must be a valid date (YYYY-MM-DD)",
      });
    } else {
      req.body.expectedDischargeDate = body.expectedDischargeDate.trim();
    }
  }

  if (
    body.actualDischargeDate !== undefined &&
    body.actualDischargeDate !== null &&
    body.actualDischargeDate !== ""
  ) {
    if (!isValidDate(body.actualDischargeDate)) {
      errors.push({
        field: "actualDischargeDate",
        message: "Actual discharge date must be a valid date (YYYY-MM-DD)",
      });
    } else {
      req.body.actualDischargeDate = body.actualDischargeDate.trim();
    }
  }

  if (body.roomNumber !== undefined && body.roomNumber !== null && body.roomNumber !== "") {
    if (typeof body.roomNumber !== "string" || body.roomNumber.trim().length > 20) {
      errors.push({ field: "roomNumber", message: "Room number must not exceed 20 characters" });
    } else {
      req.body.roomNumber = body.roomNumber.trim();
    }
  }

  if (body.bedNumber !== undefined && body.bedNumber !== null && body.bedNumber !== "") {
    if (typeof body.bedNumber !== "string" || body.bedNumber.trim().length > 20) {
      errors.push({ field: "bedNumber", message: "Bed number must not exceed 20 characters" });
    } else {
      req.body.bedNumber = body.bedNumber.trim();
    }
  }

  if (body.diagnosis !== undefined && body.diagnosis !== null && body.diagnosis !== "") {
    if (typeof body.diagnosis !== "string" || body.diagnosis.trim().length > 255) {
      errors.push({ field: "diagnosis", message: "Diagnosis must not exceed 255 characters" });
    } else {
      req.body.diagnosis = body.diagnosis.trim();
    }
  }

  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_ADMISSION_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_ADMISSION_STATUSES.join(", ")}`,
      });
    } else {
      req.body.status = matchedStatus;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

// ============================================================================
// Billing Validation Middlewares
// ============================================================================

const VALID_BILLING_ITEM_TYPES = [
  "Consultation",
  "Room Charge",
  "Procedure",
  "Medication",
  "Lab Test",
  "General",
  "Other",
];

const VALID_PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Insurance",
  "Bank Transfer",
  "Online",
  "Other",
];

const VALID_INVOICE_STATUSES = [
  "PENDING",
  "PARTIAL",
  "PAID",
  "CANCELLED",
  "OVERDUE",
];

/**
 * Validates query parameters for GET /api/v1/billing/invoices
 */
function validateInvoiceQuery(req, res, next) {
  const errors = [];
  const { page, limit, patientId, status, invoiceNumber, startDate, endDate } = req.query;

  if (page !== undefined && page !== "") {
    if (!isPositiveInteger(page)) {
      errors.push({
        field: "page",
        message: "Query parameter 'page' must be a positive integer",
      });
    }
  }

  if (limit !== undefined && limit !== "") {
    if (!isIntegerInRange(limit, 1, 100)) {
      errors.push({
        field: "limit",
        message: "Query parameter 'limit' must be an integer between 1 and 100",
      });
    }
  }

  if (patientId !== undefined && patientId !== "") {
    if (!isPositiveInteger(patientId)) {
      errors.push({
        field: "patientId",
        message: "Query parameter 'patientId' must be a positive integer",
      });
    }
  }

  if (status !== undefined && status !== "") {
    const matchedStatus = matchEnum(status, VALID_INVOICE_STATUSES);
    if (!matchedStatus) {
      errors.push({
        field: "status",
        message: `Query parameter 'status' must be one of: ${VALID_INVOICE_STATUSES.join(", ")}`,
      });
    }
  }

  if (invoiceNumber !== undefined && invoiceNumber !== "") {
    if (typeof invoiceNumber !== "string" || invoiceNumber.trim().length > 50) {
      errors.push({
        field: "invoiceNumber",
        message: "Query parameter 'invoiceNumber' must be a string up to 50 characters",
      });
    }
  }

  if (startDate !== undefined && startDate !== "") {
    if (!isValidDate(startDate)) {
      errors.push({
        field: "startDate",
        message: "Query parameter 'startDate' must be a valid date (YYYY-MM-DD)",
      });
    }
  }

  if (endDate !== undefined && endDate !== "") {
    if (!isValidDate(endDate)) {
      errors.push({
        field: "endDate",
        message: "Query parameter 'endDate' must be a valid date (YYYY-MM-DD)",
      });
    }
  }

  if (startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
    if (startDate.trim() > endDate.trim()) {
      errors.push({
        field: "startDate",
        message: "Query parameter 'startDate' cannot be after 'endDate'",
      });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

/**
 * Validates request body for POST /api/v1/billing/invoices
 */
function validateCreateInvoice(req, res, next) {
  const errors = [];
  const body = req.body || {};

  // Required: patientId
  if (body.patientId === undefined || body.patientId === null || body.patientId === "") {
    errors.push({ field: "patientId", message: "Patient ID is required" });
  } else if (!isPositiveInteger(body.patientId)) {
    errors.push({ field: "patientId", message: "Patient ID must be a positive integer" });
  }

  // Optional: appointmentId
  if (body.appointmentId !== undefined && body.appointmentId !== null && body.appointmentId !== "") {
    if (!isPositiveInteger(body.appointmentId)) {
      errors.push({ field: "appointmentId", message: "Appointment ID must be a positive integer" });
    }
  }

  // Optional: admissionId
  if (body.admissionId !== undefined && body.admissionId !== null && body.admissionId !== "") {
    if (!isPositiveInteger(body.admissionId)) {
      errors.push({ field: "admissionId", message: "Admission ID must be a positive integer" });
    }
  }

  // Optional: invoiceDate
  if (body.invoiceDate !== undefined && body.invoiceDate !== null && body.invoiceDate !== "") {
    if (!isValidDate(body.invoiceDate)) {
      errors.push({ field: "invoiceDate", message: "Invoice date must be a valid date (YYYY-MM-DD)" });
    }
  }

  // Optional: dueDate
  if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== "") {
    if (!isValidDate(body.dueDate)) {
      errors.push({ field: "dueDate", message: "Due date must be a valid date (YYYY-MM-DD)" });
    } else if (
      body.invoiceDate &&
      isValidDate(body.invoiceDate) &&
      body.dueDate.trim() < body.invoiceDate.trim()
    ) {
      errors.push({ field: "dueDate", message: "Due date cannot be earlier than invoice date" });
    }
  }

  // Optional: discount
  if (body.discount !== undefined && body.discount !== null && body.discount !== "") {
    const discNum = Number(body.discount);
    if (Number.isNaN(discNum) || discNum < 0) {
      errors.push({ field: "discount", message: "Discount must be a non-negative number" });
    }
  }

  // Optional: tax
  if (body.tax !== undefined && body.tax !== null && body.tax !== "") {
    const taxNum = Number(body.tax);
    if (Number.isNaN(taxNum) || taxNum < 0) {
      errors.push({ field: "tax", message: "Tax must be a non-negative number" });
    }
  }

  // Optional: billingNotes
  if (body.billingNotes !== undefined && body.billingNotes !== null && body.billingNotes !== "") {
    if (typeof body.billingNotes !== "string" || body.billingNotes.trim().length > 1000) {
      errors.push({ field: "billingNotes", message: "Billing notes must not exceed 1000 characters" });
    }
  }

  // Required: items (Array with at least 1 item)
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.push({ field: "items", message: "An invoice must contain at least one line item" });
  } else {
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const index = i + 1;

      if (!item || typeof item !== "object") {
        errors.push({ field: `items[${i}]`, message: `Item #${index} must be an object` });
        continue;
      }

      if (!item.description || typeof item.description !== "string" || !item.description.trim()) {
        errors.push({ field: `items[${i}].description`, message: `Item #${index} description is required` });
      } else if (item.description.trim().length > 255) {
        errors.push({ field: `items[${i}].description`, message: `Item #${index} description must not exceed 255 characters` });
      }

      if (item.quantity === undefined || item.quantity === null || item.quantity === "") {
        errors.push({ field: `items[${i}].quantity`, message: `Item #${index} quantity is required` });
      } else if (!isPositiveInteger(item.quantity)) {
        errors.push({ field: `items[${i}].quantity`, message: `Item #${index} quantity must be a positive integer` });
      }

      const rawPrice = item.unitPrice !== undefined ? item.unitPrice : item.unit_price;
      if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
        errors.push({ field: `items[${i}].unitPrice`, message: `Item #${index} unit price is required` });
      } else {
        const priceNum = Number(rawPrice);
        if (Number.isNaN(priceNum) || priceNum < 0) {
          errors.push({ field: `items[${i}].unitPrice`, message: `Item #${index} unit price must be a non-negative number` });
        }
      }

      const rawType = item.itemType || item.item_type;
      if (rawType !== undefined && rawType !== null && rawType !== "") {
        const matchedType = matchEnum(rawType, VALID_BILLING_ITEM_TYPES);
        if (!matchedType) {
          errors.push({
            field: `items[${i}].itemType`,
            message: `Item #${index} item type must be one of: ${VALID_BILLING_ITEM_TYPES.join(", ")}`,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  // Mass assignment protection: sanitize request body
  const sanitized = {
    patientId: Number(body.patientId),
    appointmentId: body.appointmentId ? Number(body.appointmentId) : null,
    admissionId: body.admissionId ? Number(body.admissionId) : null,
    invoiceDate: body.invoiceDate ? body.invoiceDate.trim() : new Date().toISOString().slice(0, 10),
    dueDate: body.dueDate ? body.dueDate.trim() : null,
    discount: body.discount !== undefined ? Number(body.discount) : 0.0,
    tax: body.tax !== undefined ? Number(body.tax) : 0.0,
    billingNotes: body.billingNotes ? body.billingNotes.trim() : null,
    items: body.items.map((it) => ({
      itemType: matchEnum(it.itemType || it.item_type || "General", VALID_BILLING_ITEM_TYPES) || "General",
      description: it.description.trim(),
      quantity: parseInt(it.quantity, 10),
      unitPrice: Number(it.unitPrice !== undefined ? it.unitPrice : it.unit_price),
    })),
  };

  req.body = sanitized;
  next();
}

/**
 * Validates request body for PUT /api/v1/billing/invoices/:id
 */
function validateUpdateInvoice(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one field must be provided" }],
    });
  }

  const sanitized = {};
  let hasValidField = false;

  if (body.invoiceDate !== undefined) {
    if (!isValidDate(body.invoiceDate)) {
      errors.push({ field: "invoiceDate", message: "Invoice date must be a valid date (YYYY-MM-DD)" });
    } else {
      sanitized.invoiceDate = body.invoiceDate.trim();
      hasValidField = true;
    }
  }

  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === "") {
      sanitized.dueDate = null;
      hasValidField = true;
    } else if (!isValidDate(body.dueDate)) {
      errors.push({ field: "dueDate", message: "Due date must be a valid date (YYYY-MM-DD)" });
    } else {
      sanitized.dueDate = body.dueDate.trim();
      hasValidField = true;
    }
  }

  if (body.discount !== undefined) {
    const discNum = Number(body.discount);
    if (Number.isNaN(discNum) || discNum < 0) {
      errors.push({ field: "discount", message: "Discount must be a non-negative number" });
    } else {
      sanitized.discount = discNum;
      hasValidField = true;
    }
  }

  if (body.tax !== undefined) {
    const taxNum = Number(body.tax);
    if (Number.isNaN(taxNum) || taxNum < 0) {
      errors.push({ field: "tax", message: "Tax must be a non-negative number" });
    } else {
      sanitized.tax = taxNum;
      hasValidField = true;
    }
  }

  if (body.billingNotes !== undefined) {
    if (body.billingNotes === null || body.billingNotes === "") {
      sanitized.billingNotes = null;
      hasValidField = true;
    } else if (typeof body.billingNotes !== "string" || body.billingNotes.trim().length > 1000) {
      errors.push({ field: "billingNotes", message: "Billing notes must not exceed 1000 characters" });
    } else {
      sanitized.billingNotes = body.billingNotes.trim();
      hasValidField = true;
    }
  }

  if (body.appointmentId !== undefined) {
    if (body.appointmentId === null || body.appointmentId === "") {
      sanitized.appointmentId = null;
      hasValidField = true;
    } else if (!isPositiveInteger(body.appointmentId)) {
      errors.push({ field: "appointmentId", message: "Appointment ID must be a positive integer" });
    } else {
      sanitized.appointmentId = Number(body.appointmentId);
      hasValidField = true;
    }
  }

  if (body.admissionId !== undefined) {
    if (body.admissionId === null || body.admissionId === "") {
      sanitized.admissionId = null;
      hasValidField = true;
    } else if (!isPositiveInteger(body.admissionId)) {
      errors.push({ field: "admissionId", message: "Admission ID must be a positive integer" });
    } else {
      sanitized.admissionId = Number(body.admissionId);
      hasValidField = true;
    }
  }

  if (!hasValidField && errors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid editable fields provided for invoice update",
      errors: [{ field: "body", message: "No editable invoice fields provided" }],
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

/**
 * Validates request body for POST /api/v1/billing/invoices/:id/cancel
 */
function validateCancelInvoice(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (body.reason !== undefined && body.reason !== null && body.reason !== "") {
    if (typeof body.reason !== "string" || body.reason.trim().length > 500) {
      errors.push({ field: "reason", message: "Cancellation reason must not exceed 500 characters" });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = {
    reason: body.reason ? body.reason.trim() : "",
  };

  next();
}

/**
 * Validates request body for POST /api/v1/billing/invoices/:id/items
 */
function validateAddInvoiceItem(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
    errors.push({ field: "description", message: "Item description is required" });
  } else if (body.description.trim().length > 255) {
    errors.push({ field: "description", message: "Item description must not exceed 255 characters" });
  }

  if (body.quantity === undefined || body.quantity === null || body.quantity === "") {
    errors.push({ field: "quantity", message: "Item quantity is required" });
  } else if (!isPositiveInteger(body.quantity)) {
    errors.push({ field: "quantity", message: "Item quantity must be a positive integer" });
  }

  const rawPrice = body.unitPrice !== undefined ? body.unitPrice : body.unit_price;
  if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
    errors.push({ field: "unitPrice", message: "Item unit price is required" });
  } else {
    const priceNum = Number(rawPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      errors.push({ field: "unitPrice", message: "Item unit price must be a non-negative number" });
    }
  }

  const rawType = body.itemType || body.item_type;
  let itemType = "General";
  if (rawType !== undefined && rawType !== null && rawType !== "") {
    const matchedType = matchEnum(rawType, VALID_BILLING_ITEM_TYPES);
    if (!matchedType) {
      errors.push({
        field: "itemType",
        message: `Item type must be one of: ${VALID_BILLING_ITEM_TYPES.join(", ")}`,
      });
    } else {
      itemType = matchedType;
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = {
    itemType,
    description: body.description.trim(),
    quantity: parseInt(body.quantity, 10),
    unitPrice: Number(rawPrice),
  };

  next();
}

/**
 * Validates request body for PUT /api/v1/billing/invoices/:id/items/:itemId
 */
function validateUpdateInvoiceItem(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one item field must be provided" }],
    });
  }

  const sanitized = {};
  let hasValidField = false;

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      errors.push({ field: "description", message: "Item description cannot be empty" });
    } else if (body.description.trim().length > 255) {
      errors.push({ field: "description", message: "Item description must not exceed 255 characters" });
    } else {
      sanitized.description = body.description.trim();
      hasValidField = true;
    }
  }

  if (body.quantity !== undefined) {
    if (!isPositiveInteger(body.quantity)) {
      errors.push({ field: "quantity", message: "Item quantity must be a positive integer" });
    } else {
      sanitized.quantity = parseInt(body.quantity, 10);
      hasValidField = true;
    }
  }

  const rawPrice = body.unitPrice !== undefined ? body.unitPrice : body.unit_price;
  if (rawPrice !== undefined) {
    const priceNum = Number(rawPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      errors.push({ field: "unitPrice", message: "Item unit price must be a non-negative number" });
    } else {
      sanitized.unitPrice = priceNum;
      hasValidField = true;
    }
  }

  const rawType = body.itemType || body.item_type;
  if (rawType !== undefined) {
    const matchedType = matchEnum(rawType, VALID_BILLING_ITEM_TYPES);
    if (!matchedType) {
      errors.push({
        field: "itemType",
        message: `Item type must be one of: ${VALID_BILLING_ITEM_TYPES.join(", ")}`,
      });
    } else {
      sanitized.itemType = matchedType;
      hasValidField = true;
    }
  }

  if (!hasValidField && errors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid item fields provided for update",
      errors: [{ field: "body", message: "No editable item fields provided" }],
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

/**
 * Validates request body for POST /api/v1/billing/invoices/:id/payments
 */
function validateRecordPayment(req, res, next) {
  const errors = [];
  const body = req.body || {};

  // Required: amount
  if (body.amount === undefined || body.amount === null || body.amount === "") {
    errors.push({ field: "amount", message: "Payment amount is required" });
  } else {
    const amountNum = Number(body.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      errors.push({ field: "amount", message: "Payment amount must be a positive number greater than 0" });
    }
  }

  // Optional: paymentMethod
  let paymentMethod = "Cash";
  const rawMethod = body.paymentMethod || body.payment_method;
  if (rawMethod !== undefined && rawMethod !== null && rawMethod !== "") {
    const matchedMethod = matchEnum(rawMethod, VALID_PAYMENT_METHODS);
    if (!matchedMethod) {
      errors.push({
        field: "paymentMethod",
        message: `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`,
      });
    } else {
      paymentMethod = matchedMethod;
    }
  }

  // Optional: paymentDate
  let paymentDate = new Date().toISOString().slice(0, 10);
  const rawDate = body.paymentDate || body.payment_date;
  if (rawDate !== undefined && rawDate !== null && rawDate !== "") {
    if (!isValidDate(rawDate)) {
      errors.push({ field: "paymentDate", message: "Payment date must be a valid date (YYYY-MM-DD)" });
    } else {
      paymentDate = rawDate.trim();
    }
  }

  // Optional: referenceNumber
  let referenceNumber = null;
  const rawRef = body.referenceNumber || body.reference_number;
  if (rawRef !== undefined && rawRef !== null && rawRef !== "") {
    if (typeof rawRef !== "string" || rawRef.trim().length > 100) {
      errors.push({ field: "referenceNumber", message: "Reference number must not exceed 100 characters" });
    } else {
      referenceNumber = rawRef.trim();
    }
  }

  // Optional: notes
  let notes = null;
  if (body.notes !== undefined && body.notes !== null && body.notes !== "") {
    if (typeof body.notes !== "string" || body.notes.trim().length > 500) {
      errors.push({ field: "notes", message: "Payment notes must not exceed 500 characters" });
    } else {
      notes = body.notes.trim();
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = {
    amount: Number(body.amount),
    paymentMethod,
    paymentDate,
    referenceNumber,
    notes,
  };

  next();
}

// ============================================================================
// Prescription Validation Middlewares
// ============================================================================

const VALID_PRESCRIPTION_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"];

function validatePrescriptionQuery(req, res, next) {
  const errors = [];
  const { page, limit, patientId, doctorId, appointmentId, status, date, prescriptionDate, search } = req.query;

  if (page !== undefined && page !== "") {
    if (!isPositiveInteger(page)) {
      errors.push({ field: "page", message: "Query parameter 'page' must be a positive integer" });
    }
  }

  if (limit !== undefined && limit !== "") {
    if (!isIntegerInRange(limit, 1, 100)) {
      errors.push({ field: "limit", message: "Query parameter 'limit' must be an integer between 1 and 100" });
    }
  }

  if (patientId !== undefined && patientId !== "") {
    if (!isPositiveInteger(patientId)) {
      errors.push({ field: "patientId", message: "Query parameter 'patientId' must be a positive integer" });
    }
  }

  if (doctorId !== undefined && doctorId !== "") {
    if (!isPositiveInteger(doctorId)) {
      errors.push({ field: "doctorId", message: "Query parameter 'doctorId' must be a positive integer" });
    }
  }

  if (appointmentId !== undefined && appointmentId !== "") {
    if (!isPositiveInteger(appointmentId)) {
      errors.push({ field: "appointmentId", message: "Query parameter 'appointmentId' must be a positive integer" });
    }
  }

  if (status !== undefined && status !== "") {
    const matched = matchEnum(status, VALID_PRESCRIPTION_STATUSES);
    if (!matched) {
      errors.push({ field: "status", message: `Query parameter 'status' must be one of: ${VALID_PRESCRIPTION_STATUSES.join(", ")}` });
    }
  }

  const checkDate = date || prescriptionDate;
  if (checkDate !== undefined && checkDate !== "") {
    if (!isValidDate(checkDate)) {
      errors.push({ field: "date", message: "Query parameter 'date' must be a valid date (YYYY-MM-DD)" });
    }
  }

  if (search !== undefined && search !== "") {
    if (typeof search !== "string" || search.trim().length > 100) {
      errors.push({ field: "search", message: "Query parameter 'search' must be a valid string up to 100 characters" });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

function validateCreatePrescription(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be an object",
      errors: [{ field: "body", message: "Invalid request payload format" }],
    });
  }

  // Required: patientId
  const rawPatientId = body.patientId || body.patient_id;
  if (rawPatientId === undefined || rawPatientId === null || rawPatientId === "") {
    errors.push({ field: "patientId", message: "Patient ID is required" });
  } else if (!isPositiveInteger(rawPatientId)) {
    errors.push({ field: "patientId", message: "Patient ID must be a positive integer" });
  }

  // Doctor ID handling
  const rawDoctorId = body.doctorId || body.doctor_id;
  if (rawDoctorId === undefined || rawDoctorId === null || rawDoctorId === "") {
    errors.push({ field: "doctorId", message: "Doctor ID is required" });
  } else if (!isPositiveInteger(rawDoctorId)) {
    errors.push({ field: "doctorId", message: "Doctor ID must be a positive integer" });
  }

  // Optional: appointmentId
  const rawApptId = body.appointmentId || body.appointment_id;
  let appointmentId = null;
  if (rawApptId !== undefined && rawApptId !== null && rawApptId !== "") {
    if (!isPositiveInteger(rawApptId)) {
      errors.push({ field: "appointmentId", message: "Appointment ID must be a positive integer" });
    } else {
      appointmentId = Number(rawApptId);
    }
  }

  // Optional: prescriptionDate
  const rawRxDate = body.prescriptionDate || body.prescription_date;
  let prescriptionDate = null;
  if (rawRxDate !== undefined && rawRxDate !== null && rawRxDate !== "") {
    if (!isValidDate(rawRxDate)) {
      errors.push({ field: "prescriptionDate", message: "Prescription date must be a valid date (YYYY-MM-DD)" });
    } else {
      prescriptionDate = String(rawRxDate).trim();
    }
  }

  // Optional: diagnosisNotes
  const rawNotes = body.diagnosisNotes || body.diagnosis_notes;
  let diagnosisNotes = null;
  if (rawNotes !== undefined && rawNotes !== null && rawNotes !== "") {
    if (typeof rawNotes !== "string" || rawNotes.trim().length > 1000) {
      errors.push({ field: "diagnosisNotes", message: "Diagnosis notes must not exceed 1000 characters" });
    } else {
      diagnosisNotes = rawNotes.trim();
    }
  }

  // Optional: status
  let status = "ACTIVE";
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const matchedStatus = matchEnum(body.status, VALID_PRESCRIPTION_STATUSES);
    if (!matchedStatus) {
      errors.push({ field: "status", message: `Status must be one of: ${VALID_PRESCRIPTION_STATUSES.join(", ")}` });
    } else {
      status = matchedStatus;
    }
  }

  // Optional: items
  const items = [];
  if (body.items !== undefined && body.items !== null) {
    if (!Array.isArray(body.items)) {
      errors.push({ field: "items", message: "Items must be an array" });
    } else {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        const idx = i + 1;
        if (!item || typeof item !== "object") {
          errors.push({ field: `items[${i}]`, message: `Item #${idx} must be an object` });
          continue;
        }

        const medName = item.medicineName || item.medicine_name;
        if (!medName || typeof medName !== "string" || !medName.trim()) {
          errors.push({ field: `items[${i}].medicineName`, message: `Item #${idx} medicine name is required` });
        } else if (medName.trim().length > 255) {
          errors.push({ field: `items[${i}].medicineName`, message: `Item #${idx} medicine name must not exceed 255 characters` });
        }

        if (!item.dosage || typeof item.dosage !== "string" || !item.dosage.trim()) {
          errors.push({ field: `items[${i}].dosage`, message: `Item #${idx} dosage is required` });
        } else if (item.dosage.trim().length > 100) {
          errors.push({ field: `items[${i}].dosage`, message: `Item #${idx} dosage must not exceed 100 characters` });
        }

        if (!item.frequency || typeof item.frequency !== "string" || !item.frequency.trim()) {
          errors.push({ field: `items[${i}].frequency`, message: `Item #${idx} frequency is required` });
        } else if (item.frequency.trim().length > 100) {
          errors.push({ field: `items[${i}].frequency`, message: `Item #${idx} frequency must not exceed 100 characters` });
        }

        if (!item.duration || typeof item.duration !== "string" || !item.duration.trim()) {
          errors.push({ field: `items[${i}].duration`, message: `Item #${idx} duration is required` });
        } else if (item.duration.trim().length > 100) {
          errors.push({ field: `items[${i}].duration`, message: `Item #${idx} duration must not exceed 100 characters` });
        }

        if (item.quantity !== undefined && item.quantity !== null && item.quantity !== "") {
          if (!isPositiveInteger(item.quantity)) {
            errors.push({ field: `items[${i}].quantity`, message: `Item #${idx} quantity must be a positive integer` });
          }
        }

        if (item.instructions !== undefined && item.instructions !== null && item.instructions !== "") {
          if (typeof item.instructions !== "string" || item.instructions.trim().length > 500) {
            errors.push({ field: `items[${i}].instructions`, message: `Item #${idx} instructions must not exceed 500 characters` });
          }
        }

        if (errors.length === 0) {
          items.push({
            medicineName: medName.trim(),
            dosage: item.dosage.trim(),
            frequency: item.frequency.trim(),
            duration: item.duration.trim(),
            quantity: item.quantity ? Number(item.quantity) : null,
            instructions: item.instructions ? item.instructions.trim() : null,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  // Sanitize req.body - strictly strip unallowed fields like id, prescriptionNumber, createdBy
  req.body = {
    patientId: Number(rawPatientId),
    doctorId: Number(rawDoctorId),
    appointmentId,
    prescriptionDate,
    diagnosisNotes,
    status,
    items,
  };

  next();
}

function validateUpdatePrescription(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one field must be provided" }],
    });
  }

  const sanitized = {};
  let hasField = false;

  const rawNotes = body.diagnosisNotes !== undefined ? body.diagnosisNotes : body.diagnosis_notes;
  if (rawNotes !== undefined) {
    if (rawNotes !== null && (typeof rawNotes !== "string" || rawNotes.trim().length > 1000)) {
      errors.push({ field: "diagnosisNotes", message: "Diagnosis notes must not exceed 1000 characters" });
    } else {
      sanitized.diagnosisNotes = rawNotes ? rawNotes.trim() : null;
      hasField = true;
    }
  }

  const rawRxDate = body.prescriptionDate || body.prescription_date;
  if (rawRxDate !== undefined) {
    if (!isValidDate(rawRxDate)) {
      errors.push({ field: "prescriptionDate", message: "Prescription date must be a valid date (YYYY-MM-DD)" });
    } else {
      sanitized.prescriptionDate = String(rawRxDate).trim();
      hasField = true;
    }
  }

  if (body.status !== undefined) {
    const matchedStatus = matchEnum(body.status, VALID_PRESCRIPTION_STATUSES);
    if (!matchedStatus) {
      errors.push({ field: "status", message: `Status must be one of: ${VALID_PRESCRIPTION_STATUSES.join(", ")}` });
    } else {
      sanitized.status = matchedStatus;
      hasField = true;
    }
  }

  if (!hasField && errors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No editable prescription fields provided for update",
      errors: [{ field: "body", message: "Editable fields are: diagnosisNotes, prescriptionDate, status" }],
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

function validateAddPrescriptionItem(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be an object",
      errors: [{ field: "body", message: "Invalid item payload format" }],
    });
  }

  const medName = body.medicineName || body.medicine_name;
  if (!medName || typeof medName !== "string" || !medName.trim()) {
    errors.push({ field: "medicineName", message: "Medicine name is required" });
  } else if (medName.trim().length > 255) {
    errors.push({ field: "medicineName", message: "Medicine name must not exceed 255 characters" });
  }

  if (!body.dosage || typeof body.dosage !== "string" || !body.dosage.trim()) {
    errors.push({ field: "dosage", message: "Dosage is required" });
  } else if (body.dosage.trim().length > 100) {
    errors.push({ field: "dosage", message: "Dosage must not exceed 100 characters" });
  }

  if (!body.frequency || typeof body.frequency !== "string" || !body.frequency.trim()) {
    errors.push({ field: "frequency", message: "Frequency is required" });
  } else if (body.frequency.trim().length > 100) {
    errors.push({ field: "frequency", message: "Frequency must not exceed 100 characters" });
  }

  if (!body.duration || typeof body.duration !== "string" || !body.duration.trim()) {
    errors.push({ field: "duration", message: "Duration is required" });
  } else if (body.duration.trim().length > 100) {
    errors.push({ field: "duration", message: "Duration must not exceed 100 characters" });
  }

  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "") {
    if (!isPositiveInteger(body.quantity)) {
      errors.push({ field: "quantity", message: "Quantity must be a positive integer" });
    }
  }

  if (body.instructions !== undefined && body.instructions !== null && body.instructions !== "") {
    if (typeof body.instructions !== "string" || body.instructions.trim().length > 500) {
      errors.push({ field: "instructions", message: "Instructions must not exceed 500 characters" });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = {
    medicineName: medName.trim(),
    dosage: body.dosage.trim(),
    frequency: body.frequency.trim(),
    duration: body.duration.trim(),
    quantity: body.quantity ? Number(body.quantity) : null,
    instructions: body.instructions ? body.instructions.trim() : null,
  };

  next();
}

function validateUpdatePrescriptionItem(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body cannot be empty. Provide fields to update.",
      errors: [{ field: "body", message: "At least one item field must be provided" }],
    });
  }

  const sanitized = {};
  let hasField = false;

  const medName = body.medicineName || body.medicine_name;
  if (medName !== undefined) {
    if (typeof medName !== "string" || !medName.trim()) {
      errors.push({ field: "medicineName", message: "Medicine name cannot be empty" });
    } else if (medName.trim().length > 255) {
      errors.push({ field: "medicineName", message: "Medicine name must not exceed 255 characters" });
    } else {
      sanitized.medicineName = medName.trim();
      hasField = true;
    }
  }

  if (body.dosage !== undefined) {
    if (typeof body.dosage !== "string" || !body.dosage.trim()) {
      errors.push({ field: "dosage", message: "Dosage cannot be empty" });
    } else if (body.dosage.trim().length > 100) {
      errors.push({ field: "dosage", message: "Dosage must not exceed 100 characters" });
    } else {
      sanitized.dosage = body.dosage.trim();
      hasField = true;
    }
  }

  if (body.frequency !== undefined) {
    if (typeof body.frequency !== "string" || !body.frequency.trim()) {
      errors.push({ field: "frequency", message: "Frequency cannot be empty" });
    } else if (body.frequency.trim().length > 100) {
      errors.push({ field: "frequency", message: "Frequency must not exceed 100 characters" });
    } else {
      sanitized.frequency = body.frequency.trim();
      hasField = true;
    }
  }

  if (body.duration !== undefined) {
    if (typeof body.duration !== "string" || !body.duration.trim()) {
      errors.push({ field: "duration", message: "Duration cannot be empty" });
    } else if (body.duration.trim().length > 100) {
      errors.push({ field: "duration", message: "Duration must not exceed 100 characters" });
    } else {
      sanitized.duration = body.duration.trim();
      hasField = true;
    }
  }

  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "") {
    if (!isPositiveInteger(body.quantity)) {
      errors.push({ field: "quantity", message: "Quantity must be a positive integer" });
    } else {
      sanitized.quantity = Number(body.quantity);
      hasField = true;
    }
  }

  if (body.instructions !== undefined) {
    if (body.instructions !== null && (typeof body.instructions !== "string" || body.instructions.trim().length > 500)) {
      errors.push({ field: "instructions", message: "Instructions must not exceed 500 characters" });
    } else {
      sanitized.instructions = body.instructions ? body.instructions.trim() : null;
      hasField = true;
    }
  }

  if (!hasField && errors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid item fields provided for update",
      errors: [{ field: "body", message: "Editable item fields are: medicineName, dosage, frequency, duration, quantity, instructions" }],
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

// ============================================================================
// Medical Record Validation Middleware
// ============================================================================

const VALID_RECORD_STATUSES = ["ACTIVE", "ARCHIVED", "AMENDED"];

/**
 * Validates query parameters for medical record filtering.
 */
function validateMedicalRecordQuery(req, res, next) {
  const errors = [];
  const query = req.query || {};

  const patientId = query.patientId || query.patient_id;
  if (patientId !== undefined && patientId !== null && patientId !== "") {
    if (!isPositiveInteger(patientId)) {
      errors.push({ field: "patientId", message: "Patient ID must be a positive integer" });
    }
  }

  const doctorId = query.doctorId || query.doctor_id;
  if (doctorId !== undefined && doctorId !== null && doctorId !== "") {
    if (!isPositiveInteger(doctorId)) {
      errors.push({ field: "doctorId", message: "Doctor ID must be a positive integer" });
    }
  }

  const appointmentId = query.appointmentId || query.appointment_id;
  if (appointmentId !== undefined && appointmentId !== null && appointmentId !== "") {
    if (!isPositiveInteger(appointmentId)) {
      errors.push({ field: "appointmentId", message: "Appointment ID must be a positive integer" });
    }
  }

  if (query.date && !isValidDate(query.date)) {
    errors.push({ field: "date", message: "Date must be in YYYY-MM-DD format" });
  }

  if (query.startDate && !isValidDate(query.startDate)) {
    errors.push({ field: "startDate", message: "Start date must be in YYYY-MM-DD format" });
  }

  if (query.endDate && !isValidDate(query.endDate)) {
    errors.push({ field: "endDate", message: "End date must be in YYYY-MM-DD format" });
  }

  if (query.status && query.status !== "All") {
    if (!VALID_RECORD_STATUSES.includes(String(query.status).trim().toUpperCase())) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${VALID_RECORD_STATUSES.join(", ")} or All`,
      });
    }
  }

  if (query.search && typeof query.search === "string" && query.search.length > 200) {
    errors.push({ field: "search", message: "Search query must not exceed 200 characters" });
  }

  if (query.page !== undefined && query.page !== "") {
    if (!isPositiveInteger(query.page)) {
      errors.push({ field: "page", message: "Page must be a positive integer" });
    }
  }

  if (query.limit !== undefined && query.limit !== "") {
    if (!isIntegerInRange(query.limit, 1, 100)) {
      errors.push({ field: "limit", message: "Limit must be an integer between 1 and 100" });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

/**
 * Validates request payload for creating a new medical record.
 */
function validateCreateMedicalRecord(req, res, next) {
  const errors = [];
  const body = req.body || {};
  const sanitized = {};

  const patientId = body.patientId || body.patient_id;
  if (!patientId || !isPositiveInteger(patientId)) {
    errors.push({ field: "patientId", message: "Valid patient ID is required" });
  } else {
    sanitized.patientId = Number(patientId);
  }

  const doctorId = body.doctorId || body.doctor_id;
  if (!doctorId || !isPositiveInteger(doctorId)) {
    errors.push({ field: "doctorId", message: "Valid doctor ID is required" });
  } else {
    sanitized.doctorId = Number(doctorId);
  }

  const appointmentId = body.appointmentId || body.appointment_id;
  if (appointmentId !== undefined && appointmentId !== null && appointmentId !== "") {
    if (!isPositiveInteger(appointmentId)) {
      errors.push({ field: "appointmentId", message: "Appointment ID must be a positive integer" });
    } else {
      sanitized.appointmentId = Number(appointmentId);
    }
  }

  const recordDate = body.recordDate || body.record_date;
  if (recordDate) {
    if (!isValidDate(recordDate)) {
      errors.push({ field: "recordDate", message: "Record date must be in YYYY-MM-DD format" });
    } else {
      sanitized.recordDate = recordDate.trim();
    }
  } else {
    sanitized.recordDate = new Date().toISOString().slice(0, 10);
  }

  const recordType = body.recordType || body.record_type;
  if (recordType) {
    if (typeof recordType !== "string" || !recordType.trim() || recordType.trim().length > 50) {
      errors.push({ field: "recordType", message: "Record type must be a valid string up to 50 characters" });
    } else {
      sanitized.recordType = recordType.trim();
    }
  } else {
    sanitized.recordType = "General";
  }

  const chiefComplaint = body.chiefComplaint || body.chief_complaint;
  if (chiefComplaint) {
    if (typeof chiefComplaint !== "string" || chiefComplaint.trim().length > 1000) {
      errors.push({ field: "chiefComplaint", message: "Chief complaint must not exceed 1000 characters" });
    } else {
      sanitized.chiefComplaint = chiefComplaint.trim();
    }
  }

  if (!body.diagnosis || typeof body.diagnosis !== "string" || !body.diagnosis.trim()) {
    errors.push({ field: "diagnosis", message: "Diagnosis is required" });
  } else if (body.diagnosis.trim().length > 1000) {
    errors.push({ field: "diagnosis", message: "Diagnosis must not exceed 1000 characters" });
  } else {
    sanitized.diagnosis = body.diagnosis.trim();
  }

  const clinicalNotes = body.clinicalNotes || body.clinical_notes;
  if (clinicalNotes) {
    if (typeof clinicalNotes !== "string" || clinicalNotes.trim().length > 4000) {
      errors.push({ field: "clinicalNotes", message: "Clinical notes must not exceed 4000 characters" });
    } else {
      sanitized.clinicalNotes = clinicalNotes.trim();
    }
  }

  const treatmentPlan = body.treatmentPlan || body.treatment_plan;
  if (treatmentPlan) {
    if (typeof treatmentPlan !== "string" || treatmentPlan.trim().length > 2000) {
      errors.push({ field: "treatmentPlan", message: "Treatment plan must not exceed 2000 characters" });
    } else {
      sanitized.treatmentPlan = treatmentPlan.trim();
    }
  }

  if (body.status) {
    const statusUpper = String(body.status).trim().toUpperCase();
    if (!VALID_RECORD_STATUSES.includes(statusUpper)) {
      errors.push({ field: "status", message: `Status must be one of: ${VALID_RECORD_STATUSES.join(", ")}` });
    } else {
      sanitized.status = statusUpper;
    }
  } else {
    sanitized.status = "ACTIVE";
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

/**
 * Validates request payload for updating a medical record.
 */
function validateUpdateMedicalRecord(req, res, next) {
  const errors = [];
  const body = req.body || {};
  const sanitized = {};
  let hasField = false;

  const recordDate = body.recordDate || body.record_date;
  if (recordDate !== undefined) {
    if (!isValidDate(recordDate)) {
      errors.push({ field: "recordDate", message: "Record date must be in YYYY-MM-DD format" });
    } else {
      sanitized.recordDate = recordDate.trim();
      hasField = true;
    }
  }

  const recordType = body.recordType || body.record_type;
  if (recordType !== undefined) {
    if (typeof recordType !== "string" || !recordType.trim() || recordType.trim().length > 50) {
      errors.push({ field: "recordType", message: "Record type must be a valid string up to 50 characters" });
    } else {
      sanitized.recordType = recordType.trim();
      hasField = true;
    }
  }

  const chiefComplaint = body.chiefComplaint || body.chief_complaint;
  if (chiefComplaint !== undefined) {
    if (chiefComplaint !== null && (typeof chiefComplaint !== "string" || chiefComplaint.trim().length > 1000)) {
      errors.push({ field: "chiefComplaint", message: "Chief complaint must not exceed 1000 characters" });
    } else {
      sanitized.chiefComplaint = chiefComplaint ? chiefComplaint.trim() : null;
      hasField = true;
    }
  }

  if (body.diagnosis !== undefined) {
    if (typeof body.diagnosis !== "string" || !body.diagnosis.trim()) {
      errors.push({ field: "diagnosis", message: "Diagnosis cannot be empty" });
    } else if (body.diagnosis.trim().length > 1000) {
      errors.push({ field: "diagnosis", message: "Diagnosis must not exceed 1000 characters" });
    } else {
      sanitized.diagnosis = body.diagnosis.trim();
      hasField = true;
    }
  }

  const clinicalNotes = body.clinicalNotes || body.clinical_notes;
  if (clinicalNotes !== undefined) {
    if (clinicalNotes !== null && (typeof clinicalNotes !== "string" || clinicalNotes.trim().length > 4000)) {
      errors.push({ field: "clinicalNotes", message: "Clinical notes must not exceed 4000 characters" });
    } else {
      sanitized.clinicalNotes = clinicalNotes ? clinicalNotes.trim() : null;
      hasField = true;
    }
  }

  const treatmentPlan = body.treatmentPlan || body.treatment_plan;
  if (treatmentPlan !== undefined) {
    if (treatmentPlan !== null && (typeof treatmentPlan !== "string" || treatmentPlan.trim().length > 2000)) {
      errors.push({ field: "treatmentPlan", message: "Treatment plan must not exceed 2000 characters" });
    } else {
      sanitized.treatmentPlan = treatmentPlan ? treatmentPlan.trim() : null;
      hasField = true;
    }
  }

  if (body.status !== undefined) {
    const statusUpper = String(body.status).trim().toUpperCase();
    if (!VALID_RECORD_STATUSES.includes(statusUpper)) {
      errors.push({ field: "status", message: `Status must be one of: ${VALID_RECORD_STATUSES.join(", ")}` });
    } else {
      sanitized.status = statusUpper;
      hasField = true;
    }
  }

  if (!hasField && errors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields provided for update",
      errors: [{ field: "body", message: "Editable medical record fields are: recordDate, recordType, chiefComplaint, diagnosis, clinicalNotes, treatmentPlan, status" }],
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

/**
 * Valid employment statuses for Staff.
 */
const VALID_STAFF_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"];

/**
 * Validates query parameters for listing staff members.
 */
function validateStaffQuery(req, res, next) {
  const errors = [];
  const query = req.query || {};

  const departmentId = query.departmentId || query.department_id;
  if (departmentId !== undefined && departmentId !== "" && !isPositiveInteger(departmentId)) {
    errors.push({ field: "departmentId", message: "Department ID must be a positive integer" });
  }

  const status = query.employmentStatus || query.employment_status || query.status;
  if (status !== undefined && status !== "" && String(status).toUpperCase() !== "ALL") {
    if (!VALID_STAFF_STATUSES.includes(String(status).toUpperCase())) {
      errors.push({
        field: "employmentStatus",
        message: `Status must be one of: ${VALID_STAFF_STATUSES.join(", ")}, or ALL`,
      });
    }
  }

  if (query.designation !== undefined && query.designation !== "") {
    if (typeof query.designation !== "string" || query.designation.length > 100) {
      errors.push({ field: "designation", message: "Designation filter must not exceed 100 characters" });
    }
  }

  if (query.search !== undefined && query.search !== "") {
    if (typeof query.search !== "string" || query.search.length > 100) {
      errors.push({ field: "search", message: "Search term must not exceed 100 characters" });
    }
  }

  if (query.page !== undefined && query.page !== "") {
    if (!isPositiveInteger(query.page)) {
      errors.push({ field: "page", message: "Page must be a positive integer" });
    }
  }

  if (query.limit !== undefined && query.limit !== "") {
    if (!isIntegerInRange(query.limit, 1, 100)) {
      errors.push({ field: "limit", message: "Limit must be an integer between 1 and 100" });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  next();
}

/**
 * Validates request payload for creating a new staff member.
 */
function validateCreateStaff(req, res, next) {
  const errors = [];
  const body = req.body || {};
  const sanitized = {};

  const firstName = body.firstName || body.first_name;
  if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
    errors.push({ field: "firstName", message: "First name is required" });
  } else if (firstName.trim().length > 50) {
    errors.push({ field: "firstName", message: "First name must not exceed 50 characters" });
  } else {
    sanitized.firstName = firstName.trim();
  }

  const lastName = body.lastName || body.last_name;
  if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
    errors.push({ field: "lastName", message: "Last name is required" });
  } else if (lastName.trim().length > 50) {
    errors.push({ field: "lastName", message: "Last name must not exceed 50 characters" });
  } else {
    sanitized.lastName = lastName.trim();
  }

  const departmentId = body.departmentId || body.department_id;
  if (departmentId !== undefined && departmentId !== null && departmentId !== "") {
    if (!isPositiveInteger(departmentId)) {
      errors.push({ field: "departmentId", message: "Department ID must be a positive integer" });
    } else {
      sanitized.departmentId = Number(departmentId);
    }
  } else {
    sanitized.departmentId = null;
  }

  const designation = body.designation;
  if (!designation || typeof designation !== "string" || !designation.trim()) {
    errors.push({ field: "designation", message: "Designation is required" });
  } else if (designation.trim().length > 100) {
    errors.push({ field: "designation", message: "Designation must not exceed 100 characters" });
  } else {
    sanitized.designation = designation.trim();
  }

  const phone = body.phone;
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    errors.push({ field: "phone", message: "Phone number is required" });
  } else if (!isValidPhone(phone.trim())) {
    errors.push({ field: "phone", message: "Phone must be a valid 10-digit number" });
  } else {
    sanitized.phone = phone.trim();
  }

  const email = body.email;
  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string" || !isValidEmail(email.trim())) {
      errors.push({ field: "email", message: "Must be a valid email address" });
    } else if (email.trim().length > 150) {
      errors.push({ field: "email", message: "Email must not exceed 150 characters" });
    } else {
      sanitized.email = email.trim();
    }
  } else {
    sanitized.email = null;
  }

  const dateOfJoining = body.dateOfJoining || body.date_of_joining;
  if (dateOfJoining !== undefined && dateOfJoining !== null && dateOfJoining !== "") {
    if (!isValidDate(dateOfJoining)) {
      errors.push({ field: "dateOfJoining", message: "Date of joining must be a valid date (YYYY-MM-DD)" });
    } else {
      sanitized.dateOfJoining = String(dateOfJoining).trim();
    }
  } else {
    sanitized.dateOfJoining = new Date().toISOString().slice(0, 10);
  }

  const employmentStatus = body.employmentStatus || body.employment_status || body.status;
  if (employmentStatus !== undefined && employmentStatus !== null && employmentStatus !== "") {
    const statusUpper = String(employmentStatus).trim().toUpperCase();
    if (!VALID_STAFF_STATUSES.includes(statusUpper)) {
      errors.push({
        field: "employmentStatus",
        message: `Employment status must be one of: ${VALID_STAFF_STATUSES.join(", ")}`,
      });
    } else {
      sanitized.employmentStatus = statusUpper;
    }
  } else {
    sanitized.employmentStatus = "ACTIVE";
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

/**
 * Validates request payload for updating an existing staff member.
 */
function validateUpdateStaff(req, res, next) {
  const errors = [];
  const body = req.body || {};
  const sanitized = {};
  let hasField = false;

  const firstName = body.firstName || body.first_name;
  if (firstName !== undefined) {
    if (typeof firstName !== "string" || !firstName.trim()) {
      errors.push({ field: "firstName", message: "First name cannot be empty" });
    } else if (firstName.trim().length > 50) {
      errors.push({ field: "firstName", message: "First name must not exceed 50 characters" });
    } else {
      sanitized.firstName = firstName.trim();
      hasField = true;
    }
  }

  const lastName = body.lastName || body.last_name;
  if (lastName !== undefined) {
    if (typeof lastName !== "string" || !lastName.trim()) {
      errors.push({ field: "lastName", message: "Last name cannot be empty" });
    } else if (lastName.trim().length > 50) {
      errors.push({ field: "lastName", message: "Last name must not exceed 50 characters" });
    } else {
      sanitized.lastName = lastName.trim();
      hasField = true;
    }
  }

  const departmentId = body.departmentId || body.department_id;
  if (departmentId !== undefined) {
    if (departmentId === null || departmentId === "") {
      sanitized.departmentId = null;
      hasField = true;
    } else if (!isPositiveInteger(departmentId)) {
      errors.push({ field: "departmentId", message: "Department ID must be a positive integer" });
    } else {
      sanitized.departmentId = Number(departmentId);
      hasField = true;
    }
  }

  const designation = body.designation;
  if (designation !== undefined) {
    if (typeof designation !== "string" || !designation.trim()) {
      errors.push({ field: "designation", message: "Designation cannot be empty" });
    } else if (designation.trim().length > 100) {
      errors.push({ field: "designation", message: "Designation must not exceed 100 characters" });
    } else {
      sanitized.designation = designation.trim();
      hasField = true;
    }
  }

  const phone = body.phone;
  if (phone !== undefined) {
    if (typeof phone !== "string" || !phone.trim()) {
      errors.push({ field: "phone", message: "Phone number cannot be empty" });
    } else if (!isValidPhone(phone.trim())) {
      errors.push({ field: "phone", message: "Phone must be a valid 10-digit number" });
    } else {
      sanitized.phone = phone.trim();
      hasField = true;
    }
  }

  const email = body.email;
  if (email !== undefined) {
    if (email === null || email === "") {
      sanitized.email = null;
      hasField = true;
    } else if (typeof email !== "string" || !isValidEmail(email.trim())) {
      errors.push({ field: "email", message: "Must be a valid email address" });
    } else if (email.trim().length > 150) {
      errors.push({ field: "email", message: "Email must not exceed 150 characters" });
    } else {
      sanitized.email = email.trim();
      hasField = true;
    }
  }

  const dateOfJoining = body.dateOfJoining || body.date_of_joining;
  if (dateOfJoining !== undefined) {
    if (!isValidDate(dateOfJoining)) {
      errors.push({ field: "dateOfJoining", message: "Date of joining must be a valid date (YYYY-MM-DD)" });
    } else {
      sanitized.dateOfJoining = String(dateOfJoining).trim();
      hasField = true;
    }
  }

  const employmentStatus = body.employmentStatus || body.employment_status || body.status;
  if (employmentStatus !== undefined) {
    const statusUpper = String(employmentStatus).trim().toUpperCase();
    if (!VALID_STAFF_STATUSES.includes(statusUpper)) {
      errors.push({
        field: "employmentStatus",
        message: `Employment status must be one of: ${VALID_STAFF_STATUSES.join(", ")}`,
      });
    } else {
      sanitized.employmentStatus = statusUpper;
      hasField = true;
    }
  }

  if (!hasField && errors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields provided for update",
      errors: [
        {
          field: "body",
          message:
            "Editable staff fields are: firstName, lastName, departmentId, designation, phone, email, dateOfJoining, employmentStatus",
        },
      ],
    });
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  req.body = sanitized;
  next();
}

module.exports = {
  isPositiveInteger,
  isIntegerInRange,
  isNonEmptyString,
  isValidEmail,
  isValidPhone,
  isValidDate,
  isValidTime,
  validateIdParam,
  validateQuery,
  validateCreatePatient,
  validateUpdatePatient,
  validateCreateDoctor,
  validateUpdateDoctor,
  validateCreateAppointment,
  validateUpdateAppointment,
  validateCreateDepartment,
  validateUpdateDepartment,
  validateCreateAdmission,
  validateUpdateAdmission,
  VALID_BILLING_ITEM_TYPES,
  VALID_PAYMENT_METHODS,
  VALID_INVOICE_STATUSES,
  validateInvoiceQuery,
  validateCreateInvoice,
  validateUpdateInvoice,
  validateCancelInvoice,
  validateAddInvoiceItem,
  validateUpdateInvoiceItem,
  validateRecordPayment,
  VALID_PRESCRIPTION_STATUSES,
  validatePrescriptionQuery,
  validateCreatePrescription,
  validateUpdatePrescription,
  validateAddPrescriptionItem,
  validateUpdatePrescriptionItem,
  VALID_RECORD_STATUSES,
  validateMedicalRecordQuery,
  validateCreateMedicalRecord,
  validateUpdateMedicalRecord,
  VALID_STAFF_STATUSES,
  validateStaffQuery,
  validateCreateStaff,
  validateUpdateStaff,
};
