const medicalRecordService = require("../services/medicalRecordService");

/**
 * Controller: getMedicalRecords
 * GET /api/v1/medical-records
 */
async function getMedicalRecords(req, res) {
  try {
    const {
      page,
      limit,
      patientId,
      patient_id,
      doctorId,
      doctor_id,
      appointmentId,
      appointment_id,
      recordType,
      record_type,
      status,
      date,
      recordDate,
      startDate,
      endDate,
      search,
    } = req.query;

    const filters = {
      patientId: patientId || patient_id,
      doctorId: doctorId || doctor_id,
      appointmentId: appointmentId || appointment_id,
      recordType: recordType || record_type,
      status,
      date: date || recordDate,
      startDate,
      endDate,
      search,
      page,
      limit,
    };

    const result = await medicalRecordService.getMedicalRecords(filters);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error getting medical records:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve medical records",
    });
  }
}

/**
 * Controller: getMedicalRecordById
 * GET /api/v1/medical-records/:id
 */
async function getMedicalRecordById(req, res) {
  try {
    const record = await medicalRecordService.getMedicalRecordById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error getting medical record:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve medical record",
    });
  }
}

/**
 * Controller: createMedicalRecord
 * POST /api/v1/medical-records
 */
async function createMedicalRecord(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    if (userRole === "doctor" && userDoctorId) {
      if (req.body.doctorId && Number(req.body.doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Doctors can only create medical records under their own doctor profile.",
        });
      }
    }

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const record = await medicalRecordService.createMedicalRecord(req.body, userContext);

    res.status(201).json({
      success: true,
      message: "Medical record created successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error creating medical record:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create medical record",
    });
  }
}

/**
 * Controller: updateMedicalRecord
 * PUT /api/v1/medical-records/:id
 */
async function updateMedicalRecord(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    if (userRole === "doctor" && userDoctorId) {
      const existing = await medicalRecordService.getMedicalRecordById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Medical record not found",
        });
      }
      if (Number(existing.doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Doctors can only manage their own medical records.",
        });
      }
      if (req.body.doctorId && Number(req.body.doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Doctors cannot reassign medical records to another doctor.",
        });
      }
    }

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const record = await medicalRecordService.updateMedicalRecord(req.params.id, req.body, userContext);

    res.status(200).json({
      success: true,
      message: "Medical record updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error updating medical record:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update medical record",
    });
  }
}

module.exports = {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
};
