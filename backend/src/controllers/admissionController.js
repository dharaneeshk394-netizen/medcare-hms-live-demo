const admissionService = require("../services/admissionService");
const auditService = require("../services/auditService");

// Get all admissions
async function getAdmissions(req, res) {
  try {
    const admissions =
      await admissionService.getAllAdmissions();

    res.status(200).json({
      success: true,
      count: admissions.length,
      data: admissions,
    });
  } catch (error) {
    console.error("Error getting admissions:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get admissions",
    });
  }
}

// Get admission by ID
async function getAdmissionById(req, res) {
  try {
    const admission =
      await admissionService.getAdmissionById(req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    res.status(200).json({
      success: true,
      data: admission,
    });
  } catch (error) {
    console.error("Error getting admission:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get admission",
    });
  }
}

// Create an admission
async function createAdmission(req, res) {
  try {
    const {
      patientId,
      doctorId,
      roomNumber,
      bedNumber,
      admissionDate,
      expectedDischargeDate,
      actualDischargeDate,
      diagnosis,
      status,
    } = req.body;

    if (
      !patientId ||
      !doctorId ||
      !roomNumber ||
      !bedNumber ||
      !admissionDate ||
      !diagnosis
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Patient, doctor, room, bed, admission date, and diagnosis are required",
      });
    }

    const userRole = req.user?.role;
    const userDoctorId = req.user?.doctorId;

    let targetDoctorId = Number(doctorId);

    // Resource-level authorization for doctor role
    if (userRole === "doctor") {
      if (!userDoctorId) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: Doctor account is not linked to a doctor profile.",
        });
      }

      if (Number(doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: Doctors cannot create admissions for other doctors.",
        });
      }

      // Enforce the authenticated doctor's ID
      targetDoctorId = Number(userDoctorId);
    }

    const admission =
      await admissionService.createAdmission({
        patientId,
        doctorId: targetDoctorId,
        roomNumber,
        bedNumber,
        admissionDate,
        expectedDischargeDate,
        actualDischargeDate,
        diagnosis,
        status: status || "Admitted",
      });

    res.status(201).json({
      success: true,
      message: "Admission created successfully",
      data: admission,
    });
  } catch (error) {
    console.error("Error creating admission:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient or doctor selected",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create admission",
    });
  }
}

// Update an admission
async function updateAdmission(req, res) {
  try {
    const admissionId = req.params.id;

    // Retrieve existing admission to verify existence and ownership
    const existingAdmission =
      await admissionService.getAdmissionById(admissionId);

    if (!existingAdmission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    const userRole = req.user?.role;
    const userDoctorId = req.user?.doctorId;

    const updatePayload = { ...req.body };
    let requiredDoctorId = null;

    // Resource-level authorization for doctor role
    if (userRole === "doctor") {
      if (!userDoctorId) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: Doctor account is not linked to a doctor profile.",
        });
      }

      // Verify the admission belongs to the logged-in doctor
      if (
        Number(existingAdmission.doctorId) !==
        Number(userDoctorId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: You are not authorized to update admissions for another doctor.",
        });
      }

      // Prevent reassigning admission to a different doctor
      if (
        updatePayload.doctorId !== undefined &&
        updatePayload.doctorId !== null &&
        Number(updatePayload.doctorId) !== Number(userDoctorId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: Doctors cannot reassign admissions to another doctor.",
        });
      }

      // Ensure doctor_id remains the authenticated doctor's ID
      updatePayload.doctorId = Number(userDoctorId);
      requiredDoctorId = Number(userDoctorId);
    }

    const admission =
      await admissionService.updateAdmission(
        admissionId,
        updatePayload,
        requiredDoctorId
      );

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Admission updated successfully",
      data: admission,
    });
  } catch (error) {
    console.error("Error updating admission:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient or doctor selected",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update admission",
    });
  }
}

// Delete an admission
async function deleteAdmission(req, res) {
  try {
    const admission =
      await admissionService.deleteAdmission(
        req.params.id
      );

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    auditService.logAuditEvent({
      eventType: "ADMISSION_DELETE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "DELETE",
      resourceType: "ADMISSION",
      resourceId: String(req.params.id),
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Admission deleted successfully",
      data: admission,
    });
  } catch (error) {
    console.error("Error deleting admission:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete admission",
    });
  }
}

module.exports = {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
};
