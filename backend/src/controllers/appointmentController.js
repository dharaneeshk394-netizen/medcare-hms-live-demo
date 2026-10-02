const appointmentService = require("../services/appointmentService");
const auditService = require("../services/auditService");

// Get all appointments
async function getAppointments(req, res) {
  try {
    const appointments =
      await appointmentService.getAllAppointments();

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("Error getting appointments:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get appointments",
    });
  }
}

// Get appointment by ID
async function getAppointmentById(req, res) {
  try {
    const appointment =
      await appointmentService.getAppointmentById(
        req.params.id
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Error getting appointment:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get appointment",
    });
  }
}

// Create appointment
async function createAppointment(req, res) {
  try {
    const {
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      status,
    } = req.body;

    if (
      !patientId ||
      !doctorId ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Patient, doctor, date, and time are required",
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
            "Access denied: Doctors cannot create appointments for other doctors.",
        });
      }

      // Enforce the authenticated doctor's ID
      targetDoctorId = Number(userDoctorId);
    }

    const appointment =
      await appointmentService.createAppointment({
        patientId,
        doctorId: targetDoctorId,
        appointmentDate,
        appointmentTime,
        reason: reason || "",
        status: status || "Scheduled",
      });

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
    });
  }
}

// Update appointment
async function updateAppointment(req, res) {
  try {
    const appointmentId = req.params.id;

    // Retrieve existing appointment to verify existence and ownership
    const existingAppointment =
      await appointmentService.getAppointmentById(appointmentId);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
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

      // Verify the appointment belongs to the logged-in doctor
      if (
        Number(existingAppointment.doctorId) !==
        Number(userDoctorId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: You are not authorized to update appointments for another doctor.",
        });
      }

      // Prevent reassigning appointment to a different doctor
      if (
        updatePayload.doctorId !== undefined &&
        updatePayload.doctorId !== null &&
        Number(updatePayload.doctorId) !== Number(userDoctorId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: Doctors cannot reassign appointments to another doctor.",
        });
      }

      // Prevent doctor from reassigning appointment to a different patient
      if (
        updatePayload.patientId !== undefined &&
        updatePayload.patientId !== null &&
        Number(updatePayload.patientId) !== Number(existingAppointment.patientId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: Doctors cannot change the patient associated with an appointment.",
        });
      }

      // Ensure doctor_id remains the authenticated doctor's ID
      updatePayload.doctorId = Number(userDoctorId);
      requiredDoctorId = Number(userDoctorId);
    }

    const appointment =
      await appointmentService.updateAppointment(
        appointmentId,
        updatePayload,
        requiredDoctorId
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update appointment",
    });
  }
}

// Delete appointment
async function deleteAppointment(req, res) {
  try {
    const appointment =
      await appointmentService.deleteAppointment(
        req.params.id
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    auditService.logAuditEvent({
      eventType: "APPOINTMENT_DELETE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "DELETE",
      resourceType: "APPOINTMENT",
      resourceId: String(req.params.id),
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete appointment",
    });
  }
}

module.exports = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
