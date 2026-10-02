/**
 * Temporary LocalStorage Fallback Store
 *
 * NOTE: This module serves as a decoupled client-side fallback/mock store.
 * The primary application architecture uses the Node.js Express REST API
 * communicating directly with PostgreSQL.
 *
 * Services (patientService, doctorService, etc.) do NOT silently fall back
 * to this storage when the REST API is unavailable, ensuring the frontend
 * properly reports backend connectivity/error states.
 */

import { initialPatients } from "../data/patients";

const STORAGE_KEYS = {
  PATIENTS: "medcare_patients",
  DOCTORS: "medcare_doctors",
  DEPARTMENTS: "medcare_departments",
  APPOINTMENTS: "medcare_appointments",
};

const DEFAULT_DEPARTMENTS = [
  {
    id: 1,
    departmentId: "DEP001",
    name: "Cardiology",
    description: "Comprehensive cardiovascular diagnosis, surgical care, and heart disease prevention.",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    departmentId: "DEP002",
    name: "Neurology",
    description: "Advanced neurological diagnostics, brain injury therapy, and nerve disorder management.",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    departmentId: "DEP003",
    name: "Orthopedics",
    description: "Joint replacement, fracture treatment, musculoskeletal rehabilitation, and sports medicine.",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    departmentId: "DEP004",
    name: "Pediatrics",
    description: "Specialized pediatric primary care, newborn care, and adolescent wellness.",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    departmentId: "DEP005",
    name: "General Medicine",
    description: "Routine health screening, internal medicine, chronic disease management, and consultations.",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 6,
    departmentId: "DEP006",
    name: "Emergency",
    description: "Round-the-clock emergency medical triage, acute critical care, and trauma management.",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_DOCTORS = [
  {
    id: 1,
    doctorId: "D001",
    name: "Dr. Priya Sharma",
    specialization: "Cardiologist",
    department: "Cardiology",
    phone: "9845123456",
    email: "priya.sharma@medcare.org",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    doctorId: "D002",
    name: "Dr. Anand Verma",
    specialization: "Neurologist",
    department: "Neurology",
    phone: "9845123457",
    email: "anand.verma@medcare.org",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    doctorId: "D003",
    name: "Dr. Kumar Rajesh",
    specialization: "Orthopedic Surgeon",
    department: "Orthopedics",
    phone: "9845123458",
    email: "kumar.rajesh@medcare.org",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    doctorId: "D004",
    name: "Dr. Sarah Joseph",
    specialization: "Pediatrician",
    department: "Pediatrics",
    phone: "9845123459",
    email: "sarah.joseph@medcare.org",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    doctorId: "D005",
    name: "Dr. Rajesh Nair",
    specialization: "General Physician",
    department: "General Medicine",
    phone: "9845123460",
    email: "rajesh.nair@medcare.org",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 6,
    doctorId: "D006",
    name: "Dr. Ananya Iyer",
    specialization: "Emergency Specialist",
    department: "Emergency",
    phone: "9845123461",
    email: "ananya.iyer@medcare.org",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function seedInitialPatients() {
  return initialPatients.map((p, index) => {
    const id = index + 1;
    const name = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
    return {
      id,
      patientId: `P${String(id).padStart(3, "0")}`,
      name,
      firstName: p.firstName || name.split(" ")[0] || "",
      lastName: p.lastName || name.split(" ").slice(1).join(" ") || "",
      age: Number(p.age) || 30,
      gender: p.gender || "Male",
      phone: p.phone || "9876543210",
      email: p.email || `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      bloodGroup: p.bloodGroup || "O+",
      status: p.status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

const DEFAULT_APPOINTMENTS = [
  {
    id: 1,
    appointmentId: "A001",
    patientId: 1,
    patientCode: "P001",
    patientName: "Arun Kumar",
    doctorId: 1,
    doctorCode: "D001",
    doctorName: "Dr. Priya Sharma",
    specialization: "Cardiologist",
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: "09:00",
    reason: "Annual cardiac health review and ECG",
    status: "Confirmed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    appointmentId: "A002",
    patientId: 2,
    patientCode: "P002",
    patientName: "Priya Devi",
    doctorId: 4,
    doctorCode: "D004",
    doctorName: "Dr. Sarah Joseph",
    specialization: "Pediatrician",
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: "10:30",
    reason: "Routine child health wellness and vaccine",
    status: "Scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    appointmentId: "A003",
    patientId: 3,
    patientCode: "P003",
    patientName: "Ravi Kumar",
    doctorId: 2,
    doctorCode: "D002",
    doctorName: "Dr. Anand Verma",
    specialization: "Neurologist",
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: "11:45",
    reason: "Chronic migraine follow-up consultation",
    status: "Completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    appointmentId: "A004",
    patientId: 4,
    patientCode: "P004",
    patientName: "Meena Devi",
    doctorId: 3,
    doctorCode: "D003",
    doctorName: "Dr. Kumar Rajesh",
    specialization: "Orthopedic Surgeon",
    appointmentDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    appointmentTime: "14:00",
    reason: "Knee joint stiffness and physiotherapy assessment",
    status: "Scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    appointmentId: "A005",
    patientId: 5,
    patientCode: "P005",
    patientName: "Karthik Rajan",
    doctorId: 5,
    doctorCode: "D005",
    doctorName: "Dr. Rajesh Nair",
    specialization: "General Physician",
    appointmentDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    appointmentTime: "15:30",
    reason: "Hypertension monitoring and medication check",
    status: "Confirmed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getStored(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Storage write error", e);
  }
}

// Ensure seeds are present
export function initLocalStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
    setStored(STORAGE_KEYS.PATIENTS, seedInitialPatients());
  }
  if (!localStorage.getItem(STORAGE_KEYS.DOCTORS)) {
    setStored(STORAGE_KEYS.DOCTORS, DEFAULT_DOCTORS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) {
    setStored(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
    setStored(STORAGE_KEYS.APPOINTMENTS, DEFAULT_APPOINTMENTS);
  }
}

// --- PATIENT STORAGE ---
export const PatientStore = {
  getAll: () => {
    initLocalStorage();
    return getStored(STORAGE_KEYS.PATIENTS, []);
  },
  getById: (id) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.PATIENTS, []);
    return list.find((item) => String(item.id) === String(id)) || null;
  },
  create: (data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.PATIENTS, []);
    const nextId = list.length > 0 ? Math.max(...list.map((p) => Number(p.id) || 0)) + 1 : 1;
    const name = (data.name || `${data.firstName || ""} ${data.lastName || ""}`).trim();
    const newPatient = {
      id: nextId,
      patientId: `P${String(nextId).padStart(3, "0")}`,
      name,
      firstName: data.firstName || name.split(" ")[0] || "",
      lastName: data.lastName || name.split(" ").slice(1).join(" ") || "",
      age: Number(data.age) || 0,
      gender: data.gender || "Other",
      phone: data.phone || "",
      email: data.email || "",
      bloodGroup: data.bloodGroup || "",
      status: data.status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newPatient);
    setStored(STORAGE_KEYS.PATIENTS, list);
    return newPatient;
  },
  update: (id, data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.PATIENTS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    const existing = list[index];
    const name = data.name !== undefined ? data.name : existing.name;
    const updated = {
      ...existing,
      ...data,
      name,
      age: data.age !== undefined ? Number(data.age) : existing.age,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    setStored(STORAGE_KEYS.PATIENTS, list);
    return updated;
  },
  delete: (id) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.PATIENTS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    const [deleted] = list.splice(index, 1);
    setStored(STORAGE_KEYS.PATIENTS, list);
    return deleted;
  },
};

// --- DOCTOR STORAGE ---
export const DoctorStore = {
  getAll: () => {
    initLocalStorage();
    return getStored(STORAGE_KEYS.DOCTORS, []);
  },
  getById: (id) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DOCTORS, []);
    return list.find((item) => String(item.id) === String(id)) || null;
  },
  create: (data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DOCTORS, []);
    const nextId = list.length > 0 ? Math.max(...list.map((d) => Number(d.id) || 0)) + 1 : 1;
    const newDoctor = {
      id: nextId,
      doctorId: `D${String(nextId).padStart(3, "0")}`,
      name: data.name.trim(),
      specialization: data.specialization.trim(),
      department: data.department || "",
      phone: data.phone || "",
      email: data.email || "",
      status: data.status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newDoctor);
    setStored(STORAGE_KEYS.DOCTORS, list);
    return newDoctor;
  },
  update: (id, data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DOCTORS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    const updated = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    setStored(STORAGE_KEYS.DOCTORS, list);
    return updated;
  },
  delete: (id) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DOCTORS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    const [deleted] = list.splice(index, 1);
    setStored(STORAGE_KEYS.DOCTORS, list);
    return deleted;
  },
};

// --- DEPARTMENT STORAGE ---
export const DepartmentStore = {
  getAll: () => {
    initLocalStorage();
    return getStored(STORAGE_KEYS.DEPARTMENTS, []);
  },
  getById: (id) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DEPARTMENTS, []);
    return list.find((item) => String(item.id) === String(id)) || null;
  },
  create: (data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DEPARTMENTS, []);
    const nextId = list.length > 0 ? Math.max(...list.map((d) => Number(d.id) || 0)) + 1 : 1;
    const newDepartment = {
      id: nextId,
      departmentId: `DEP${String(nextId).padStart(3, "0")}`,
      name: data.name.trim(),
      description: data.description || "",
      status: data.status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newDepartment);
    setStored(STORAGE_KEYS.DEPARTMENTS, list);
    return newDepartment;
  },
  update: (id, data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DEPARTMENTS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    const updated = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    setStored(STORAGE_KEYS.DEPARTMENTS, list);
    return updated;
  },
  delete: (id) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.DEPARTMENTS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    const [deleted] = list.splice(index, 1);
    setStored(STORAGE_KEYS.DEPARTMENTS, list);
    return deleted;
  },
};

// --- APPOINTMENT STORAGE ---
export const AppointmentStore = {
  getAll: () => {
    initLocalStorage();
    const appointments = getStored(STORAGE_KEYS.APPOINTMENTS, []);
    const patients = PatientStore.getAll();
    const doctors = DoctorStore.getAll();

    return appointments.map((a) => {
      const patient = patients.find((p) => String(p.id) === String(a.patientId));
      const doctor = doctors.find((d) => String(d.id) === String(a.doctorId));
      return {
        ...a,
        patientName: a.patientName || (patient ? patient.name : `Patient #${a.patientId}`),
        patientCode: a.patientCode || (patient ? patient.patientId : `P00${a.patientId}`),
        doctorName: a.doctorName || (doctor ? doctor.name : `Doctor #${a.doctorId}`),
        doctorCode: a.doctorCode || (doctor ? doctor.doctorId : `D00${a.doctorId}`),
        specialization: a.specialization || (doctor ? doctor.specialization : ""),
      };
    });
  },
  getById: (id) => {
    initLocalStorage();
    const list = AppointmentStore.getAll();
    return list.find((item) => String(item.id) === String(id)) || null;
  },
  create: (data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.APPOINTMENTS, []);
    const nextId = list.length > 0 ? Math.max(...list.map((a) => Number(a.id) || 0)) + 1 : 1;

    const patients = PatientStore.getAll();
    const doctors = DoctorStore.getAll();
    const patient = patients.find((p) => String(p.id) === String(data.patientId));
    const doctor = doctors.find((d) => String(d.id) === String(data.doctorId));

    const newAppointment = {
      id: nextId,
      appointmentId: `A${String(nextId).padStart(3, "0")}`,
      patientId: Number(data.patientId),
      doctorId: Number(data.doctorId),
      patientCode: patient ? patient.patientId : `P00${data.patientId}`,
      patientName: patient ? patient.name : `Patient #${data.patientId}`,
      doctorCode: doctor ? doctor.doctorId : `D00${data.doctorId}`,
      doctorName: doctor ? doctor.name : `Doctor #${data.doctorId}`,
      specialization: doctor ? doctor.specialization : "",
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      reason: data.reason || "",
      status: data.status || "Scheduled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(newAppointment);
    setStored(STORAGE_KEYS.APPOINTMENTS, list);
    return newAppointment;
  },
  update: (id, data) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.APPOINTMENTS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;

    const patients = PatientStore.getAll();
    const doctors = DoctorStore.getAll();
    const pId = data.patientId !== undefined ? data.patientId : list[index].patientId;
    const dId = data.doctorId !== undefined ? data.doctorId : list[index].doctorId;
    const patient = patients.find((p) => String(p.id) === String(pId));
    const doctor = doctors.find((d) => String(d.id) === String(dId));

    const updated = {
      ...list[index],
      ...data,
      patientId: Number(pId),
      doctorId: Number(dId),
      patientCode: patient ? patient.patientId : list[index].patientCode,
      patientName: patient ? patient.name : list[index].patientName,
      doctorCode: doctor ? doctor.doctorId : list[index].doctorCode,
      doctorName: doctor ? doctor.name : list[index].doctorName,
      specialization: doctor ? doctor.specialization : list[index].specialization,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    setStored(STORAGE_KEYS.APPOINTMENTS, list);
    return updated;
  },
  delete: (id) => {
    initLocalStorage();
    const list = getStored(STORAGE_KEYS.APPOINTMENTS, []);
    const index = list.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    const [deleted] = list.splice(index, 1);
    setStored(STORAGE_KEYS.APPOINTMENTS, list);
    return deleted;
  },
};
