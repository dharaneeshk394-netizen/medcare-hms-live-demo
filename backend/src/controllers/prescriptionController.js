const prescriptionService = require("../services/prescriptionService");

/**
 * Controller: getPrescriptions
 * GET /api/v1/prescriptions
 */
async function getPrescriptions(req, res) {
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
      status,
      date,
      prescriptionDate,
      search,
    } = req.query;

    const filters = {
      patientId: patientId || patient_id,
      doctorId: doctorId || doctor_id,
      appointmentId: appointmentId || appointment_id,
      status,
      date: date || prescriptionDate,
      search,
      page,
      limit,
    };

    const result = await prescriptionService.getPrescriptions(filters);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error getting prescriptions:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve prescriptions",
    });
  }
}

/**
 * Controller: getPrescriptionById
 * GET /api/v1/prescriptions/:id
 */
async function getPrescriptionById(req, res) {
  try {
    const prescription = await prescriptionService.getPrescriptionById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    console.error("Error getting prescription:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve prescription",
    });
  }
}

/**
 * Controller: createPrescription
 * POST /api/v1/prescriptions
 */
async function createPrescription(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    if (userRole === "doctor" && userDoctorId) {
      if (req.body.doctorId && Number(req.body.doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Doctors can only create prescriptions under their own doctor profile.",
        });
      }
    }

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const prescription = await prescriptionService.createPrescription(req.body, userContext);

    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error creating prescription:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create prescription",
    });
  }
}

/**
 * Controller: updatePrescription
 * PUT /api/v1/prescriptions/:id
 */
async function updatePrescription(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    if (userRole === "doctor" && userDoctorId) {
      const rx = await prescriptionService.getPrescriptionById(req.params.id);
      if (!rx) {
        return res.status(404).json({
          success: false,
          message: "Prescription not found",
        });
      }
      if (Number(rx.doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Doctors can only manage their own prescriptions.",
        });
      }
    }

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const prescription = await prescriptionService.updatePrescription(req.params.id, req.body, userContext);

    res.status(200).json({
      success: true,
      message: "Prescription updated successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error updating prescription:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update prescription",
    });
  }
}

/**
 * Controller: cancelPrescription
 * POST /api/v1/prescriptions/:id/cancel
 */
async function cancelPrescription(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    if (userRole === "doctor" && userDoctorId) {
      const rx = await prescriptionService.getPrescriptionById(req.params.id);
      if (!rx) {
        return res.status(404).json({
          success: false,
          message: "Prescription not found",
        });
      }
      if (Number(rx.doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Doctors can only cancel their own prescriptions.",
        });
      }
    }

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const prescription = await prescriptionService.cancelPrescription(req.params.id, userContext);

    res.status(200).json({
      success: true,
      message: "Prescription cancelled successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error cancelling prescription:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to cancel prescription",
    });
  }
}

/**
 * Controller: addPrescriptionItem
 * POST /api/v1/prescriptions/:id/items
 */
async function addPrescriptionItem(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    if (userRole === "doctor" && userDoctorId) {
      const rx = await prescriptionService.getPrescriptionById(req.params.id);
      if (!rx) {
        return res.status(404).json({
          success: false,
          message: "Prescription not found",
        });
      }
      if (Number(rx.doctorId) !== Number(userDoctorId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Doctors can only add items to their own prescriptions.",
        });
      }
    }

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const prescription = await prescriptionService.addPrescriptionItem(req.params.id, req.body, userContext);

    res.status(201).json({
      success: true,
      message: "Prescription item added successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error adding prescription item:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to add prescription item",
    });
  }
}

/**
 * Controller: updatePrescriptionItem
 * PUT /api/v1/prescriptions/items/:itemId
 */
async function updatePrescriptionItem(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const prescription = await prescriptionService.updatePrescriptionItem(req.params.itemId, req.body, userContext);

    res.status(200).json({
      success: true,
      message: "Prescription item updated successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error updating prescription item:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update prescription item",
    });
  }
}

/**
 * Controller: removePrescriptionItem
 * DELETE /api/v1/prescriptions/items/:itemId
 */
async function removePrescriptionItem(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userDoctorId = req.user?.doctorId || req.user?.doctor_id;

    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
      doctorId: userDoctorId || null,
    };

    const prescription = await prescriptionService.removePrescriptionItem(req.params.itemId, userContext);

    res.status(200).json({
      success: true,
      message: "Prescription item removed successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error removing prescription item:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to remove prescription item",
    });
  }
}

module.exports = {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  cancelPrescription,
  addPrescriptionItem,
  updatePrescriptionItem,
  removePrescriptionItem,
};
