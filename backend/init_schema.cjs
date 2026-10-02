const { Pool } = require('pg');

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

async function initSchema() {
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
    console.log('--- Initializing MedCare Hospital Management System Database Schema ---');

    console.log('1. Ensuring all required sequences exist...');
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

    console.log('2. Creating all required tables, constraints, and indexes...');

    // 1. departments
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

    // 2. doctors
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

    // 3. users
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

    // 4. session (Connect-PG-Simple)
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.session (
        sid character varying NOT NULL,
        sess json NOT NULL,
        expire timestamp(6) without time zone NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      );
    `);
    await safeQuery(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON public.session(expire);`);

    // 5. audit_logs
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

    // 6. patients
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

    // 7. appointments
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

    // 8. admissions
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

    // 9. prescriptions
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.prescriptions (
        id integer NOT NULL DEFAULT nextval('public.prescriptions_id_seq'::regclass),
        prescription_number character varying(50) NOT NULL DEFAULT ('RX-'::text || lpad((nextval('public.prescription_number_seq'::regclass))::text, 6, '0'::text)),
        patient_id integer NOT NULL,
        doctor_id integer NOT NULL,
        appointment_id integer,
        prescription_date date NOT NULL DEFAULT CURRENT_DATE,
        diagnosis_notes text,
        status character varying(30) NOT NULL DEFAULT 'ACTIVE'::character varying,
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

    // 10. prescription_items
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

    // 11. medical_records
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

    // 12. staff
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

    // 13. invoices
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

    // 14. invoice_items
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

    // 15. payments
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

    // 16. medicines
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

    // 17. medicine_batches
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

    // 18. medicine_dispensations
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

    // 19. lab_test_catalog
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

    // 20. lab_orders
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

    // 21. lab_order_items
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
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT lab_order_items_pkey PRIMARY KEY (id),
        CONSTRAINT lab_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.lab_orders(id) ON DELETE CASCADE,
        CONSTRAINT lab_order_items_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.lab_test_catalog(id) ON DELETE RESTRICT,
        CONSTRAINT lab_order_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT lab_order_items_status_check CHECK ((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])),
        CONSTRAINT lab_order_items_result_flag_check CHECK ((result_flag)::text = ANY ((ARRAY['NORMAL'::character varying, 'ABNORMAL'::character varying, 'CRITICAL'::character varying])::text[]))
      );
    `);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_lab_order_items_order_id ON public.lab_order_items(order_id);`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_lab_order_items_test_id ON public.lab_order_items(test_id);`);

    // 22. notifications
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

    // 23. system_settings
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

    // Ensure default system_settings row (id = 1) exists without overwriting existing settings
    console.log('3. Ensuring default system settings row exists...');
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

    console.log('4. Configuring database permissions for application role if configured...');
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
        }
      } catch (roleErr) {
        console.log(`  -> Role grant notice: ${roleErr.message}`);
      }
    }

    console.log('>>> DATABASE SCHEMA INITIALIZATION COMPLETED SUCCESSFULLY <<<');
  } catch (err) {
    console.error('DATABASE SCHEMA INITIALIZATION FAILED:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initSchema();
