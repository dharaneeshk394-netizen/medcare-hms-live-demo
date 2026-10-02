const doctorService = require("../services/doctorService");
const auditService = require("../services/auditService");

// Get all doctors
async function getDoctors(req, res) {
  try {
    const doctors = await doctorService.getAllDoctors();

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Error getting doctors:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get doctors",
    });
  }
}

// Get doctor by ID
async function getDoctorById(req, res) {
  try {
    const doctor = await doctorService.getDoctorById(
      req.params.id
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Error getting doctor:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get doctor",
    });
  }
}

// Create doctor
async function createDoctor(req, res) {
  try {
    const {
      name,
      specialization,
      phone,
      email,
      department,
      status,
    } = req.body;

    if (!name || !specialization || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Name, specialization, and phone are required",
      });
    }

    const doctor = await doctorService.createDoctor({
      name,
      specialization,
      phone,
      email: email || "",
      department: department || "",
      status: status || "Active",
    });

    auditService.logAuditEvent({
      eventType: "DOCTOR_CREATE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "CREATE",
      resourceType: "DOCTOR",
      resourceId: doctor.id,
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      data: doctor,
    });
  } catch (error) {
    console.error("Error creating doctor:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create doctor",
    });
  }
}

// Update doctor
async function updateDoctor(req, res) {
  try {
    const doctor = await doctorService.updateDoctor(
      req.params.id,
      req.body
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    auditService.logAuditEvent({
      eventType: "DOCTOR_UPDATE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "UPDATE",
      resourceType: "DOCTOR",
      resourceId: String(req.params.id),
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      data: doctor,
    });
  } catch (error) {
    console.error("Error updating doctor:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update doctor",
    });
  }
}

// Delete doctor
async function deleteDoctor(req, res) {
  try {
    const doctor = await doctorService.deleteDoctor(
      req.params.id
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    auditService.logAuditEvent({
      eventType: "DOCTOR_DELETE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "DELETE",
      resourceType: "DOCTOR",
      resourceId: String(req.params.id),
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Doctor deleted successfully",
      data: doctor,
    });
  } catch (error) {
    console.error("Error deleting doctor:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete doctor",
    });
  }
}

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};