const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

/**
 * Check if a host is local (localhost, 127.0.0.1, ::1, or unix domain socket)
 */
function isLocalHost(hostname) {
  if (!hostname) return true;
  const cleanHost = hostname.toLowerCase().trim();
  return (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '::1' ||
    cleanHost.startsWith('/')
  );
}

// Support DATABASE_URL, standard PostgreSQL environment variables (PG* / DB_*), and Cloud SQL variables (SQL_*)
let poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  if (!process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')) {
    if (process.env.DB_SSL !== 'false' && process.env.PGSSLMODE !== 'disable') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  }
} else {
  const host = process.env.PGHOST || process.env.SQL_HOST || process.env.DB_HOST || '127.0.0.1';
  const isUnixSocket = host.startsWith('/');
  const port = isUnixSocket ? undefined : Number(process.env.PGPORT || process.env.DB_PORT) || 5432;
  const database = process.env.PGDATABASE || process.env.SQL_DB_NAME || process.env.DB_NAME || 'hospital_management';
  const user = process.env.PGUSER || process.env.SQL_USER || process.env.SQL_ADMIN_USER || process.env.DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_PASSWORD || '';

  poolConfig = {
    host,
    ...(port ? { port } : {}),
    database,
    user,
    password,
  };

  if (!isLocalHost(host) && (process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

async function restoreDatabase() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('SAFETY WARNING: Database seed/reset operation aborted. NODE_ENV is set to "production".');
    console.error('To run this operation against production, you must explicitly set ALLOW_PRODUCTION_SEED=true.');
    process.exit(1);
  }

  const client = await pool.connect();

  async function safeQuery(sql, params = []) {
    try {
      return await client.query(sql, params);
    } catch (err) {
      if (err.code === '42501' || err.message.includes('must be owner') || err.message.includes('permission denied')) {
        return null;
      }
      throw err;
    }
  }

  try {
    console.log('--- Starting MedCare Hospital Management System Database Setup ---');

    console.log('1. Creating sequences...');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.users_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.admissions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.appointments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.departments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.doctors_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.patients_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.prescriptions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.prescription_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.prescription_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.medical_records_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.medical_record_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.staff_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.staff_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.invoices_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.invoice_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.payments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.payment_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.audit_logs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.medicines_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.medicine_code_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.medicine_batches_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.medicine_dispensations_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.dispensation_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.lab_test_catalog_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.lab_test_code_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.lab_orders_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.lab_order_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.lab_order_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
    await safeQuery('CREATE SEQUENCE IF NOT EXISTS public.notifications_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');

    console.log('2. Creating tables, indexes, and constraints...');
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.departments (
        id integer NOT NULL DEFAULT nextval('public.departments_id_seq'::regclass),
        department_id character varying(20) NOT NULL,
        name character varying(100) NOT NULL,
        description character varying(255),
        status character varying(20) DEFAULT 'Active'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT departments_pkey PRIMARY KEY (id),
        CONSTRAINT departments_department_id_key UNIQUE (department_id),
        CONSTRAINT departments_name_key UNIQUE (name)
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.doctors (
        id integer NOT NULL DEFAULT nextval('public.doctors_id_seq'::regclass),
        doctor_id character varying(20) NOT NULL,
        name character varying(100) NOT NULL,
        specialization character varying(100) NOT NULL,
        phone character varying(20) NOT NULL,
        email character varying(150),
        department character varying(100),
        status character varying(20) DEFAULT 'Active'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT doctors_pkey PRIMARY KEY (id),
        CONSTRAINT doctors_doctor_id_key UNIQUE (doctor_id)
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.users (
        id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
        full_name character varying(150) NOT NULL,
        username character varying(100) NOT NULL,
        email character varying(255) NOT NULL,
        password_hash character varying(255) NOT NULL,
        role character varying(50) NOT NULL DEFAULT 'receptionist'::character varying,
        is_active boolean NOT NULL DEFAULT true,
        doctor_id integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT users_pkey PRIMARY KEY (id),
        CONSTRAINT users_username_key UNIQUE (username),
        CONSTRAINT users_email_key UNIQUE (email),
        CONSTRAINT users_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL,
        CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'doctor'::character varying, 'receptionist'::character varying])::text[])))
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.session (
        sid character varying NOT NULL,
        sess json NOT NULL,
        expire timestamp(6) without time zone NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      );
    `);
    await safeQuery(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON public.session(expire);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id integer NOT NULL DEFAULT nextval('public.audit_logs_id_seq'::regclass),
        event_type character varying(50) NOT NULL,
        user_id integer,
        role character varying(50),
        action character varying(50) NOT NULL,
        resource_type character varying(50) NOT NULL,
        resource_id character varying(100),
        outcome character varying(20) NOT NULL DEFAULT 'SUCCESS'::character varying,
        ip_address character varying(45),
        created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
      );
    `);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.patients (
        id integer NOT NULL DEFAULT nextval('public.patients_id_seq'::regclass),
        patient_id character varying(20) NOT NULL,
        name character varying(100) NOT NULL,
        age integer NOT NULL,
        gender character varying(20) NOT NULL,
        phone character varying(20) NOT NULL,
        email character varying(150),
        blood_group character varying(10),
        status character varying(20) DEFAULT 'Active'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT patients_pkey PRIMARY KEY (id),
        CONSTRAINT patients_patient_id_key UNIQUE (patient_id)
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.appointments (
        id integer NOT NULL DEFAULT nextval('public.appointments_id_seq'::regclass),
        appointment_id character varying(20) NOT NULL,
        patient_id integer NOT NULL,
        doctor_id integer NOT NULL,
        appointment_date date NOT NULL,
        appointment_time time without time zone NOT NULL,
        reason character varying(255),
        status character varying(20) DEFAULT 'Scheduled'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT appointments_pkey PRIMARY KEY (id),
        CONSTRAINT appointments_appointment_id_key UNIQUE (appointment_id),
        CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
        CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.admissions (
        id integer NOT NULL DEFAULT nextval('public.admissions_id_seq'::regclass),
        admission_id character varying(20) NOT NULL,
        patient_id integer NOT NULL,
        doctor_id integer NOT NULL,
        room_number character varying(20),
        bed_number character varying(20),
        admission_date date NOT NULL,
        expected_discharge_date date,
        actual_discharge_date date,
        diagnosis character varying(255),
        status character varying(30) DEFAULT 'Admitted'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT admissions_pkey PRIMARY KEY (id),
        CONSTRAINT admissions_admission_id_key UNIQUE (admission_id),
        CONSTRAINT admissions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
        CONSTRAINT admissions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.prescriptions (
        id integer NOT NULL DEFAULT nextval('public.prescriptions_id_seq'::regclass),
        prescription_number character varying(30) NOT NULL DEFAULT ('RX-'::text || lpad((nextval('public.prescription_number_seq'::regclass))::text, 6, '0'::text)),
        patient_id integer NOT NULL,
        doctor_id integer NOT NULL,
        appointment_id integer,
        prescription_date date NOT NULL DEFAULT CURRENT_DATE,
        diagnosis_notes text,
        status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_by integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT prescriptions_pkey PRIMARY KEY (id),
        CONSTRAINT prescriptions_prescription_number_key UNIQUE (prescription_number),
        CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
        CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE RESTRICT,
        CONSTRAINT prescriptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL,
        CONSTRAINT prescriptions_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.prescription_items (
        id integer NOT NULL DEFAULT nextval('public.prescription_items_id_seq'::regclass),
        prescription_id integer NOT NULL,
        medicine_name character varying(255) NOT NULL,
        dosage character varying(100) NOT NULL,
        frequency character varying(100) NOT NULL,
        duration character varying(100) NOT NULL,
        quantity integer,
        instructions text,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT prescription_items_pkey PRIMARY KEY (id),
        CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE RESTRICT,
        CONSTRAINT prescription_items_medicine_name_check CHECK (length(trim(medicine_name)) > 0),
        CONSTRAINT prescription_items_quantity_check CHECK (quantity IS NULL OR quantity > 0)
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON public.prescriptions(appointment_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.medical_records (
        id integer NOT NULL DEFAULT nextval('public.medical_records_id_seq'::regclass),
        record_number character varying(30) NOT NULL DEFAULT ('MR-'::text || lpad((nextval('public.medical_record_number_seq'::regclass))::text, 6, '0'::text)),
        patient_id integer NOT NULL,
        doctor_id integer NOT NULL,
        appointment_id integer,
        record_date date NOT NULL DEFAULT CURRENT_DATE,
        record_type character varying(50) NOT NULL DEFAULT 'General'::character varying,
        chief_complaint text,
        diagnosis text NOT NULL,
        clinical_notes text,
        treatment_plan text,
        status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_by integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT medical_records_pkey PRIMARY KEY (id),
        CONSTRAINT medical_records_record_number_key UNIQUE (record_number),
        CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
        CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE RESTRICT,
        CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL,
        CONSTRAINT medical_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT medical_records_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ARCHIVED'::character varying, 'AMENDED'::character varying])::text[])))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON public.medical_records(doctor_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id ON public.medical_records(appointment_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medical_records_record_date ON public.medical_records(record_date);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medical_records_record_type ON public.medical_records(record_type);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medical_records_status ON public.medical_records(status);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.staff (
        id integer NOT NULL DEFAULT nextval('public.staff_id_seq'::regclass),
        staff_number character varying(30) NOT NULL DEFAULT ('STF-'::text || lpad((nextval('public.staff_number_seq'::regclass))::text, 6, '0'::text)),
        first_name character varying(50) NOT NULL,
        last_name character varying(50) NOT NULL,
        department_id integer,
        designation character varying(100) NOT NULL,
        phone character varying(20) NOT NULL,
        email character varying(150),
        date_of_joining date NOT NULL DEFAULT CURRENT_DATE,
        employment_status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_by integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT staff_pkey PRIMARY KEY (id),
        CONSTRAINT staff_staff_number_key UNIQUE (staff_number),
        CONSTRAINT staff_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL,
        CONSTRAINT staff_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT staff_employment_status_check CHECK (((employment_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'ON_LEAVE'::character varying])::text[])))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_staff_staff_number ON public.staff(staff_number);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_staff_department_id ON public.staff(department_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_staff_employment_status ON public.staff(employment_status);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.invoices (
        id integer NOT NULL DEFAULT nextval('public.invoices_id_seq'::regclass),
        invoice_number character varying(50) NOT NULL DEFAULT ('INV-'::text || lpad((nextval('public.invoice_number_seq'::regclass))::text, 6, '0'::text)),
        patient_id integer NOT NULL,
        appointment_id integer,
        admission_id integer,
        invoice_date date NOT NULL DEFAULT CURRENT_DATE,
        due_date date,
        subtotal numeric(12,2) NOT NULL DEFAULT 0.00,
        discount numeric(12,2) NOT NULL DEFAULT 0.00,
        tax numeric(12,2) NOT NULL DEFAULT 0.00,
        total_amount numeric(12,2) NOT NULL DEFAULT 0.00,
        paid_amount numeric(12,2) NOT NULL DEFAULT 0.00,
        balance_amount numeric(12,2) NOT NULL DEFAULT 0.00,
        status character varying(30) NOT NULL DEFAULT 'PENDING'::character varying,
        billing_notes text,
        created_by integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT invoices_pkey PRIMARY KEY (id),
        CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number),
        CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
        CONSTRAINT invoices_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL,
        CONSTRAINT invoices_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE SET NULL,
        CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PARTIAL'::character varying, 'PAID'::character varying, 'CANCELLED'::character varying, 'OVERDUE'::character varying])::text[])))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.invoice_items (
        id integer NOT NULL DEFAULT nextval('public.invoice_items_id_seq'::regclass),
        invoice_id integer NOT NULL,
        item_type character varying(50) NOT NULL DEFAULT 'General'::character varying,
        description character varying(255) NOT NULL,
        quantity integer NOT NULL DEFAULT 1,
        unit_price numeric(12,2) NOT NULL DEFAULT 0.00,
        total_price numeric(12,2) NOT NULL DEFAULT 0.00,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
        CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT,
        CONSTRAINT invoice_items_quantity_check CHECK (quantity > 0),
        CONSTRAINT invoice_items_item_type_check CHECK (((item_type)::text = ANY ((ARRAY['Consultation'::character varying, 'Room Charge'::character varying, 'Procedure'::character varying, 'Medication'::character varying, 'Lab Test'::character varying, 'General'::character varying, 'Other'::character varying])::text[])))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.payments (
        id integer NOT NULL DEFAULT nextval('public.payments_id_seq'::regclass),
        payment_number character varying(50) NOT NULL DEFAULT ('PAY-'::text || lpad((nextval('public.payment_number_seq'::regclass))::text, 6, '0'::text)),
        invoice_id integer NOT NULL,
        amount numeric(12,2) NOT NULL,
        payment_method character varying(50) NOT NULL DEFAULT 'Cash'::character varying,
        payment_date date NOT NULL DEFAULT CURRENT_DATE,
        reference_number character varying(100),
        notes text,
        received_by integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT payments_pkey PRIMARY KEY (id),
        CONSTRAINT payments_payment_number_key UNIQUE (payment_number),
        CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT,
        CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT payments_amount_check CHECK (amount > 0),
        CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['Cash'::character varying, 'Credit Card'::character varying, 'Debit Card'::character varying, 'Insurance'::character varying, 'Bank Transfer'::character varying, 'Online'::character varying, 'Other'::character varying])::text[])))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.medicines (
        id integer NOT NULL DEFAULT nextval('public.medicines_id_seq'::regclass),
        medicine_code character varying(30) NOT NULL DEFAULT ('MED-'::text || lpad((nextval('public.medicine_code_seq'::regclass))::text, 6, '0'::text)),
        name character varying(255) NOT NULL,
        generic_name character varying(255),
        category character varying(100) NOT NULL,
        dosage_form character varying(50) NOT NULL,
        strength character varying(100),
        unit_price numeric(10,2) NOT NULL DEFAULT 0.00,
        reorder_level integer NOT NULL DEFAULT 10,
        status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT medicines_pkey PRIMARY KEY (id),
        CONSTRAINT medicines_medicine_code_key UNIQUE (medicine_code),
        CONSTRAINT medicines_unit_price_check CHECK (unit_price >= 0),
        CONSTRAINT medicines_reorder_level_check CHECK (reorder_level >= 0),
        CONSTRAINT medicines_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'DISCONTINUED'::character varying])::text[])))
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.medicine_batches (
        id integer NOT NULL DEFAULT nextval('public.medicine_batches_id_seq'::regclass),
        batch_number character varying(50) NOT NULL,
        medicine_id integer NOT NULL,
        quantity_in_stock integer NOT NULL DEFAULT 0,
        expiry_date date NOT NULL,
        purchase_price numeric(10,2) NOT NULL DEFAULT 0.00,
        selling_price numeric(10,2) NOT NULL DEFAULT 0.00,
        supplier_name character varying(150),
        status character varying(20) NOT NULL DEFAULT 'AVAILABLE'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT medicine_batches_pkey PRIMARY KEY (id),
        CONSTRAINT medicine_batches_medicine_batch_key UNIQUE (medicine_id, batch_number),
        CONSTRAINT medicine_batches_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicines(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_batches_quantity_in_stock_check CHECK (quantity_in_stock >= 0),
        CONSTRAINT medicine_batches_purchase_price_check CHECK (purchase_price >= 0),
        CONSTRAINT medicine_batches_selling_price_check CHECK (selling_price >= 0),
        CONSTRAINT medicine_batches_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'EXPIRED'::character varying, 'DEPLETED'::character varying])::text[])))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine_id ON public.medicine_batches(medicine_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry_date ON public.medicine_batches(expiry_date);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medicine_batches_status ON public.medicine_batches(status);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.medicine_dispensations (
        id integer NOT NULL DEFAULT nextval('public.medicine_dispensations_id_seq'::regclass),
        dispensation_number character varying(30) NOT NULL DEFAULT ('DSP-'::text || lpad((nextval('public.dispensation_number_seq'::regclass))::text, 6, '0'::text)),
        prescription_id integer,
        prescription_item_id integer,
        medicine_id integer NOT NULL,
        batch_id integer NOT NULL,
        patient_id integer NOT NULL,
        quantity_dispensed integer NOT NULL,
        unit_price numeric(10,2) NOT NULL,
        total_price numeric(10,2) NOT NULL,
        dispensed_by integer,
        dispensed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        notes text,
        CONSTRAINT medicine_dispensations_pkey PRIMARY KEY (id),
        CONSTRAINT medicine_dispensations_dispensation_number_key UNIQUE (dispensation_number),
        CONSTRAINT medicine_dispensations_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL,
        CONSTRAINT medicine_dispensations_prescription_item_id_fkey FOREIGN KEY (prescription_item_id) REFERENCES public.prescription_items(id) ON DELETE SET NULL,
        CONSTRAINT medicine_dispensations_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicines(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_dispensations_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.medicine_batches(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_dispensations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
        CONSTRAINT medicine_dispensations_dispensed_by_fkey FOREIGN KEY (dispensed_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT medicine_dispensations_quantity_dispensed_check CHECK (quantity_dispensed > 0)
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medicine_dispensations_prescription_id ON public.medicine_dispensations(prescription_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medicine_dispensations_patient_id ON public.medicine_dispensations(patient_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_medicine_dispensations_batch_id ON public.medicine_dispensations(batch_id);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.lab_test_catalog (
        id integer NOT NULL DEFAULT nextval('public.lab_test_catalog_id_seq'::regclass),
        test_code character varying(30) NOT NULL DEFAULT ('LAB-'::text || lpad((nextval('public.lab_test_code_seq'::regclass))::text, 6, '0'::text)),
        name character varying(255) NOT NULL,
        category character varying(100) NOT NULL,
        sample_type character varying(50) NOT NULL,
        reference_range character varying(255),
        unit character varying(50),
        price numeric(10,2) NOT NULL DEFAULT 0.00,
        turnaround_hours integer DEFAULT 24,
        status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT lab_test_catalog_pkey PRIMARY KEY (id),
        CONSTRAINT lab_test_catalog_test_code_key UNIQUE (test_code),
        CONSTRAINT lab_test_catalog_price_check CHECK (price >= 0),
        CONSTRAINT lab_test_catalog_turnaround_hours_check CHECK (turnaround_hours >= 1),
        CONSTRAINT lab_test_catalog_status_check CHECK ((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'DISCONTINUED'::character varying])::text[]))
      );
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.lab_orders (
        id integer NOT NULL DEFAULT nextval('public.lab_orders_id_seq'::regclass),
        order_number character varying(30) NOT NULL DEFAULT ('ORD-LAB-'::text || lpad((nextval('public.lab_order_number_seq'::regclass))::text, 6, '0'::text)),
        patient_id integer NOT NULL,
        doctor_id integer,
        ordered_by integer,
        priority character varying(20) NOT NULL DEFAULT 'Routine'::character varying,
        status character varying(30) NOT NULL DEFAULT 'PENDING'::character varying,
        clinical_notes text,
        sample_collected_at timestamp without time zone,
        completed_at timestamp without time zone,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT lab_orders_pkey PRIMARY KEY (id),
        CONSTRAINT lab_orders_order_number_key UNIQUE (order_number),
        CONSTRAINT lab_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
        CONSTRAINT lab_orders_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL,
        CONSTRAINT lab_orders_ordered_by_fkey FOREIGN KEY (ordered_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT lab_orders_priority_check CHECK ((priority)::text = ANY ((ARRAY['Routine'::character varying, 'Urgent'::character varying, 'STAT'::character varying])::text[])),
        CONSTRAINT lab_orders_status_check CHECK ((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SAMPLE_COLLECTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON public.lab_orders(patient_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor_id ON public.lab_orders(doctor_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.lab_orders(status);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.lab_order_items (
        id integer NOT NULL DEFAULT nextval('public.lab_order_items_id_seq'::regclass),
        order_id integer NOT NULL,
        test_id integer NOT NULL,
        status character varying(30) NOT NULL DEFAULT 'PENDING'::character varying,
        price numeric(10,2) NOT NULL,
        result_value text,
        result_flag character varying(20) DEFAULT 'NORMAL'::character varying,
        reference_range character varying(255),
        remarks text,
        completed_by integer,
        completed_at timestamp without time zone,
        CONSTRAINT lab_order_items_pkey PRIMARY KEY (id),
        CONSTRAINT lab_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.lab_orders(id) ON DELETE CASCADE,
        CONSTRAINT lab_order_items_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.lab_test_catalog(id) ON DELETE RESTRICT,
        CONSTRAINT lab_order_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT lab_order_items_price_check CHECK (price >= 0),
        CONSTRAINT lab_order_items_status_check CHECK ((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])),
        CONSTRAINT lab_order_items_result_flag_check CHECK ((result_flag)::text = ANY ((ARRAY['NORMAL'::character varying, 'ABNORMAL'::character varying, 'CRITICAL'::character varying])::text[]))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_lab_order_items_order_id ON public.lab_order_items(order_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_lab_order_items_test_id ON public.lab_order_items(test_id);`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id integer NOT NULL DEFAULT nextval('public.notifications_id_seq'::regclass),
        user_id integer NOT NULL,
        title character varying(255) NOT NULL,
        message text NOT NULL,
        type character varying(50) NOT NULL DEFAULT 'SYSTEM'::character varying,
        link character varying(255),
        is_read boolean NOT NULL DEFAULT false,
        read_at timestamp without time zone,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT notifications_pkey PRIMARY KEY (id),
        CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
        CONSTRAINT notifications_type_check CHECK ((type)::text = ANY ((ARRAY['APPOINTMENT'::character varying, 'LAB_RESULT'::character varying, 'PHARMACY'::character varying, 'ADMISSION'::character varying, 'BILLING'::character varying, 'SYSTEM'::character varying])::text[]))
      );
    `);

    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;`);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.system_settings (
        id integer NOT NULL PRIMARY KEY DEFAULT 1,
        hospital_name character varying(255) NOT NULL DEFAULT 'MedCare Hospital',
        hospital_logo text,
        address_line_1 character varying(255) DEFAULT '100 Medical Center Parkway',
        address_line_2 character varying(255) DEFAULT 'Suite 400',
        city character varying(100) DEFAULT 'Metropolis',
        state character varying(100) DEFAULT 'NY',
        postal_code character varying(20) DEFAULT '10001',
        country character varying(100) DEFAULT 'United States',
        phone character varying(50) DEFAULT '+1 (555) 019-2834',
        email character varying(255) DEFAULT 'info@medcare-hospital.org',
        website character varying(255) DEFAULT 'https://medcare-hospital.org',
        currency_code character varying(10) DEFAULT 'USD',
        currency_symbol character varying(10) DEFAULT '$',
        tax_enabled boolean DEFAULT true,
        tax_name character varying(50) DEFAULT 'Tax',
        tax_rate numeric(5,2) DEFAULT 5.00,
        invoice_footer text DEFAULT 'Thank you for choosing MedCare Hospital. Official computer-generated tax invoice.',
        prescription_header text DEFAULT 'MedCare Hospital Outpatient & Clinical Care Department',
        report_header text DEFAULT 'MedCare Hospital Diagnostic Laboratory & Clinical Pathology Department',
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_by integer REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT single_row_check CHECK (id = 1)
      );
    `);

    await safeQuery(`
      INSERT INTO public.system_settings (
        id, hospital_name, hospital_logo, address_line_1, address_line_2,
        city, state, postal_code, country, phone, email, website,
        currency_code, currency_symbol, tax_enabled, tax_name, tax_rate,
        invoice_footer, prescription_header, report_header
      )
      VALUES (
        1, 'MedCare Hospital', NULL, '100 Medical Center Parkway', 'Suite 400',
        'Metropolis', 'NY', '10001', 'United States', '+1 (555) 019-2834', 'info@medcare-hospital.org', 'https://medcare-hospital.org',
        'USD', '$', true, 'Tax', 5.00,
        'Thank you for choosing MedCare Hospital. Official computer-generated tax invoice.',
        'MedCare Hospital Outpatient & Clinical Care Department',
        'MedCare Hospital Diagnostic Laboratory & Clinical Pathology Department'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // -------------------------------------------------------------
    // 3. SEEDING FICTIONAL DEMO DATA ACROSS ALL MODULES
    // -------------------------------------------------------------
    console.log('3. Seeding departments...');
    const departments = [
      [1, 'DEP-001', 'Cardiology & Heart Care', 'Comprehensive cardiovascular diagnostics, inpatient telemetry, and coronary care', 'Active'],
      [2, 'DEP-002', 'Neurology & Neurosurgery', 'Specialized brain, spine, and nervous system diagnostic and clinical therapies', 'Active'],
      [3, 'DEP-003', 'Orthopedics & Joint Care', 'Bone fracture stabilization, arthroscopy, and musculoskeletal rehabilitation', 'Active'],
      [4, 'DEP-004', 'Pediatrics & Neonatal', 'Compassionate primary and acute medical care for infants, children, and adolescents', 'Active'],
      [5, 'DEP-005', 'General Internal Medicine', 'Comprehensive adult disease diagnostics, chronic illness management, and preventative health', 'Active'],
      [6, 'DEP-006', 'Dermatology & Skin Health', 'Clinical dermatology, skin oncology, and autoimmune dermatological condition management', 'Active'],
      [7, 'DEP-007', 'Emergency & Trauma Care', '24/7 Level-1 trauma response, urgent stabilization, and resuscitation services', 'Active'],
      [8, 'DEP-008', 'Obstetrics & Gynecology', 'Maternal-fetal medicine, prenatal labor monitoring, and women’s reproductive health', 'Active'],
      [9, 'DEP-009', 'Otolaryngology (ENT)', 'Ear, nose, throat, head, and neck surgical and non-surgical treatments', 'Active'],
      [10, 'DEP-010', 'Pathology & Diagnostic LIS', 'Clinical biochemistry, hematological analysis, microbiology, and histology', 'Active'],
      [11, 'DEP-011', 'Diagnostic Radiology & Imaging', 'Digital X-ray, multi-slice computed tomography (CT), ultrasound, and MRI scans', 'Active'],
      [12, 'DEP-012', 'Pharmacy & Therapeutics', 'Centralized institutional formulary, unit-dose dispensation, and clinical pharmacy', 'Active'],
    ];
    for (const d of departments) {
      await client.query(
        `INSERT INTO public.departments (id, department_id, name, description, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status;`,
        d
      );
    }

    console.log('4. Seeding doctors...');
    const doctors = [
      [1, 'DOC-001', 'Dr. Sarah Mitchell', 'Cardiology', '555-0101', 'sarah.mitchell@medcare-hms.local', 'Cardiology & Heart Care', 'Active'],
      [2, 'DOC-002', 'Dr. Priya Sharma', 'Pediatrics', '555-0102', 'priya.sharma@medcare-hms.local', 'Pediatrics & Neonatal', 'Active'],
      [3, 'DOC-003', 'Dr. Marcus Vance', 'Neurology', '555-0103', 'marcus.vance@medcare-hms.local', 'Neurology & Neurosurgery', 'Active'],
      [4, 'DOC-004', 'Dr. Elena Rostova', 'Orthopedics', '555-0104', 'elena.rostova@medcare-hms.local', 'Orthopedics & Joint Care', 'Active'],
      [5, 'DOC-005', 'Dr. James Wilson', 'General Medicine', '555-0105', 'james.wilson@medcare-hms.local', 'General Internal Medicine', 'Active'],
      [6, 'DOC-006', 'Dr. Aisha Patel', 'Obstetrics & Gynecology', '555-0106', 'aisha.patel@medcare-hms.local', 'Obstetrics & Gynecology', 'Active'],
      [7, 'DOC-007', 'Dr. Robert Chen', 'Emergency Medicine', '555-0107', 'robert.chen@medcare-hms.local', 'Emergency & Trauma Care', 'Active'],
      [8, 'DOC-008', 'Dr. Sophia Taylor', 'Dermatology', '555-0108', 'sophia.taylor@medcare-hms.local', 'Dermatology & Skin Health', 'Active'],
    ];
    for (const doc of doctors) {
      await client.query(
        `INSERT INTO public.doctors (id, doctor_id, name, specialization, phone, email, department, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, specialization = EXCLUDED.specialization, department = EXCLUDED.department, status = EXCLUDED.status;`,
        doc
      );
    }

    console.log('5. Seeding demo users...');
    const demoPasswordHash = bcrypt.hashSync('Demo@1234', 10);
    const users = [
      [1, 'MedCare Administrator', 'admin', 'admin@medcare-hms.local', demoPasswordHash, 'admin', true, null],
      [2, 'Dr. Sarah Mitchell', 'dr.sarah', 'sarah.mitchell@medcare-hms.local', demoPasswordHash, 'doctor', true, 1],
      [3, 'Emily Davis', 'receptionist', 'receptionist@medcare-hms.local', demoPasswordHash, 'receptionist', true, null],
      [4, 'Dr. Priya Sharma', 'dr.priya', 'priya.sharma@medcare-hms.local', demoPasswordHash, 'doctor', true, 2],
      [5, 'Dr. Marcus Vance', 'dr.marcus', 'marcus.vance@medcare-hms.local', demoPasswordHash, 'doctor', true, 3],
      [6, 'Dr. Elena Rostova', 'dr.elena', 'elena.rostova@medcare-hms.local', demoPasswordHash, 'doctor', true, 4],
      [7, 'Dr. James Wilson', 'dr.james', 'james.wilson@medcare-hms.local', demoPasswordHash, 'doctor', true, 5],
      [8, 'James Miller', 'receptionist2', 'james.miller@medcare-hms.local', demoPasswordHash, 'receptionist', true, null],
    ];
    for (const u of users) {
      await client.query(
        `INSERT INTO public.users (id, full_name, username, email, password_hash, role, is_active, doctor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, username = EXCLUDED.username, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = EXCLUDED.is_active, doctor_id = EXCLUDED.doctor_id;`,
        u
      );
    }

    console.log('6. Seeding fictional patients...');
    const patients = [
      [1, 'PT-001', 'Arthur Pendelton', 58, 'Male', '555-0201', 'arthur.p@fictional-hms.example', 'O+', 'Active', '2026-06-10 09:15:00'],
      [2, 'PT-002', 'Beatrice Montgomery', 34, 'Female', '555-0202', 'beatrice.m@fictional-hms.example', 'A+', 'Active', '2026-06-25 14:30:00'],
      [3, 'PT-003', 'Charles Sterling', 45, 'Male', '555-0203', 'charles.s@fictional-hms.example', 'B+', 'Active', '2026-07-08 11:20:00'],
      [4, 'PT-004', 'Dorothy Gale', 29, 'Female', '555-0204', 'dorothy.g@fictional-hms.example', 'AB+', 'Active', '2026-07-19 16:45:00'],
      [5, 'PT-005', 'Edward Harrison', 62, 'Male', '555-0205', 'edward.h@fictional-hms.example', 'O-', 'Active', '2026-07-28 08:30:00'],
      [6, 'PT-006', 'Fiona Gallagher', 21, 'Female', '555-0206', 'fiona.g@fictional-hms.example', 'A-', 'Active', '2026-08-04 10:15:00'],
      [7, 'PT-007', 'George Bailey', 50, 'Male', '555-0207', 'george.b@fictional-hms.example', 'B-', 'Active', '2026-08-14 13:00:00'],
      [8, 'PT-008', 'Hannah Abbott', 12, 'Female', '555-0208', 'hannah.a@fictional-hms.example', 'O+', 'Active', '2026-08-22 15:30:00'],
      [9, 'PT-009', 'Ian Malcolm', 41, 'Male', '555-0209', 'ian.m@fictional-hms.example', 'A+', 'Active', '2026-08-29 09:45:00'],
      [10, 'PT-010', 'Julia Bennett', 38, 'Female', '555-0210', 'julia.b@fictional-hms.example', 'B+', 'Active', '2026-09-05 11:00:00'],
      [11, 'PT-011', 'Kevin Flynn', 67, 'Male', '555-0211', 'kevin.f@fictional-hms.example', 'O+', 'Active', '2026-09-12 14:15:00'],
      [12, 'PT-012', 'Laura Croft', 33, 'Female', '555-0212', 'laura.c@fictional-hms.example', 'AB-', 'Active', '2026-09-18 16:30:00'],
      [13, 'PT-013', 'Michael Scott', 47, 'Male', '555-0213', 'michael.s@fictional-hms.example', 'A+', 'Active', '2026-09-22 10:00:00'],
      [14, 'PT-014', 'Nora Helmer', 28, 'Female', '555-0214', 'nora.h@fictional-hms.example', 'O+', 'Active', '2026-09-26 12:45:00'],
      [15, 'PT-015', 'Oliver Twist', 9, 'Male', '555-0215', 'oliver.t@fictional-hms.example', 'B+', 'Active', '2026-09-30 08:30:00'],
    ];
    for (const p of patients) {
      await client.query(
        `INSERT INTO public.patients (id, patient_id, name, age, gender, phone, email, blood_group, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, age = EXCLUDED.age, blood_group = EXCLUDED.blood_group, status = EXCLUDED.status, created_at = EXCLUDED.created_at;`,
        p
      );
    }

    console.log('7. Seeding hospital staff...');
    const staff = [
      [1, 'STF-000001', 'Clara', 'Oswald', 7, 'Nursing Supervisor', '555-0301', 'clara.oswald@medcare-hms.local', '2025-01-10', 'ACTIVE'],
      [2, 'STF-000002', 'Donna', 'Noble', 12, 'Chief Pharmacist', '555-0302', 'donna.noble@medcare-hms.local', '2025-02-15', 'ACTIVE'],
      [3, 'STF-000003', 'Martha', 'Jones', 10, 'Senior Medical Lab Scientist', '555-0303', 'martha.jones@medcare-hms.local', '2025-03-01', 'ACTIVE'],
      [4, 'STF-000004', 'Rory', 'Williams', 5, 'Staff Registered Nurse', '555-0304', 'rory.williams@medcare-hms.local', '2025-04-12', 'ACTIVE'],
      [5, 'STF-000005', 'Amy', 'Pond', 5, 'Patient Relations Coordinator', '555-0305', 'amy.pond@medcare-hms.local', '2025-05-18', 'ACTIVE'],
      [6, 'STF-000006', 'Wilfred', 'Mott', 5, 'Hospital Logistics Lead', '555-0306', 'wilfred.mott@medcare-hms.local', '2024-11-05', 'ACTIVE'],
      [7, 'STF-000007', 'Rose', 'Tyler', 5, 'Senior Billing Specialist', '555-0307', 'rose.tyler@medcare-hms.local', '2025-06-20', 'ACTIVE'],
      [8, 'STF-000008', 'Mickey', 'Smith', 5, 'IT & Systems Operations', '555-0308', 'mickey.smith@medcare-hms.local', '2025-07-01', 'ACTIVE'],
    ];
    for (const s of staff) {
      await client.query(
        `INSERT INTO public.staff (id, staff_number, first_name, last_name, department_id, designation, phone, email, date_of_joining, employment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET designation = EXCLUDED.designation, phone = EXCLUDED.phone, department_id = EXCLUDED.department_id, employment_status = EXCLUDED.employment_status;`,
        s
      );
    }

    console.log('8. Seeding appointments...');
    const appointments = [
      [1, 'APT-001', 1, 1, '2026-09-15', '09:30:00', 'Cardiac post-PCI follow-up and ECG review', 'Completed'],
      [2, 'APT-002', 2, 5, '2026-09-29', '10:00:00', 'Annual preventative health checkup and wellness exam', 'Scheduled'],
      [3, 'APT-003', 3, 3, '2026-09-30', '11:15:00', 'Neurology review for recurring migraine episodes', 'Scheduled'],
      [4, 'APT-004', 4, 4, '2026-09-18', '14:00:00', 'Post-fracture orthopedics cast evaluation', 'Completed'],
      [5, 'APT-005', 5, 7, '2026-09-26', '08:00:00', 'Urgent triage consultation for shortness of breath', 'Completed'],
      [6, 'APT-006', 8, 2, '2026-10-01', '15:30:00', 'Pediatric developmental milestone review', 'Scheduled'],
      [7, 'APT-007', 10, 6, '2026-10-02', '09:00:00', 'Routine prenatal second-trimester ultrasound consult', 'Scheduled'],
      [8, 'APT-008', 11, 1, '2026-09-22', '16:00:00', 'Follow-up consultation for hypertension control', 'Cancelled'],
      [9, 'APT-009', 15, 2, '2026-09-20', '11:00:00', 'Ear examination for persistent otitis media symptoms', 'Completed'],
      [10, 'APT-010', 12, 8, '2026-10-03', '13:45:00', 'Dermatological screening for atypical skin lesion', 'Scheduled'],
    ];
    for (const a of appointments) {
      await client.query(
        `INSERT INTO public.appointments (id, appointment_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, appointment_date = EXCLUDED.appointment_date, reason = EXCLUDED.reason;`,
        a
      );
    }

    console.log('9. Seeding inpatient admissions...');
    const admissions = [
      [1, 'ADM-001', 1, 1, 'Ward-3', 'Bed-302A', '2026-09-15', '2026-09-22', '2026-09-21', 'Acute Coronary Syndrome - Telemetry Monitoring', 'Discharged'],
      [2, 'ADM-002', 3, 3, 'Ward-4', 'Bed-405B', '2026-09-25', '2026-10-02', null, 'Transient Ischemic Attack - Neurological Surveillance', 'Admitted'],
      [3, 'ADM-003', 5, 7, 'Ward-2', 'Bed-201A', '2026-09-26', '2026-10-03', null, 'Severe COPD Exacerbation with Hypoxemia', 'Admitted'],
      [4, 'ADM-004', 14, 6, 'Ward-1', 'Bed-108C', '2026-09-20', '2026-09-25', '2026-09-24', 'Postpartum Observation and Neonatal Bonding', 'Discharged'],
      [5, 'ADM-005', 7, 5, 'Ward-2', 'Bed-204B', '2026-09-27', '2026-10-04', null, 'Complicated Pyelonephritis Requiring IV Antibiotics', 'Admitted'],
    ];
    for (const adm of admissions) {
      await client.query(
        `INSERT INTO public.admissions (id, admission_id, patient_id, doctor_id, room_number, bed_number, admission_date, expected_discharge_date, actual_discharge_date, diagnosis, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, room_number = EXCLUDED.room_number, bed_number = EXCLUDED.bed_number, diagnosis = EXCLUDED.diagnosis;`,
        adm
      );
    }

    console.log('10. Seeding electronic prescriptions & items...');
    const prescriptions = [
      [1, 'RX-000001', 1, 1, 1, '2026-09-15', 'Post-PCI secondary prevention and vascular stabilization', 'COMPLETED', 2],
      [2, 'RX-000002', 3, 3, 3, '2026-09-25', 'Neuroprotective platelet inhibition and statin therapy', 'ACTIVE', 5],
      [3, 'RX-000003', 8, 2, 6, '2026-09-20', 'Acute uncomplicated streptococcal pharyngitis therapy', 'COMPLETED', 4],
      [4, 'RX-000004', 4, 4, 4, '2026-09-18', 'Analgesic and anti-inflammatory protocol for orthopedic strain', 'COMPLETED', 6],
      [5, 'RX-000005', 5, 7, 5, '2026-09-26', 'Bronchodilator and corticosteroid inpatient protocol for COPD', 'ACTIVE', 1],
    ];
    for (const rx of prescriptions) {
      await client.query(
        `INSERT INTO public.prescriptions (id, prescription_number, patient_id, doctor_id, appointment_id, prescription_date, diagnosis_notes, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, diagnosis_notes = EXCLUDED.diagnosis_notes;`,
        rx
      );
    }

    const prescriptionItems = [
      [1, 1, 'Atorvastatin', '40mg', 'Once daily', '30 days', 30, 'Take at bedtime with water'],
      [2, 1, 'Clopidogrel', '75mg', 'Once daily', '30 days', 30, 'Take with food; do not stop abruptly'],
      [3, 1, 'Metoprolol Succinate', '50mg', 'Once daily', '30 days', 30, 'Take in morning; monitor resting pulse'],
      [4, 2, 'Aspirin', '81mg', 'Once daily', '30 days', 30, 'Take with food and full glass of water'],
      [5, 2, 'Atorvastatin', '20mg', 'Once daily', '30 days', 30, 'Take at bedtime regularly'],
      [6, 3, 'Amoxicillin', '250mg', 'Three times daily', '10 days', 30, 'Complete the full 10-day antibiotic course'],
      [7, 3, 'Paracetamol', '500mg', 'Every 6 hours as needed', '5 days', 20, 'Max 4 doses in 24 hours for fever'],
      [8, 4, 'Ibuprofen', '400mg', 'Twice daily', '7 days', 14, 'Always take after a meal'],
      [9, 5, 'Salbutamol Inhaler', '100mcg', '2 puffs every 4-6 hours', '14 days', 1, 'Inhale deeply; rinse mouth after use'],
      [10, 5, 'Paracetamol', '500mg', 'Every 8 hours as needed', '5 days', 15, 'For mild pain relief'],
    ];
    for (const item of prescriptionItems) {
      await client.query(
        `INSERT INTO public.prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration, quantity, instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET instructions = EXCLUDED.instructions, dosage = EXCLUDED.dosage;`,
        item
      );
    }

    console.log('11. Seeding medical records...');
    const medicalRecords = [
      [1, 'MR-000001', 1, 1, 1, '2026-09-15', 'Cardiology', 'Retrosternal chest pressure upon exertion', 'Coronary Artery Disease - Post Angioplasty', 'Vascular access site clean; normal sinus rhythm on 12-lead ECG.', 'Maintain dual antiplatelet therapy; cardiac rehabilitation referral.', 2],
      [2, 'MR-000002', 3, 3, 3, '2026-09-25', 'Neurology', 'Transient left-sided facial numbness lasting 20 minutes', 'Transient Ischemic Attack (TIA)', 'Cranial nerves II-XII grossly intact; MRI brain confirms no acute infarction.', 'Start antiplatelet and high-intensity statin therapy; avoid strenuous physical exertion.', 5],
      [3, 'MR-000003', 8, 2, 6, '2026-09-20', 'Pediatrics', 'Sore throat, fever (38.9C), and painful swallowing for 2 days', 'Acute Streptococcal Pharyngitis', 'Pharyngeal erythema with bilateral tonsillar exudate; rapid antigen test positive.', 'Oral amoxicillin for 10 days; hydration and antipyretics for fever control.', 4],
      [4, 'MR-000004', 4, 4, 4, '2026-09-18', 'Orthopedics', 'Sharp lower back discomfort after lifting heavy storage container', 'Acute Lumbar Musculoligamentous Strain', 'Paraspinal tenderness without radicular radiation; straight leg raise negative.', 'Prescribed short course of NSAIDs; activity modification; physical therapy follow-up.', 6],
      [5, 'MR-000005', 5, 7, 5, '2026-09-26', 'Emergency', 'Progressive dyspnea, wheezing, and purulent sputum production', 'Acute Exacerbation of COPD', 'Bilateral expiratory wheezing; oxygen saturation 89% on room air.', 'Initiated supplemental low-flow O2, nebulized bronchodilators, and systemic steroids.', 1],
    ];
    for (const mr of medicalRecords) {
      await client.query(
        `INSERT INTO public.medical_records (id, record_number, patient_id, doctor_id, appointment_id, record_date, record_type, chief_complaint, diagnosis, clinical_notes, treatment_plan, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET diagnosis = EXCLUDED.diagnosis, clinical_notes = EXCLUDED.clinical_notes, treatment_plan = EXCLUDED.treatment_plan;`,
        mr
      );
    }

    console.log('12. Seeding billing invoices, line items, and payments...');
    const invoices = [
      [1, 'INV-000001', 1, 1, 1, '2026-09-21', '2026-10-21', 1250.00, 50.00, 50.00, 1250.00, 1250.00, 0.00, 'PAID', 'Full institutional insurance settlement via DirectCare', 1],
      [2, 'INV-000002', 3, 3, 2, '2026-09-25', '2026-10-25', 650.00, 0.00, 0.00, 650.00, 300.00, 350.00, 'PARTIAL', 'Partial co-pay collected; outstanding balance pending secondary insurance', 1],
      [3, 'INV-000003', 8, 6, null, '2026-09-20', '2026-10-20', 95.00, 0.00, 0.00, 95.00, 95.00, 0.00, 'PAID', 'Front desk outpatient encounter settlement', 3],
      [4, 'INV-000004', 4, 4, null, '2026-09-18', '2026-10-18', 140.00, 0.00, 0.00, 140.00, 0.00, 140.00, 'PENDING', 'Pending self-pay settlement', 3],
      [5, 'INV-000005', 5, 5, 3, '2026-09-26', '2026-10-26', 820.00, 20.00, 0.00, 800.00, 400.00, 400.00, 'PARTIAL', 'Inpatient deposit received upon admission', 1],
    ];
    for (const inv of invoices) {
      await client.query(
        `INSERT INTO public.invoices (id, invoice_number, patient_id, appointment_id, admission_id, invoice_date, due_date, subtotal, discount, tax, total_amount, paid_amount, balance_amount, status, billing_notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, paid_amount = EXCLUDED.paid_amount, balance_amount = EXCLUDED.balance_amount, billing_notes = EXCLUDED.billing_notes;`,
        inv
      );
    }

    const invoiceItems = [
      [1, 1, 'Consultation', 'Specialist Cardiology Evaluation', 1, 150.00, 150.00],
      [2, 1, 'Procedure', '12-Lead Diagnostic Electrocardiogram (ECG)', 1, 100.00, 100.00],
      [3, 1, 'Room Charge', 'Inpatient Telemetry Ward Stay (2 Nights)', 2, 400.00, 800.00],
      [4, 1, 'Medication', 'Inpatient Cardiac Medication Administration', 1, 200.00, 200.00],
      [5, 2, 'Consultation', 'Neurology Specialist Clinical Evaluation', 1, 175.00, 175.00],
      [6, 2, 'Room Charge', 'Observation Unit Specialized Bed (1 Night)', 1, 325.00, 325.00],
      [7, 2, 'Lab Test', 'Neurological Stat Metabolic Panel', 1, 150.00, 150.00],
      [8, 3, 'Consultation', 'Pediatric Outpatient Consultation', 1, 75.00, 75.00],
      [9, 3, 'Lab Test', 'Rapid Streptococcal Antigen Screen', 1, 20.00, 20.00],
      [10, 4, 'Consultation', 'Orthopedics Clinical Evaluation & Cast Check', 1, 140.00, 140.00],
      [11, 5, 'Procedure', 'Emergency Respiratory Stabilization & Nebulization', 1, 220.00, 220.00],
      [12, 5, 'Room Charge', 'Acute Respiratory Care Bed (2 Nights)', 2, 300.00, 600.00],
    ];
    for (const item of invoiceItems) {
      await client.query(
        `INSERT INTO public.invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET total_price = EXCLUDED.total_price;`,
        item
      );
    }

    const payments = [
      [1, 'PAY-000001', 1, 1250.00, 'Insurance', '2026-09-21', 'INS-CLAIM-892341', 'Pre-authorized direct settlement by health insurer', 1],
      [2, 'PAY-000002', 2, 300.00, 'Credit Card', '2026-09-25', 'CC-AUTH-741982', 'Patient co-payment settled via Visa at discharge desk', 1],
      [3, 'PAY-000003', 3, 95.00, 'Cash', '2026-09-20', 'RCPT-004921', 'Paid in full at front desk cash register', 3],
      [4, 'PAY-000004', 5, 400.00, 'Debit Card', '2026-09-26', 'DEBIT-AUTH-119283', 'Initial emergency admission deposit', 1],
    ];
    for (const pmt of payments) {
      await client.query(
        `INSERT INTO public.payments (id, payment_number, invoice_id, amount, payment_method, payment_date, reference_number, notes, received_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;`,
        pmt
      );
    }

    console.log('13. Seeding pharmacy medicines, batches, and dispensations...');
    const medicines = [
      [1, 'MED-000001', 'Amoxicillin', 'Amoxicillin Trihydrate', 'Antibiotic', 'Capsule', '500mg', 12.50, 20, 'ACTIVE'],
      [2, 'MED-000002', 'Atorvastatin', 'Atorvastatin Calcium', 'Cardiovascular', 'Tablet', '40mg', 18.00, 15, 'ACTIVE'],
      [3, 'MED-000003', 'Clopidogrel', 'Clopidogrel Bisulfate', 'Antiplatelet', 'Tablet', '75mg', 22.00, 15, 'ACTIVE'],
      [4, 'MED-000004', 'Metoprolol Succinate', 'Metoprolol Tartrate / Succinate', 'Cardiovascular', 'Tablet', '50mg', 14.00, 15, 'ACTIVE'],
      [5, 'MED-000005', 'Paracetamol', 'Acetaminophen', 'Analgesic', 'Tablet', '500mg', 4.50, 50, 'ACTIVE'],
      [6, 'MED-000006', 'Ibuprofen', 'Ibuprofen', 'NSAID', 'Tablet', '400mg', 6.00, 30, 'ACTIVE'],
      [7, 'MED-000007', 'Ceftriaxone Sodium', 'Ceftriaxone', 'Antibiotic', 'Injectable', '1g', 35.00, 25, 'ACTIVE'],
      [8, 'MED-000008', 'Salbutamol Inhaler', 'Albuterol Sulfate', 'Respiratory', 'Inhaler', '100mcg', 25.00, 10, 'ACTIVE'],
      [9, 'MED-000009', 'Omeprazole', 'Omeprazole Magnesium', 'Gastrointestinal', 'Capsule', '20mg', 9.00, 20, 'ACTIVE'],
      [10, 'MED-000010', 'Metformin HCl', 'Metformin Hydrochloride', 'Endocrine', 'Tablet', '500mg', 8.00, 25, 'ACTIVE'],
    ];
    for (const med of medicines) {
      await client.query(
        `INSERT INTO public.medicines (id, medicine_code, name, generic_name, category, dosage_form, strength, unit_price, reorder_level, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET unit_price = EXCLUDED.unit_price, reorder_level = EXCLUDED.reorder_level, status = EXCLUDED.status;`,
        med
      );
    }

    const medicineBatches = [
      [1, 'BATCH-AMX-2026A', 1, 150, '2027-06-30', 4.50, 12.50, 'PharmaCorp Global Supplies', 'AVAILABLE'],
      [2, 'BATCH-ATV-2026B', 2, 170, '2027-12-31', 6.00, 18.00, 'Apex Healthcare Ltd', 'AVAILABLE'],
      [3, 'BATCH-CLP-2026A', 3, 90, '2027-08-31', 8.00, 22.00, 'Apex Healthcare Ltd', 'AVAILABLE'],
      [4, 'BATCH-MTP-2026A', 4, 60, '2027-10-31', 5.00, 14.00, 'PharmaCorp Global Supplies', 'AVAILABLE'],
      [5, 'BATCH-PCM-2026C', 5, 480, '2028-01-31', 1.20, 4.50, 'MediSupply Direct', 'AVAILABLE'],
      [6, 'BATCH-IBU-2026A', 6, 236, '2027-09-30', 1.80, 6.00, 'MediSupply Direct', 'AVAILABLE'],
      [7, 'BATCH-CFX-2026A', 7, 80, '2027-04-30', 14.00, 35.00, 'SterileMed Pharmaceuticals', 'AVAILABLE'],
      [8, 'BATCH-SBT-2026A', 8, 44, '2027-11-30', 9.50, 25.00, 'Respiratory Care Inc', 'AVAILABLE'],
      [9, 'BATCH-OMP-2026A', 9, 140, '2027-07-31', 3.00, 9.00, 'MediSupply Direct', 'AVAILABLE'],
      [10, 'BATCH-MET-2026A', 10, 200, '2027-12-31', 2.50, 8.00, 'Apex Healthcare Ltd', 'AVAILABLE'],
    ];
    for (const b of medicineBatches) {
      await client.query(
        `INSERT INTO public.medicine_batches (id, batch_number, medicine_id, quantity_in_stock, expiry_date, purchase_price, selling_price, supplier_name, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET quantity_in_stock = EXCLUDED.quantity_in_stock, status = EXCLUDED.status;`,
        b
      );
    }

    const dispensations = [
      [1, 'DSP-000001', 1, 1, 2, 2, 1, 30, 18.00, 540.00, 1, 'Full 30-day supply dispensed per protocol'],
      [2, 'DSP-000002', 1, 2, 3, 3, 1, 30, 22.00, 660.00, 1, 'Antiplatelet therapy dispensed with instructions'],
      [3, 'DSP-000003', 1, 3, 4, 4, 1, 30, 14.00, 420.00, 1, 'Beta-blocker dispensed with blood pressure caution'],
      [4, 'DSP-000004', 4, 8, 6, 6, 4, 14, 6.00, 84.00, 1, 'NSAID pain management tablets dispensed'],
    ];
    for (const d of dispensations) {
      await client.query(
        `INSERT INTO public.medicine_dispensations (id, dispensation_number, prescription_id, prescription_item_id, medicine_id, batch_id, patient_id, quantity_dispensed, unit_price, total_price, dispensed_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING;`,
        d
      );
    }

    console.log('14. Seeding laboratory catalog, orders, and results...');
    const catalogTests = [
      [1, 'LAB-000001', 'Complete Blood Count (CBC)', 'Hematology', 'Whole Blood (EDTA)', '4.5 - 11.0 x10^3/uL', 'x10^3/uL', 25.00, 12, 'ACTIVE'],
      [2, 'LAB-000002', 'Comprehensive Metabolic Panel (CMP)', 'Biochemistry', 'Serum', '70 - 99 mg/dL', 'mg/dL', 45.00, 24, 'ACTIVE'],
      [3, 'LAB-000003', 'Lipid Profile Panel', 'Biochemistry', 'Blood Serum', '< 200 mg/dL', 'mg/dL', 35.00, 24, 'ACTIVE'],
      [4, 'LAB-000004', 'Routine Urinalysis', 'Urinalysis', 'Clean Catch Urine', 'Clear / Negative', '', 20.00, 6, 'ACTIVE'],
      [5, 'LAB-000005', 'Thyroid Stimulating Hormone (TSH)', 'Immunology', 'Serum', '0.4 - 4.0 mIU/L', 'mIU/L', 40.00, 24, 'ACTIVE'],
      [6, 'LAB-000006', 'Glycated Hemoglobin (HbA1c)', 'Biochemistry', 'Whole Blood (EDTA)', '< 5.7 %', '%', 30.00, 12, 'ACTIVE'],
    ];
    for (const ct of catalogTests) {
      await client.query(
        `INSERT INTO public.lab_test_catalog (id, test_code, name, category, sample_type, reference_range, unit, price, turnaround_hours, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, status = EXCLUDED.status;`,
        ct
      );
    }

    const labOrders = [
      [1, 'ORD-LAB-000001', 1, 1, 1, 'Urgent', 'COMPLETED', 'Cardiac post-angioplasty baseline profile'],
      [2, 'ORD-LAB-000002', 3, 3, 1, 'Urgent', 'COMPLETED', 'Stat neurological metabolic and electrolyte panel'],
      [3, 'ORD-LAB-000003', 8, 2, 1, 'Routine', 'COMPLETED', 'Pediatric pharyngitis systemic inflammatory check'],
      [4, 'ORD-LAB-000004', 5, 7, 1, 'STAT', 'IN_PROGRESS', 'COPD exacerbation emergency blood gas and CBC workup'],
    ];
    for (const lo of labOrders) {
      await client.query(
        `INSERT INTO public.lab_orders (id, order_number, patient_id, doctor_id, ordered_by, priority, status, clinical_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;`,
        lo
      );
    }

    const labOrderItems = [
      [1, 1, 1, 'COMPLETED', 25.00, 'WBC: 7.4, RBC: 4.8, Hgb: 14.2, Plt: 250', 'NORMAL', '4.5 - 11.0 x10^3/uL', 'Normal cellular morphology', 1],
      [2, 1, 3, 'COMPLETED', 35.00, 'Total Chol: 178, Triglycerides: 140, HDL: 46, LDL: 104', 'NORMAL', '< 200 mg/dL', 'Target lipid control achieved', 1],
      [3, 2, 2, 'COMPLETED', 45.00, 'Glucose: 102, Na: 140, K: 4.2, Cl: 102, Creatinine: 0.9', 'NORMAL', '70 - 99 mg/dL', 'Electrolytes within normal reference limits', 1],
      [4, 3, 1, 'COMPLETED', 25.00, 'WBC: 13.2 (Mild leukocytosis), Hgb: 12.8, Plt: 310', 'ABNORMAL', '4.5 - 11.0 x10^3/uL', 'Consistent with active bacterial pharyngitis', 1],
      [5, 4, 1, 'IN_PROGRESS', 25.00, null, 'NORMAL', '4.5 - 11.0 x10^3/uL', 'Specimen received in central laboratory', null],
      [6, 4, 2, 'IN_PROGRESS', 45.00, null, 'NORMAL', '70 - 99 mg/dL', 'Awaiting analyzer output', null],
    ];
    for (const item of labOrderItems) {
      await client.query(
        `INSERT INTO public.lab_order_items (id, order_id, test_id, status, price, result_value, result_flag, reference_range, remarks, completed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, result_value = EXCLUDED.result_value;`,
        item
      );
    }

    console.log('15. Seeding system notifications...');
    const notifications = [
      [1, 1, 'Inpatient Admission Registered', 'Patient Charles Sterling admitted to Ward-4, Bed-405B under Dr. Marcus Vance.', 'ADMISSION', '/admissions'],
      [2, 1, 'Diagnostic Lab Results Completed', 'Urgent Complete Blood Count results for Arthur Pendelton are available for review.', 'LAB_RESULT', '/laboratory'],
      [3, 1, 'Pharmacy Low-Stock Warning', 'Salbutamol Inhaler current inventory (44 units) is approaching reorder threshold.', 'PHARMACY', '/pharmacy'],
      [4, 1, 'Invoice Payment Recorded', 'Invoice INV-000001 ($1,250.00) settled in full via direct insurance payment.', 'BILLING', '/billing'],
      [5, 1, 'Clinical Appointment Confirmed', 'New consultation scheduled for Beatrice Montgomery on 2026-09-29.', 'APPOINTMENT', '/appointments'],
      [6, 2, 'Diagnostic Lab Results Available', 'Urgent Complete Blood Count results for Arthur Pendelton are verified and available.', 'LAB_RESULT', '/laboratory'],
      [7, 2, 'Clinical Appointment Scheduled', 'Follow-up consultation scheduled with patient Arthur Pendelton on 2026-09-15.', 'APPOINTMENT', '/appointments'],
      [8, 2, 'Inpatient Discharge Completed', 'Patient Arthur Pendelton has been discharged from Ward-3, Bed-302A.', 'ADMISSION', '/admissions'],
      [9, 3, 'Patient Admission Check-In', 'Patient Charles Sterling checked in for inpatient admission in Ward-4.', 'ADMISSION', '/admissions'],
      [10, 3, 'Front Desk Payment Recorded', 'Payment of $95.00 collected for Outpatient Encounter INV-000003.', 'BILLING', '/billing'],
      [11, 3, 'New Appointment Booking', 'Consultation scheduled for Beatrice Montgomery with Dr. James Wilson on 2026-09-29.', 'APPOINTMENT', '/appointments'],
    ];
    for (const n of notifications) {
      await client.query(
        `INSERT INTO public.notifications (id, user_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, message = EXCLUDED.message, type = EXCLUDED.type, link = EXCLUDED.link;`,
        n
      );
    }

    console.log('16. Seeding realistic system audit log entries...');
    const auditEntries = [
      [1, 'SYSTEM_BOOTSTRAP', 1, 'admin', 'INITIALIZE', 'DATABASE', 'SCHEMA', 'SUCCESS', '127.0.0.1', '2026-09-01 08:00:00'],
      [2, 'SETTINGS_UPDATED', 1, 'admin', 'UPDATE', 'SETTINGS', '1', 'SUCCESS', '127.0.0.1', '2026-09-01 08:15:00'],
      [3, 'AUTH_LOGIN', 1, 'admin', 'LOGIN', 'AUTH', '1', 'SUCCESS', '192.168.1.10', '2026-09-15 08:30:00'],
      [4, 'AUTH_LOGIN', 3, 'receptionist', 'LOGIN', 'AUTH', '3', 'SUCCESS', '192.168.1.45', '2026-09-15 08:45:00'],
      [5, 'PATIENT_REGISTRATION', 3, 'receptionist', 'CREATE', 'PATIENT', 'PT-001', 'SUCCESS', '192.168.1.45', '2026-09-15 09:15:00'],
      [6, 'APPOINTMENT_SCHEDULED', 3, 'receptionist', 'CREATE', 'APPOINTMENT', 'APT-001', 'SUCCESS', '192.168.1.45', '2026-09-15 09:20:00'],
      [7, 'AUTH_LOGIN', 2, 'doctor', 'LOGIN', 'AUTH', '2', 'SUCCESS', '192.168.1.22', '2026-09-15 09:25:00'],
      [8, 'ADMISSION_CREATED', 2, 'doctor', 'CREATE', 'ADMISSION', 'ADM-001', 'SUCCESS', '192.168.1.22', '2026-09-15 10:00:00'],
      [9, 'PRESCRIPTION_ISSUED', 2, 'doctor', 'CREATE', 'PRESCRIPTION', 'RX-000001', 'SUCCESS', '192.168.1.22', '2026-09-15 10:30:00'],
      [10, 'LAB_ORDER_CREATED', 2, 'doctor', 'CREATE', 'LAB_ORDER', 'ORD-LAB-000001', 'SUCCESS', '192.168.1.22', '2026-09-15 10:45:00'],
      [11, 'LAB_RESULT_VERIFIED', 1, 'admin', 'VERIFY', 'LAB_ORDER', 'ORD-LAB-000001', 'SUCCESS', '192.168.1.10', '2026-09-16 11:30:00'],
      [12, 'MEDICINE_DISPENSED', 1, 'admin', 'DISPENSE', 'PHARMACY', 'DSP-000001', 'SUCCESS', '192.168.1.10', '2026-09-16 14:00:00'],
      [13, 'PATIENT_DISCHARGED', 2, 'doctor', 'DISCHARGE', 'ADMISSION', 'ADM-001', 'SUCCESS', '192.168.1.22', '2026-09-21 11:00:00'],
      [14, 'INVOICE_GENERATED', 1, 'admin', 'CREATE', 'INVOICE', 'INV-000001', 'SUCCESS', '192.168.1.10', '2026-09-21 11:30:00'],
      [15, 'PAYMENT_RECORDED', 1, 'admin', 'RECORD', 'PAYMENT', 'PAY-000001', 'SUCCESS', '192.168.1.10', '2026-09-21 12:00:00'],
      [16, 'PATIENT_REGISTRATION', 3, 'receptionist', 'CREATE', 'PATIENT', 'PT-002', 'SUCCESS', '192.168.1.45', '2026-09-25 14:30:00'],
      [17, 'APPOINTMENT_SCHEDULED', 3, 'receptionist', 'CREATE', 'APPOINTMENT', 'APT-002', 'SUCCESS', '192.168.1.45', '2026-09-25 14:40:00'],
      [18, 'INVOICE_GENERATED', 1, 'admin', 'CREATE', 'INVOICE', 'INV-000002', 'SUCCESS', '192.168.1.10', '2026-09-25 15:00:00'],
      [19, 'PAYMENT_RECORDED', 1, 'admin', 'RECORD', 'PAYMENT', 'PAY-000002', 'SUCCESS', '192.168.1.10', '2026-09-25 15:15:00'],
      [20, 'ADMISSION_CREATED', 2, 'doctor', 'CREATE', 'ADMISSION', 'ADM-002', 'SUCCESS', '192.168.1.22', '2026-09-25 16:00:00'],
    ];
    for (const entry of auditEntries) {
      await client.query(
        `INSERT INTO public.audit_logs (id, event_type, user_id, role, action, resource_type, resource_id, outcome, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET event_type = EXCLUDED.event_type, action = EXCLUDED.action, outcome = EXCLUDED.outcome;`,
        entry
      );
    }

    console.log('17. Synchronizing all sequence counters...');
    const sequencesToSync = [
      ['users', 'users_id_seq'],
      ['departments', 'departments_id_seq'],
      ['doctors', 'doctors_id_seq'],
      ['patients', 'patients_id_seq'],
      ['appointments', 'appointments_id_seq'],
      ['admissions', 'admissions_id_seq'],
      ['prescriptions', 'prescriptions_id_seq'],
      ['prescription_items', 'prescription_items_id_seq'],
      ['medical_records', 'medical_records_id_seq'],
      ['staff', 'staff_id_seq'],
      ['invoices', 'invoices_id_seq'],
      ['invoice_items', 'invoice_items_id_seq'],
      ['payments', 'payments_id_seq'],
      ['medicines', 'medicines_id_seq'],
      ['medicine_batches', 'medicine_batches_id_seq'],
      ['medicine_dispensations', 'medicine_dispensations_id_seq'],
      ['lab_test_catalog', 'lab_test_catalog_id_seq'],
      ['lab_orders', 'lab_orders_id_seq'],
      ['lab_order_items', 'lab_order_items_id_seq'],
      ['notifications', 'notifications_id_seq'],
      ['audit_logs', 'audit_logs_id_seq'],
    ];
    for (const [table, seq] of sequencesToSync) {
      await safeQuery(`SELECT setval('public.${seq}', COALESCE((SELECT MAX(id) FROM public.${table}), 1), true);`);
    }

    // Set formatting sequences safely above seed thresholds
    await safeQuery("SELECT setval('public.prescription_number_seq', GREATEST((SELECT count(*) FROM public.prescriptions) + 5, 20), true);");
    await safeQuery("SELECT setval('public.medical_record_number_seq', GREATEST((SELECT count(*) FROM public.medical_records) + 5, 20), true);");
    await safeQuery("SELECT setval('public.staff_number_seq', GREATEST((SELECT count(*) FROM public.staff) + 5, 20), true);");
    await safeQuery("SELECT setval('public.invoice_number_seq', GREATEST((SELECT count(*) FROM public.invoices) + 5, 20), true);");
    await safeQuery("SELECT setval('public.payment_number_seq', GREATEST((SELECT count(*) FROM public.payments) + 5, 20), true);");
    await safeQuery("SELECT setval('public.medicine_code_seq', GREATEST((SELECT count(*) FROM public.medicines) + 5, 20), true);");
    await safeQuery("SELECT setval('public.dispensation_number_seq', GREATEST((SELECT count(*) FROM public.medicine_dispensations) + 5, 20), true);");
    await safeQuery("SELECT setval('public.lab_order_number_seq', GREATEST((SELECT count(*) FROM public.lab_orders) + 5, 20), true);");
    await safeQuery("SELECT setval('public.lab_test_code_seq', GREATEST((SELECT count(*) FROM public.lab_test_catalog) + 5, 20), true);");

    console.log('18. Configuring database permissions for application role...');
    // In standard PostgreSQL deployments, the connected user who created the tables owns them.
    // If a secondary application user is specified via APP_DB_USER or SQL_USER (and differs from connected user),
    // grant schema privileges safely without hardcoded role dependencies.
    const connectedUser = poolConfig.user || 'postgres';
    const secondaryUser = process.env.APP_DB_USER || (process.env.SQL_USER && process.env.SQL_USER !== connectedUser ? process.env.SQL_USER : null);
    if (secondaryUser) {
      try {
        const roleCheck = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1;", [secondaryUser]);
        if (roleCheck.rows.length > 0) {
          const quotedUser = `"${secondaryUser.replace(/"/g, '""')}"`;
          await safeQuery(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${quotedUser};`);
          await safeQuery(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${quotedUser};`);
          console.log(`  -> Granted privileges to configured application role: ${secondaryUser}`);
        } else {
          console.log(`  -> Application role ${secondaryUser} not present in cluster. Skipping grant.`);
        }
      } catch (roleErr) {
        console.log(`  -> Role grant check non-fatal notice: ${roleErr.message}`);
      }
    } else {
      console.log('  -> Standard environment: connected user owns public schema and tables.');
    }

    console.log('>>> DATABASE SETUP AND SEEDING COMPLETED SUCCESSFULLY <<<');
  } catch (err) {
    console.error('DATABASE SETUP FAILED:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

restoreDatabase();
