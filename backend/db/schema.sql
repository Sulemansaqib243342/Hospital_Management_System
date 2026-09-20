-- =============================================
-- HOSPITAL MANAGEMENT SYSTEM - POSTGRESQL SCHEMA
-- =============================================

-- 1. DEPARTMENTS
CREATE TABLE departments (
  dept_id     SERIAL PRIMARY KEY,
  dept_name   VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. STAFF / DOCTORS
CREATE TABLE staff (
  staff_id    SERIAL PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  phone       VARCHAR(20),
  role        VARCHAR(30) CHECK (role IN ('doctor','nurse','admin','pharmacist')),
  designation VARCHAR(100),
  dept_id     INTEGER REFERENCES departments(dept_id),
  shift       VARCHAR(20) CHECK (shift IN ('morning','evening','night')),
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PATIENTS
CREATE TABLE patients (
  patient_id  SERIAL PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  dob         DATE,
  gender      VARCHAR(10) CHECK (gender IN ('male','female','other')),
  blood_group VARCHAR(5),
  phone       VARCHAR(20),
  email       VARCHAR(100),
  address     VARCHAR(255),
  emergency_contact VARCHAR(100),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ADMISSIONS
CREATE TABLE admissions (
  admission_id   SERIAL PRIMARY KEY,
  patient_id     INTEGER REFERENCES patients(patient_id),
  doctor_id      INTEGER REFERENCES staff(staff_id),
  dept_id        INTEGER REFERENCES departments(dept_id),
  ward           VARCHAR(50),
  bed_number     VARCHAR(10),
  admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  discharge_date TIMESTAMP,
  condition      VARCHAR(255),
  status         VARCHAR(20) DEFAULT 'admitted' CHECK (status IN ('admitted','discharged','critical','stable','monitoring'))
);

-- 5. APPOINTMENTS
CREATE TABLE appointments (
  appt_id      SERIAL PRIMARY KEY,
  patient_id   INTEGER REFERENCES patients(patient_id),
  doctor_id    INTEGER REFERENCES staff(staff_id),
  dept_id      INTEGER REFERENCES departments(dept_id),
  appt_date    DATE NOT NULL,
  appt_time    VARCHAR(10),
  reason       VARCHAR(255),
  status       VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','missed')),
  notes        VARCHAR(500),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. MEDICINES
CREATE TABLE medicines (
  medicine_id  SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  category     VARCHAR(50),
  unit         VARCHAR(20),
  quantity     INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 10,
  price        NUMERIC(10,2),
  expiry_date  DATE,
  supplier     VARCHAR(100),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PRESCRIPTIONS
CREATE TABLE prescriptions (
  prescription_id SERIAL PRIMARY KEY,
  patient_id      INTEGER REFERENCES patients(patient_id),
  doctor_id       INTEGER REFERENCES staff(staff_id),
  medicine_id     INTEGER REFERENCES medicines(medicine_id),
  quantity        INTEGER,
  dosage          VARCHAR(100),
  duration        VARCHAR(50),
  dispensed       SMALLINT DEFAULT 0,
  prescribed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. BILLING
CREATE TABLE billing (
  bill_id       SERIAL PRIMARY KEY,
  patient_id    INTEGER REFERENCES patients(patient_id),
  admission_id  INTEGER REFERENCES admissions(admission_id),
  total_amount  NUMERIC(12,2),
  paid_amount   NUMERIC(12,2) DEFAULT 0,
  payment_mode  VARCHAR(30) CHECK (payment_mode IN ('cash','card','insurance','online')),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','partial','overdue')),
  bill_date     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes         VARCHAR(255)
);

-- =============================================
-- Departments Sample Data
-- =============================================
INSERT INTO departments (dept_name, description) VALUES ('Cardiology', 'Heart related treatments');
INSERT INTO departments (dept_name, description) VALUES ('General', 'General medicine and OPD');
INSERT INTO departments (dept_name, description) VALUES ('Orthopedics', 'Bone and joint treatments');
INSERT INTO departments (dept_name, description) VALUES ('Pediatrics', 'Child healthcare');
INSERT INTO departments (dept_name, description) VALUES ('Neurology', 'Brain and nervous system');
INSERT INTO departments (dept_name, description) VALUES ('ICU', 'Intensive Care Unit');

INSERT INTO staff (full_name, email, password, role)
VALUES ('Admin User', 'sulemansaqib34917@gmail.com', '$2a$10$Z3eTlVSOVA1y8VRkg36dXOb7JLG39CE1nVvbuWIptL5VJgVVNs20m', 'admin');
