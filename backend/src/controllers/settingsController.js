const settingsService = require("../services/settingsService");
const auditService = require("../services/auditService");

/**
 * Controller: Get Hospital System Settings
 * Accessible to any authenticated user
 */
async function getSettings(req, res) {
  try {
    const settings = await settingsService.getSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (err) {
    console.error("Error in getSettings controller:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve hospital system settings.",
    });
  }
}

/**
 * Controller: Update Hospital System Settings
 * Admin-only resource
 */
async function updateSettings(req, res) {
  try {
    const {
      hospitalName,
      hospitalLogo,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      email,
      website,
      currencyCode,
      currencySymbol,
      taxEnabled,
      taxName,
      taxRate,
      invoiceFooter,
      prescriptionHeader,
      reportHeader,
    } = req.body;

    // Validation
    if (!hospitalName || typeof hospitalName !== "string" || !hospitalName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hospital name is required.",
      });
    }

    if (hospitalName.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: "Hospital name cannot exceed 255 characters.",
      });
    }

    // Email validation
    if (email && typeof email === "string" && email.trim()) {
      const trimmedEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (trimmedEmail.length > 255 || !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid contact email address.",
        });
      }
    }

    // Website URL validation
    if (website && typeof website === "string" && website.trim()) {
      const trimmedUrl = website.trim();
      if (trimmedUrl.length > 255 || !/^https?:\/\/.+/i.test(trimmedUrl)) {
        return res.status(400).json({
          success: false,
          message: "Website URL must start with http:// or https:// and be under 255 characters.",
        });
      }
    }

    // Phone validation
    if (phone && typeof phone === "string" && phone.trim()) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone.length > 50 || !/^[+0-9\s()./-]+$/.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Phone number contains invalid characters or exceeds 50 characters.",
        });
      }
    }

    // Postal code validation
    if (postalCode && typeof postalCode === "string" && postalCode.trim().length > 20) {
      return res.status(400).json({
        success: false,
        message: "Postal code cannot exceed 20 characters.",
      });
    }

    // Tax validation
    const parsedTaxRate = Number(taxRate);
    if (taxEnabled && (Number.isNaN(parsedTaxRate) || parsedTaxRate < 0 || parsedTaxRate > 100)) {
      return res.status(400).json({
        success: false,
        message: "Tax rate must be a valid percentage between 0 and 100.",
      });
    }

    if (taxName && typeof taxName === "string" && taxName.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "Tax label name cannot exceed 50 characters.",
      });
    }

    // Currency validation
    if (!currencyCode || typeof currencyCode !== "string" || !currencyCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required.",
      });
    }

    if (currencyCode.trim().length > 10) {
      return res.status(400).json({
        success: false,
        message: "Currency code cannot exceed 10 characters.",
      });
    }

    if (!currencySymbol || typeof currencySymbol !== "string" || !currencySymbol.trim()) {
      return res.status(400).json({
        success: false,
        message: "Currency symbol is required.",
      });
    }

    if (currencySymbol.trim().length > 10) {
      return res.status(400).json({
        success: false,
        message: "Currency symbol cannot exceed 10 characters.",
      });
    }

    // Text fields length limits
    const textFields = {
      addressLine1,
      addressLine2,
      city,
      state,
      country,
    };
    for (const [key, val] of Object.entries(textFields)) {
      if (val && typeof val === "string" && val.length > 255) {
        return res.status(400).json({
          success: false,
          message: `${key} cannot exceed 255 characters.`,
        });
      }
    }

    // Document branding headers/footer limits
    const docFields = {
      invoiceFooter,
      prescriptionHeader,
      reportHeader,
    };
    for (const [key, val] of Object.entries(docFields)) {
      if (val && typeof val === "string" && val.length > 1000) {
        return res.status(400).json({
          success: false,
          message: `${key} cannot exceed 1000 characters.`,
        });
      }
    }

    // Hospital logo validation
    if (hospitalLogo && typeof hospitalLogo === "string" && hospitalLogo.trim()) {
      const trimmedLogo = hospitalLogo.trim();
      if (trimmedLogo.length > 500000) {
        return res.status(400).json({
          success: false,
          message: "Logo payload is too large. Maximum size is 500KB.",
        });
      }

      // Safe URL or Data Image URI check to prevent javascript: or XSS vectors
      const isHttpUrl = /^https?:\/\/.+/i.test(trimmedLogo);
      const isDataImage = /^data:image\/(png|jpeg|jpg|webp|svg\+xml|gif);base64,/i.test(trimmedLogo);
      if (!isHttpUrl && !isDataImage) {
        return res.status(400).json({
          success: false,
          message: "Hospital logo must be a valid HTTP/HTTPS URL or a safe image data URI.",
        });
      }
    }

    const payload = {
      hospitalName: hospitalName.trim(),
      hospitalLogo: hospitalLogo ? hospitalLogo.trim() : null,
      addressLine1: addressLine1 ? String(addressLine1).trim() : "",
      addressLine2: addressLine2 ? String(addressLine2).trim() : "",
      city: city ? String(city).trim() : "",
      state: state ? String(state).trim() : "",
      postalCode: postalCode ? String(postalCode).trim() : "",
      country: country ? String(country).trim() : "",
      phone: phone ? String(phone).trim() : "",
      email: email ? String(email).trim() : "",
      website: website ? String(website).trim() : "",
      currencyCode: currencyCode ? String(currencyCode).trim().toUpperCase() : "USD",
      currencySymbol: currencySymbol ? String(currencySymbol).trim() : "$",
      taxEnabled: Boolean(taxEnabled),
      taxName: taxName ? String(taxName).trim() : "Tax",
      taxRate: Number.isNaN(parsedTaxRate) ? 0 : parsedTaxRate,
      invoiceFooter: invoiceFooter ? String(invoiceFooter).trim() : "",
      prescriptionHeader: prescriptionHeader ? String(prescriptionHeader).trim() : "",
      reportHeader: reportHeader ? String(reportHeader).trim() : "",
    };

    const updated = await settingsService.updateSettings(payload, req.user?.id);

    // Audit Log
    auditService.logAuditEvent({
      eventType: "SYSTEM_SETTINGS_UPDATE",
      userId: req.user?.id || null,
      role: req.user?.role || "admin",
      action: "UPDATE",
      resourceType: "SETTINGS",
      resourceId: "1",
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Hospital settings updated successfully.",
      data: updated,
    });
  } catch (err) {
    console.error("Error in updateSettings controller:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update hospital settings.",
    });
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
