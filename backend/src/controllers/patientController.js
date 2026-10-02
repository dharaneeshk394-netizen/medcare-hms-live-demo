const patientService = require("../services/patientService");
const auditService = require("../services/auditService");

// Get all patients
async function getPatients(req, res) {
  try {
    const patients = await patientService.getAllPatients();

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error("Error getting patients:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get patients",
    });
  }
}

// Get patient by ID
async function getPatientById(req, res) {
  try {
    const patient = await patientService.getPatientById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("Error getting patient:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get patient",
    });
  }
}

// Create patient
async function createPatient(req, res) {
  try {
    const {
      name,
      age,
      gender,
      phone,
      email,
      bloodGroup,
      status,
    } = req.body;

    if (!name || !age || !gender || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, age, gender, and phone are required",
      });
    }

    const patient = await patientService.createPatient({
      name,
      age,
      gender,
      phone,
      email: email || "",
      bloodGroup: bloodGroup || "",
      status: status || "Active",
    });

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Error creating patient:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create patient",
    });
  }
}

// Update patient
async function updatePatient(req, res) {
  try {
    const patient = await patientService.updatePatient(
      req.params.id,
      req.body
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Error updating patient:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update patient",
    });
  }
}

// Delete patient
async function deletePatient(req, res) {
  try {
    const patient = await patientService.deletePatient(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    auditService.logAuditEvent({
      eventType: "PATIENT_DELETE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "DELETE",
      resourceType: "PATIENT",
      resourceId: String(req.params.id),
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Error deleting patient:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete patient",
    });
  }
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};