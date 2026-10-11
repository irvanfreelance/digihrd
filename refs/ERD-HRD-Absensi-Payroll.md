# Entity Relationship Diagram
## Sistem HRD — Absensi & Payroll
**Database:** PostgreSQL 15+  
**Versi:** 1.0

---

## Konvensi

- PK: `BIGSERIAL` (bukan UUID) untuk performa join & index di data ratusan ribu baris
- Semua kolom status/type: `VARCHAR(50)` (bukan ENUM) agar mudah migrasi dan extensible
- Soft delete: kolom `deleted_at TIMESTAMPTZ` pada tabel utama
- Timestamps: semua `TIMESTAMPTZ` (timezone-aware)
- Index dirancang untuk query high-traffic: absensi harian, payroll run, laporan rentang tanggal

---

## Diagram Relasi (ASCII)

```
tenants (1)─────────────────────────────────────────────────┐
    │                                                        │
    ├──(N) locations                                         │
    │        │                                               │
    │        └──(N) location_restrictions                    │
    │                                                        │
    ├──(N) departments                                       │
    │        │                                               │
    │        └──(N) positions                                │
    │                  │                                     │
    │                  └──(1) employment_grades              │
    │                                                        │
    ├──(N) employees ──────────────────────────────────────(N)
    │        │         assigned to locations/shifts           │
    │        ├──(N) employee_salary_components               │
    │        ├──(N) attendances                              │
    │        ├──(N) leave_requests                           │
    │        ├──(N) overtime_requests                        │
    │        ├──(N) shift_assignments                        │
    │        └──(N) payroll_items                            │
    │                                                        │
    ├──(N) shift_templates                                   │
    │        └──(N) shift_assignments                        │
    │                                                        │
    ├──(N) salary_components (master)                        │
    │                                                        │
    ├──(N) payroll_runs                                      │
    │        └──(N) payroll_items                            │
    │                  └──(N) payroll_item_details           │
    │                                                        │
    └──(N) late_rules (per grade)                           │
```

---

## Schema SQL Lengkap

```sql
-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;          -- geolocation ops
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- fulltext search nama karyawan

-- ============================================================
-- 1. TENANTS (Multi-tenancy)
-- ============================================================
CREATE TABLE tenants (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    slug                VARCHAR(100)    NOT NULL UNIQUE,
    logo_url            TEXT,
    primary_color       VARCHAR(7)      NOT NULL DEFAULT '#1A56DB',
    secondary_color     VARCHAR(7)      NOT NULL DEFAULT '#7E3AF2',
    font_heading        VARCHAR(50)     NOT NULL DEFAULT 'Cabin',
    font_body           VARCHAR(50)     NOT NULL DEFAULT 'Albert Sans',
    slip_header_color   VARCHAR(7)      NOT NULL DEFAULT '#1A56DB',
    timezone            VARCHAR(50)     NOT NULL DEFAULT 'Asia/Jakarta',
    currency            VARCHAR(10)     NOT NULL DEFAULT 'IDR',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. LOCATIONS (Kantor / Outlet / Pabrik)
-- ============================================================
CREATE TABLE locations (
    id                          BIGSERIAL PRIMARY KEY,
    tenant_id                   BIGINT          NOT NULL REFERENCES tenants(id),
    name                        VARCHAR(255)    NOT NULL,
    address                     TEXT,
    latitude                    NUMERIC(10,7)   NOT NULL,
    longitude                   NUMERIC(10,7)   NOT NULL,
    geom                        GEOMETRY(Point, 4326),   -- PostGIS point
    radius_meter                INT             NOT NULL DEFAULT 100,
    allow_outside_with_reason   BOOLEAN         NOT NULL DEFAULT FALSE,
    max_outside_tolerance_count INT             NOT NULL DEFAULT 0,
    require_photo               BOOLEAN         NOT NULL DEFAULT FALSE,
    restrict_mock_location      BOOLEAN         NOT NULL DEFAULT TRUE,
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_locations_tenant ON locations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- ============================================================
-- 3. DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT          NOT NULL REFERENCES tenants(id),
    name        VARCHAR(255)    NOT NULL,
    code        VARCHAR(50),
    parent_id   BIGINT          REFERENCES departments(id),
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. EMPLOYMENT GRADES (Golongan/Level)
-- ============================================================
CREATE TABLE employment_grades (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT          NOT NULL REFERENCES tenants(id),
    name        VARCHAR(100)    NOT NULL,  -- e.g. "Produksi", "Staf", "Manajemen"
    level       SMALLINT        NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grades_tenant ON employment_grades(tenant_id);

-- ============================================================
-- 5. LATE RULES (per Grade)
-- ============================================================
CREATE TABLE late_rules (
    id                          BIGSERIAL PRIMARY KEY,
    tenant_id                   BIGINT          NOT NULL REFERENCES tenants(id),
    employment_grade_id         BIGINT          NOT NULL REFERENCES employment_grades(id),
    tolerance_minutes           INT             NOT NULL DEFAULT 0,
    late_affects_payroll        BOOLEAN         NOT NULL DEFAULT FALSE,
    deduction_method            VARCHAR(20)     NOT NULL DEFAULT 'none',
      -- values: 'none', 'per_minute', 'per_hour', 'flat_cut'
    deduction_amount            NUMERIC(15,2)   NOT NULL DEFAULT 0,
    deduction_rate              NUMERIC(8,4)    NOT NULL DEFAULT 0,
    max_late_count_per_month    INT             NOT NULL DEFAULT 99,
    late_count_triggers_warning INT             NOT NULL DEFAULT 3,
    effective_from              DATE            NOT NULL,
    effective_until             DATE,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_late_rules_grade ON late_rules(employment_grade_id);
CREATE INDEX idx_late_rules_tenant ON late_rules(tenant_id);

-- ============================================================
-- 6. POSITIONS (Jabatan)
-- ============================================================
CREATE TABLE positions (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT          NOT NULL REFERENCES tenants(id),
    department_id           BIGINT          NOT NULL REFERENCES departments(id),
    employment_grade_id     BIGINT          NOT NULL REFERENCES employment_grades(id),
    name                    VARCHAR(255)    NOT NULL,
    code                    VARCHAR(50),
    payroll_type            VARCHAR(20)     NOT NULL DEFAULT 'monthly',
      -- values: 'hourly', 'monthly'
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_positions_tenant ON positions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_positions_dept ON positions(department_id);
CREATE INDEX idx_positions_grade ON positions(employment_grade_id);

-- ============================================================
-- 7. EMPLOYEES
-- ============================================================
CREATE TABLE employees (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT          NOT NULL REFERENCES tenants(id),
    position_id         BIGINT          NOT NULL REFERENCES positions(id),
    location_id         BIGINT          REFERENCES locations(id),
    employee_number     VARCHAR(50)     NOT NULL,
    full_name           VARCHAR(255)    NOT NULL,
    email               VARCHAR(255)    NOT NULL,
    phone               VARCHAR(20),
    nik                 VARCHAR(20),               -- Nomor Induk Kependudukan
    npwp                VARCHAR(30),               -- Nomor Pokok Wajib Pajak
    gender              VARCHAR(10),               -- 'male', 'female'
    birth_date          DATE,
    join_date           DATE            NOT NULL,
    end_date            DATE,
    employment_status   VARCHAR(30)     NOT NULL DEFAULT 'permanent',
      -- values: 'permanent', 'contract', 'probation', 'intern', 'freelance'
    marital_status      VARCHAR(20)     DEFAULT 'single',
      -- values: 'single', 'married', 'divorced', 'widowed'
    dependent_count     SMALLINT        NOT NULL DEFAULT 0,  -- tanggungan PTKP
    bank_name           VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name   VARCHAR(255),
    base_salary         NUMERIC(15,2)   NOT NULL DEFAULT 0,
    hourly_rate         NUMERIC(12,2),             -- wajib jika payroll_type = hourly
    overtime_rate_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
    ptkp_status         VARCHAR(10)     NOT NULL DEFAULT 'TK0',
      -- values: TK0, TK1, TK2, TK3, K0, K1, K2, K3, HB0 dst
    role                VARCHAR(30)     NOT NULL DEFAULT 'employee',
      -- values: 'super_admin','tenant_admin','hr_admin','hr_staff','manager','supervisor','employee'
    password_hash       TEXT            NOT NULL,
    avatar_url          TEXT,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT uq_employee_number UNIQUE (tenant_id, employee_number),
    CONSTRAINT uq_employee_email  UNIQUE (tenant_id, email)
);

-- High-traffic indexes
CREATE INDEX idx_emp_tenant         ON employees(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emp_position       ON employees(position_id);
CREATE INDEX idx_emp_location       ON employees(location_id);
CREATE INDEX idx_emp_role           ON employees(tenant_id, role);
CREATE INDEX idx_emp_status         ON employees(tenant_id, employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_emp_fullname_trgm  ON employees USING GIN(full_name gin_trgm_ops);

-- ============================================================
-- 8. SHIFT TEMPLATES
-- ============================================================
CREATE TABLE shift_templates (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT          NOT NULL REFERENCES tenants(id),
    name                    VARCHAR(100)    NOT NULL,  -- "Shift Pagi A", "Shift Malam B"
    shift_type              VARCHAR(20)     NOT NULL DEFAULT 'fixed',
      -- values: 'fixed', 'rotating', 'flexible', 'split'
    start_time              TIME            NOT NULL,
    end_time                TIME            NOT NULL,
    is_overnight            BOOLEAN         NOT NULL DEFAULT FALSE,
    break_duration_minutes  INT             NOT NULL DEFAULT 60,
    tolerance_late_minutes  INT             NOT NULL DEFAULT 15,
    work_days               VARCHAR(20)     NOT NULL DEFAULT '1,2,3,4,5',
      -- comma-separated: 1=Mon, 7=Sun
    color_hex               VARCHAR(7)      DEFAULT '#3B82F6',
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_shifts_tenant ON shift_templates(tenant_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. SHIFT ASSIGNMENTS (Jadwal karyawan per periode)
-- ============================================================
CREATE TABLE shift_assignments (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT          NOT NULL REFERENCES tenants(id),
    employee_id         BIGINT          NOT NULL REFERENCES employees(id),
    shift_template_id   BIGINT          NOT NULL REFERENCES shift_templates(id),
    location_id         BIGINT          REFERENCES locations(id),
    effective_date      DATE            NOT NULL,
    end_date            DATE,
    recurrence          VARCHAR(20)     NOT NULL DEFAULT 'weekly',
      -- values: 'once', 'daily', 'weekly', 'biweekly', 'monthly'
    assigned_by         BIGINT          NOT NULL REFERENCES employees(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sa_employee     ON shift_assignments(employee_id);
CREATE INDEX idx_sa_shift        ON shift_assignments(shift_template_id);
CREATE INDEX idx_sa_effective    ON shift_assignments(employee_id, effective_date, end_date);
CREATE INDEX idx_sa_tenant       ON shift_assignments(tenant_id);

-- ============================================================
-- 10. SHIFT SWAP REQUESTS
-- ============================================================
CREATE TABLE shift_swap_requests (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT          NOT NULL REFERENCES tenants(id),
    requester_id            BIGINT          NOT NULL REFERENCES employees(id),
    target_employee_id      BIGINT          NOT NULL REFERENCES employees(id),
    requester_assignment_id BIGINT          NOT NULL REFERENCES shift_assignments(id),
    target_assignment_id    BIGINT          NOT NULL REFERENCES shift_assignments(id),
    swap_date               DATE            NOT NULL,
    reason                  TEXT,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending',
      -- values: 'pending', 'target_approved', 'supervisor_approved', 'rejected', 'cancelled'
    target_approved_at      TIMESTAMPTZ,
    supervisor_id           BIGINT          REFERENCES employees(id),
    supervisor_approved_at  TIMESTAMPTZ,
    reject_reason           TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_swap_requester ON shift_swap_requests(requester_id);
CREATE INDEX idx_swap_target    ON shift_swap_requests(target_employee_id);
CREATE INDEX idx_swap_status    ON shift_swap_requests(tenant_id, status);

-- ============================================================
-- 11. ATTENDANCES (Core — high write volume)
-- ============================================================
CREATE TABLE attendances (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT          NOT NULL REFERENCES tenants(id),
    employee_id         BIGINT          NOT NULL REFERENCES employees(id),
    location_id         BIGINT          REFERENCES locations(id),
    shift_assignment_id BIGINT          REFERENCES shift_assignments(id),
    attendance_date     DATE            NOT NULL,
    clock_in_at         TIMESTAMPTZ,
    clock_out_at        TIMESTAMPTZ,
    clock_in_lat        NUMERIC(10,7),
    clock_in_lng        NUMERIC(10,7),
    clock_in_accuracy   NUMERIC(8,2),    -- meters
    clock_out_lat       NUMERIC(10,7),
    clock_out_lng       NUMERIC(10,7),
    clock_out_accuracy  NUMERIC(8,2),
    clock_in_distance   NUMERIC(10,2),   -- jarak dari pusat lokasi (meter)
    clock_in_photo_url  TEXT,
    clock_out_photo_url TEXT,
    status              VARCHAR(30)     NOT NULL DEFAULT 'present',
      -- values: 'present','absent','late','early_leave','leave','sick','holiday','off'
    clock_in_status     VARCHAR(20)     NOT NULL DEFAULT 'valid',
      -- values: 'valid', 'outside_radius', 'mock_gps', 'manual', 'system'
    is_mock_gps         BOOLEAN         NOT NULL DEFAULT FALSE,
    fraud_flag          BOOLEAN         NOT NULL DEFAULT FALSE,
    late_minutes        INT             NOT NULL DEFAULT 0,
    early_leave_minutes INT             NOT NULL DEFAULT 0,
    effective_work_minutes INT          NOT NULL DEFAULT 0,
    overtime_minutes    INT             NOT NULL DEFAULT 0,
    outside_radius_note TEXT,
    approved_by         BIGINT          REFERENCES employees(id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date)
);

-- High-traffic indexes (query dominan: per employee per range, per tenant per date)
CREATE INDEX idx_att_employee_date  ON attendances(employee_id, attendance_date DESC);
CREATE INDEX idx_att_tenant_date    ON attendances(tenant_id, attendance_date DESC);
CREATE INDEX idx_att_location       ON attendances(location_id);
CREATE INDEX idx_att_status         ON attendances(tenant_id, status, attendance_date);
CREATE INDEX idx_att_fraud          ON attendances(tenant_id, fraud_flag) WHERE fraud_flag = TRUE;
CREATE INDEX idx_att_late           ON attendances(employee_id, attendance_date) WHERE late_minutes > 0;

-- ============================================================
-- 12. LEAVE REQUESTS (Izin & Cuti)
-- ============================================================
CREATE TABLE leave_requests (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT          NOT NULL REFERENCES tenants(id),
    employee_id     BIGINT          NOT NULL REFERENCES employees(id),
    leave_type      VARCHAR(30)     NOT NULL,
      -- values: 'annual','sick','unpaid','maternity','paternity','emergency','other'
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    total_days      SMALLINT        NOT NULL,
    is_paid         BOOLEAN         NOT NULL DEFAULT TRUE,
    reason          TEXT,
    document_url    TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending',
      -- values: 'pending', 'approved', 'rejected', 'cancelled'
    reviewed_by     BIGINT          REFERENCES employees(id),
    reviewed_at     TIMESTAMPTZ,
    reject_reason   TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_employee   ON leave_requests(employee_id, start_date DESC);
CREATE INDEX idx_leave_tenant     ON leave_requests(tenant_id, status);
CREATE INDEX idx_leave_date_range ON leave_requests(employee_id, start_date, end_date);

-- ============================================================
-- 13. OVERTIME REQUESTS
-- ============================================================
CREATE TABLE overtime_requests (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT          NOT NULL REFERENCES tenants(id),
    employee_id     BIGINT          NOT NULL REFERENCES employees(id),
    attendance_id   BIGINT          REFERENCES attendances(id),
    overtime_date   DATE            NOT NULL,
    start_time      TIMESTAMPTZ     NOT NULL,
    end_time        TIMESTAMPTZ     NOT NULL,
    duration_minutes INT            NOT NULL,
    multiplier      NUMERIC(4,2)    NOT NULL DEFAULT 1.5,
    reason          TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending',
      -- values: 'pending', 'approved', 'rejected'
    approved_by     BIGINT          REFERENCES employees(id),
    approved_at     TIMESTAMPTZ,
    reject_reason   TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ot_employee ON overtime_requests(employee_id, overtime_date DESC);
CREATE INDEX idx_ot_tenant   ON overtime_requests(tenant_id, status);

-- ============================================================
-- 14. SALARY COMPONENTS (Master Komponen Gaji)
-- ============================================================
CREATE TABLE salary_components (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT          NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255)    NOT NULL,  -- "Tunjangan Makan", "BPJS Kesehatan"
    code            VARCHAR(50)     NOT NULL,  -- "TUNJ_MAKAN", "BPJS_KES"
    component_type  VARCHAR(20)     NOT NULL,
      -- values: 'earning_fixed','earning_variable','deduction_fixed','deduction_variable','tax','bpjs'
    is_taxable      BOOLEAN         NOT NULL DEFAULT TRUE,
    is_bpjs_base    BOOLEAN         NOT NULL DEFAULT FALSE,
    default_amount  NUMERIC(15,2)   NOT NULL DEFAULT 0,
    default_rate    NUMERIC(8,4)    NOT NULL DEFAULT 0,
    calculation_basis VARCHAR(20)   NOT NULL DEFAULT 'fixed',
      -- values: 'fixed', 'percent_of_base', 'percent_of_total_earn'
    is_system       BOOLEAN         NOT NULL DEFAULT FALSE,  -- komponen sistem (BPJS, PPh21) tidak bisa hapus
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_component_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_comp_tenant ON salary_components(tenant_id);

-- ============================================================
-- 15. EMPLOYEE SALARY COMPONENTS (Komponen per karyawan)
-- ============================================================
CREATE TABLE employee_salary_components (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT          NOT NULL REFERENCES tenants(id),
    employee_id             BIGINT          NOT NULL REFERENCES employees(id),
    salary_component_id     BIGINT          NOT NULL REFERENCES salary_components(id),
    amount                  NUMERIC(15,2)   NOT NULL DEFAULT 0,
    rate                    NUMERIC(8,4)    NOT NULL DEFAULT 0,
    effective_from          DATE            NOT NULL,
    effective_until         DATE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_esc_employee  ON employee_salary_components(employee_id);
CREATE INDEX idx_esc_component ON employee_salary_components(salary_component_id);
CREATE INDEX idx_esc_effective ON employee_salary_components(employee_id, effective_from, effective_until);

-- ============================================================
-- 16. PAYROLL RUNS (Periode Penggajian)
-- ============================================================
CREATE TABLE payroll_runs (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT          NOT NULL REFERENCES tenants(id),
    period_year         SMALLINT        NOT NULL,
    period_month        SMALLINT        NOT NULL,
    period_label        VARCHAR(50)     NOT NULL,  -- "Oktober 2026"
    pay_date            DATE,
    status              VARCHAR(20)     NOT NULL DEFAULT 'draft',
      -- values: 'draft', 'processing', 'reviewed', 'approved', 'paid', 'cancelled'
    total_employees     INT             NOT NULL DEFAULT 0,
    total_gross         NUMERIC(18,2)   NOT NULL DEFAULT 0,
    total_deductions    NUMERIC(18,2)   NOT NULL DEFAULT 0,
    total_net           NUMERIC(18,2)   NOT NULL DEFAULT 0,
    generated_by        BIGINT          NOT NULL REFERENCES employees(id),
    generated_at        TIMESTAMPTZ,
    reviewed_by         BIGINT          REFERENCES employees(id),
    reviewed_at         TIMESTAMPTZ,
    approved_by         BIGINT          REFERENCES employees(id),
    approved_at         TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_run UNIQUE (tenant_id, period_year, period_month)
);

CREATE INDEX idx_pr_tenant  ON payroll_runs(tenant_id, period_year DESC, period_month DESC);
CREATE INDEX idx_pr_status  ON payroll_runs(tenant_id, status);

-- ============================================================
-- 17. PAYROLL ITEMS (Per Karyawan per Run)
-- ============================================================
CREATE TABLE payroll_items (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT          NOT NULL REFERENCES tenants(id),
    payroll_run_id          BIGINT          NOT NULL REFERENCES payroll_runs(id),
    employee_id             BIGINT          NOT NULL REFERENCES employees(id),
    payroll_type            VARCHAR(20)     NOT NULL,  -- 'hourly' or 'monthly'
    -- Rekap kehadiran snapshot
    working_days            SMALLINT        NOT NULL DEFAULT 0,
    present_days            SMALLINT        NOT NULL DEFAULT 0,
    absent_days             SMALLINT        NOT NULL DEFAULT 0,
    late_count              SMALLINT        NOT NULL DEFAULT 0,
    late_total_minutes      INT             NOT NULL DEFAULT 0,
    total_work_hours        NUMERIC(8,2)    NOT NULL DEFAULT 0,
    overtime_hours          NUMERIC(8,2)    NOT NULL DEFAULT 0,
    -- Kalkulasi
    base_salary             NUMERIC(15,2)   NOT NULL DEFAULT 0,
    total_earnings          NUMERIC(15,2)   NOT NULL DEFAULT 0,
    total_deductions        NUMERIC(15,2)   NOT NULL DEFAULT 0,
    total_bpjs_employee     NUMERIC(15,2)   NOT NULL DEFAULT 0,
    total_bpjs_company      NUMERIC(15,2)   NOT NULL DEFAULT 0,
    pph21                   NUMERIC(15,2)   NOT NULL DEFAULT 0,
    net_salary              NUMERIC(15,2)   NOT NULL DEFAULT 0,
    slip_url                TEXT,
    slip_generated_at       TIMESTAMPTZ,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'calculated',
      -- values: 'calculated', 'approved', 'paid'
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_item UNIQUE (payroll_run_id, employee_id)
);

-- High-traffic: lookup slip gaji per karyawan
CREATE INDEX idx_pi_employee    ON payroll_items(employee_id, payroll_run_id DESC);
CREATE INDEX idx_pi_run         ON payroll_items(payroll_run_id);
CREATE INDEX idx_pi_tenant      ON payroll_items(tenant_id);
CREATE INDEX idx_pi_status      ON payroll_items(payroll_run_id, status);

-- ============================================================
-- 18. PAYROLL ITEM DETAILS (Breakdown komponen per item)
-- ============================================================
CREATE TABLE payroll_item_details (
    id                      BIGSERIAL PRIMARY KEY,
    payroll_item_id         BIGINT          NOT NULL REFERENCES payroll_items(id),
    salary_component_id     BIGINT          NOT NULL REFERENCES salary_components(id),
    component_name          VARCHAR(255)    NOT NULL,  -- snapshot nama saat itu
    component_type          VARCHAR(20)     NOT NULL,
    amount                  NUMERIC(15,2)   NOT NULL DEFAULT 0,
    notes                   TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pid_item       ON payroll_item_details(payroll_item_id);
CREATE INDEX idx_pid_component  ON payroll_item_details(salary_component_id);

-- ============================================================
-- 19. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT          NOT NULL REFERENCES tenants(id),
    actor_id        BIGINT          REFERENCES employees(id),
    action          VARCHAR(100)    NOT NULL,  -- 'attendance.clock_in', 'payroll.approved', dll
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       BIGINT,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_al_tenant      ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_al_actor       ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_al_entity      ON audit_logs(entity_type, entity_id);

-- ============================================================
-- 20. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT          NOT NULL REFERENCES tenants(id),
    employee_id     BIGINT          NOT NULL REFERENCES employees(id),
    type            VARCHAR(50)     NOT NULL,  -- 'clock_in_reminder', 'payslip_ready', dll
    title           VARCHAR(255)    NOT NULL,
    body            TEXT,
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_employee ON notifications(employee_id, is_read, created_at DESC);
CREATE INDEX idx_notif_unread   ON notifications(employee_id) WHERE is_read = FALSE;
```

---

## Sample Seed Data (Realistis)

```sql
-- ============================================================
-- SEED: TENANT
-- ============================================================
INSERT INTO tenants (name, slug, primary_color, secondary_color, timezone)
VALUES
  ('PT Maju Bersama Industri', 'pt-maju-bersama', '#1D4ED8', '#7C3AED', 'Asia/Jakarta'),
  ('CV Cahaya Outlet Group',   'cv-cahaya-outlet', '#065F46', '#D97706', 'Asia/Jakarta');

-- ============================================================
-- SEED: LOCATIONS
-- ============================================================
INSERT INTO locations (tenant_id, name, address, latitude, longitude, radius_meter, allow_outside_with_reason, max_outside_tolerance_count, require_photo)
VALUES
  (1, 'Pabrik Cimahi',        'Jl. Industri No.12, Cimahi, Jawa Barat',        -6.8700, 107.5390, 100, FALSE, 0,  TRUE),
  (1, 'Kantor Pusat Bandung',  'Jl. Asia Afrika No.8, Bandung',                 -6.9175, 107.6191, 150, TRUE,  3,  FALSE),
  (2, 'Outlet Dago',           'Jl. Ir. H. Juanda No.77, Bandung',              -6.8965, 107.6129, 80,  TRUE,  2,  TRUE),
  (2, 'Outlet Cihampelas',     'Jl. Cihampelas No.160, Bandung',                -6.8923, 107.6059, 80,  TRUE,  2,  TRUE);

-- Update PostGIS geometry
UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);

-- ============================================================
-- SEED: DEPARTMENTS
-- ============================================================
INSERT INTO departments (tenant_id, name, code)
VALUES
  (1, 'Produksi',         'PROD'),
  (1, 'Quality Control',  'QC'),
  (1, 'Human Resources',  'HR'),
  (1, 'Finance',          'FIN'),
  (2, 'Operasional Outlet','OPS'),
  (2, 'Human Resources',   'HR2');

-- ============================================================
-- SEED: EMPLOYMENT GRADES
-- ============================================================
INSERT INTO employment_grades (tenant_id, name, level)
VALUES
  (1, 'Operator Produksi', 1),
  (1, 'Teknisi',           2),
  (1, 'Staf',              3),
  (1, 'Manajemen',         4),
  (2, 'Pramuniaga',        1),
  (2, 'Supervisor Outlet', 3),
  (2, 'Manajemen',         4);

-- ============================================================
-- SEED: LATE RULES
-- ============================================================
INSERT INTO late_rules (tenant_id, employment_grade_id, tolerance_minutes, late_affects_payroll, deduction_method, deduction_amount, deduction_rate, effective_from)
VALUES
  -- Operator Produksi: per-minute, 0 toleransi
  (1, 1, 0,  TRUE,  'per_minute', 0,       0.0003, '2024-01-01'),
  -- Teknisi: 5 menit toleransi, flat cut Rp 20.000
  (1, 2, 5,  TRUE,  'flat_cut',   20000,   0,      '2024-01-01'),
  -- Staf: 15 menit toleransi, flat cut Rp 25.000
  (1, 3, 15, TRUE,  'flat_cut',   25000,   0,      '2024-01-01'),
  -- Manajemen: 30 menit toleransi, tidak dipotong
  (1, 4, 30, FALSE, 'none',       0,       0,      '2024-01-01'),
  -- Pramuniaga outlet: 10 menit, flat cut Rp 15.000
  (2, 5, 10, TRUE,  'flat_cut',   15000,   0,      '2024-01-01'),
  -- Supervisor outlet: 15 menit, tidak dipotong
  (2, 6, 15, FALSE, 'none',       0,       0,      '2024-01-01');

-- ============================================================
-- SEED: POSITIONS
-- ============================================================
INSERT INTO positions (tenant_id, department_id, employment_grade_id, name, code, payroll_type)
VALUES
  (1, 1, 1, 'Operator Line A',     'OPR-A',  'hourly'),
  (1, 1, 1, 'Operator Line B',     'OPR-B',  'hourly'),
  (1, 2, 2, 'Teknisi QC',          'TKN-QC', 'monthly'),
  (1, 3, 3, 'Staf HR',             'STF-HR', 'monthly'),
  (1, 3, 4, 'HR Manager',          'MGR-HR', 'monthly'),
  (2, 5, 5, 'Pramuniaga Outlet',   'PRM-OTL','monthly'),
  (2, 5, 6, 'Supervisor Outlet',   'SPV-OTL','monthly'),
  (2, 6, 4, 'HR Manager Outlet',   'MGR-HR2','monthly');

-- ============================================================
-- SEED: EMPLOYEES (10 representatif)
-- ============================================================
INSERT INTO employees (
  tenant_id, position_id, location_id, employee_number, full_name, email,
  phone, nik, join_date, employment_status, marital_status, dependent_count,
  bank_name, bank_account_number, bank_account_name,
  base_salary, hourly_rate, overtime_rate_multiplier, ptkp_status, role, password_hash
)
VALUES
  -- Tenant 1: Pabrik
  (1, 1, 1, 'EMP-2024-001', 'Agus Supriyadi',    'agus@maju.co.id',    '081234560001', '3273011234560001', '2020-03-01', 'permanent',  'married',  2, 'BCA',     '1231001001', 'Agus Supriyadi',    0,         22000, 1.5, 'K2',  'employee',   '$2b$10$hashedpassword1'),
  (1, 1, 1, 'EMP-2024-002', 'Dewi Lestari',      'dewi@maju.co.id',    '081234560002', '3273012234560002', '2021-06-15', 'permanent',  'single',   0, 'Mandiri', '1231002002', 'Dewi Lestari',      0,         22000, 1.5, 'TK0', 'employee',   '$2b$10$hashedpassword2'),
  (1, 2, 1, 'EMP-2024-003', 'Rudi Hartono',      'rudi@maju.co.id',    '081234560003', '3273013234560003', '2019-01-10', 'permanent',  'married',  1, 'BNI',     '1231003003', 'Rudi Hartono',      0,         22000, 1.5, 'K1',  'employee',   '$2b$10$hashedpassword3'),
  (1, 3, 1, 'EMP-2024-004', 'Siti Rahayu',       'siti@maju.co.id',    '081234560004', '3273014234560004', '2022-02-01', 'permanent',  'single',   0, 'BCA',     '1231004004', 'Siti Rahayu',       4500000,   NULL,  1.5, 'TK0', 'employee',   '$2b$10$hashedpassword4'),
  (1, 4, 2, 'EMP-2024-005', 'Budi Firmansyah',   'budi@maju.co.id',    '081234560005', '3273015234560005', '2018-08-01', 'permanent',  'married',  3, 'BRI',     '1231005005', 'Budi Firmansyah',   6500000,   NULL,  2.0, 'K3',  'hr_staff',   '$2b$10$hashedpassword5'),
  (1, 5, 2, 'EMP-2024-006', 'Nining Ratnasari',  'nining@maju.co.id',  '081234560006', '3273016234560006', '2017-04-20', 'permanent',  'married',  2, 'BCA',     '1231006006', 'Nining Ratnasari',  9000000,   NULL,  2.0, 'K2',  'hr_admin',   '$2b$10$hashedpassword6'),
  -- Tenant 2: Outlet
  (2, 6, 3, 'OTL-2023-001', 'Rizky Pratama',     'rizky@cahaya.co.id', '081234560007', '3273017234560007', '2023-01-15', 'permanent',  'single',   0, 'BCA',     '2231001001', 'Rizky Pratama',     3200000,   NULL,  1.5, 'TK0', 'employee',   '$2b$10$hashedpassword7'),
  (2, 6, 4, 'OTL-2023-002', 'Yanti Kusuma',      'yanti@cahaya.co.id', '081234560008', '3273018234560008', '2023-03-01', 'permanent',  'single',   0, 'Mandiri', '2231002002', 'Yanti Kusuma',      3200000,   NULL,  1.5, 'TK0', 'employee',   '$2b$10$hashedpassword8'),
  (2, 7, 3, 'OTL-2023-003', 'Hendra Wijaya',     'hendra@cahaya.co.id','081234560009', '3273019234560009', '2022-07-01', 'permanent',  'married',  1, 'BNI',     '2231003003', 'Hendra Wijaya',     5500000,   NULL,  1.5, 'K1',  'supervisor', '$2b$10$hashedpassword9'),
  (2, 8, 3, 'OTL-2023-004', 'Rika Marlina',      'rika@cahaya.co.id',  '081234560010', '3273020234560010', '2021-05-01', 'permanent',  'married',  2, 'BCA',     '2231004004', 'Rika Marlina',      8500000,   NULL,  2.0, 'K2',  'hr_admin',   '$2b$10$hashedpassword10');

-- ============================================================
-- SEED: SHIFT TEMPLATES
-- ============================================================
INSERT INTO shift_templates (tenant_id, name, shift_type, start_time, end_time, is_overnight, break_duration_minutes, tolerance_late_minutes, work_days, color_hex)
VALUES
  (1, 'Shift Pagi A',    'fixed',    '06:00', '14:00', FALSE, 60, 0,  '1,2,3,4,5', '#3B82F6'),
  (1, 'Shift Siang B',   'fixed',    '14:00', '22:00', FALSE, 60, 0,  '1,2,3,4,5', '#F59E0B'),
  (1, 'Shift Malam C',   'fixed',    '22:00', '06:00', TRUE,  60, 0,  '1,2,3,4,5,6', '#6366F1'),
  (1, 'Jam Kantor',      'fixed',    '08:00', '17:00', FALSE, 60, 15, '1,2,3,4,5', '#10B981'),
  (2, 'Shift Outlet Pagi','fixed',   '08:00', '16:00', FALSE, 60, 10, '1,2,3,4,5,6', '#EF4444'),
  (2, 'Shift Outlet Sore','fixed',   '14:00', '22:00', FALSE, 60, 10, '1,2,3,4,5,6', '#8B5CF6');

-- ============================================================
-- SEED: SHIFT ASSIGNMENTS
-- ============================================================
INSERT INTO shift_assignments (tenant_id, employee_id, shift_template_id, location_id, effective_date, recurrence, assigned_by)
VALUES
  (1, 1, 1, 1, '2026-01-01', 'weekly', 6),  -- Agus: Shift Pagi A
  (1, 2, 2, 1, '2026-01-01', 'weekly', 6),  -- Dewi: Shift Siang B
  (1, 3, 1, 1, '2026-01-01', 'weekly', 6),  -- Rudi: Shift Pagi A
  (1, 4, 4, 2, '2026-01-01', 'weekly', 6),  -- Siti: Jam Kantor
  (1, 5, 4, 2, '2026-01-01', 'weekly', 6),  -- Budi: Jam Kantor
  (1, 6, 4, 2, '2026-01-01', 'weekly', 6),  -- Nining: Jam Kantor
  (2, 7, 5, 3, '2026-01-01', 'weekly', 10), -- Rizky: Outlet Pagi
  (2, 8, 6, 4, '2026-01-01', 'weekly', 10), -- Yanti: Outlet Sore
  (2, 9, 5, 3, '2026-01-01', 'weekly', 10), -- Hendra: Outlet Pagi
  (2,10, 4, 3, '2026-01-01', 'weekly', 10); -- Rika: Jam Kantor

-- ============================================================
-- SEED: SALARY COMPONENTS (Master)
-- ============================================================
INSERT INTO salary_components (tenant_id, name, code, component_type, is_taxable, is_bpjs_base, default_amount, default_rate, calculation_basis, is_system)
VALUES
  (1, 'Gaji Pokok',           'GAJI_POKOK',   'earning_fixed',      TRUE,  TRUE,  0,      0,      'fixed',             FALSE),
  (1, 'Tunjangan Makan',      'TUNJ_MAKAN',   'earning_fixed',      FALSE, FALSE, 600000, 0,      'fixed',             FALSE),
  (1, 'Tunjangan Transport',  'TUNJ_TRANS',   'earning_fixed',      FALSE, FALSE, 400000, 0,      'fixed',             FALSE),
  (1, 'Upah Lembur',          'LEMBUR',       'earning_variable',   TRUE,  FALSE, 0,      0,      'fixed',             FALSE),
  (1, 'BPJS Kesehatan (Kar)', 'BPJS_KES_KAR', 'bpjs',              FALSE, FALSE, 0,      0.01,   'percent_of_base',   TRUE),
  (1, 'BPJS TK JHT (Kar)',    'BPJS_JHT_KAR', 'bpjs',              FALSE, FALSE, 0,      0.02,   'percent_of_base',   TRUE),
  (1, 'BPJS TK JP (Kar)',     'BPJS_JP_KAR',  'bpjs',              FALSE, FALSE, 0,      0.01,   'percent_of_base',   TRUE),
  (1, 'PPh 21',               'PPH21',         'tax',               FALSE, FALSE, 0,      0,      'fixed',             TRUE),
  (1, 'Pot. Keterlambatan',   'POT_TELAT',     'deduction_variable',FALSE, FALSE, 0,      0,      'fixed',             FALSE),
  (1, 'Pot. Absensi',         'POT_ABSEN',     'deduction_variable',FALSE, FALSE, 0,      0,      'fixed',             FALSE),
  -- Tenant 2
  (2, 'Gaji Pokok',           'GAJI_POKOK',   'earning_fixed',      TRUE,  TRUE,  0,      0,      'fixed',             FALSE),
  (2, 'Tunjangan Jabatan',    'TUNJ_JAB',     'earning_fixed',      TRUE,  FALSE, 0,      0,      'fixed',             FALSE),
  (2, 'Uang Makan',           'TUNJ_MAKAN',   'earning_fixed',      FALSE, FALSE, 500000, 0,      'fixed',             FALSE),
  (2, 'BPJS Kesehatan (Kar)', 'BPJS_KES_KAR', 'bpjs',              FALSE, FALSE, 0,      0.01,   'percent_of_base',   TRUE),
  (2, 'PPh 21',               'PPH21',         'tax',               FALSE, FALSE, 0,      0,      'fixed',             TRUE);

-- ============================================================
-- SEED: EMPLOYEE SALARY COMPONENTS
-- ============================================================
INSERT INTO employee_salary_components (tenant_id, employee_id, salary_component_id, amount, rate, effective_from)
VALUES
  -- Agus (hourly: base 0, rate per jam)
  (1, 1, 2, 600000, 0, '2024-01-01'),  -- tunjangan makan
  (1, 1, 3, 400000, 0, '2024-01-01'),  -- transport
  -- Dewi (hourly)
  (1, 2, 2, 600000, 0, '2024-01-01'),
  (1, 2, 3, 400000, 0, '2024-01-01'),
  -- Siti (monthly staf)
  (1, 4, 1, 4500000, 0, '2022-02-01'), -- gaji pokok
  (1, 4, 2, 600000,  0, '2022-02-01'),
  (1, 4, 3, 400000,  0, '2022-02-01'),
  -- Nining (hr_admin)
  (1, 6, 1, 9000000, 0, '2017-04-20'),
  (1, 6, 2, 800000,  0, '2017-04-20'),
  (1, 6, 3, 600000,  0, '2017-04-20'),
  -- Rizky (outlet pramuniaga)
  (2, 7, 11, 3200000, 0, '2023-01-15'),
  (2, 7, 13, 500000,  0, '2023-01-15'),
  -- Hendra (supervisor outlet)
  (2, 9, 11, 5500000, 0, '2022-07-01'),
  (2, 9, 12, 1000000, 0, '2022-07-01'),  -- tunjangan jabatan
  (2, 9, 13, 500000,  0, '2022-07-01');

-- ============================================================
-- SEED: ATTENDANCES (Oktober 2026, 5 hari sample)
-- ============================================================
INSERT INTO attendances (
  tenant_id, employee_id, location_id, shift_assignment_id,
  attendance_date, clock_in_at, clock_out_at,
  clock_in_lat, clock_in_lng, clock_in_accuracy, clock_in_distance,
  status, clock_in_status, late_minutes, effective_work_minutes, overtime_minutes
)
VALUES
  -- 6 Okt: Agus hadir tepat waktu, pabrik
  (1, 1, 1, 1, '2026-10-06', '2026-10-06 05:58:00+07', '2026-10-06 14:05:00+07', -6.8700, 107.5390, 5.2, 8.0, 'present', 'valid', 0, 480, 0),
  -- 6 Okt: Dewi hadir terlambat 12 menit, shift siang
  (1, 2, 1, 2, '2026-10-06', '2026-10-06 14:12:00+07', '2026-10-06 22:03:00+07', -6.8701, 107.5391, 6.1, 12.0, 'late', 'valid', 12, 468, 0),
  -- 6 Okt: Siti hadir kantor, on time
  (1, 4, 2, 4, '2026-10-06', '2026-10-06 07:55:00+07', '2026-10-06 17:10:00+07', -6.9175, 107.6191, 8.0, 20.0, 'present', 'valid', 0, 480, 10),
  -- 6 Okt: Rizky outlet pagi, terlambat 18 menit (lewati toleransi 10 menit)
  (2, 7, 3, 7, '2026-10-06', '2026-10-06 08:18:00+07', '2026-10-06 16:02:00+07', -6.8965, 107.6129, 4.5, 6.0, 'late', 'valid', 18, 462, 0),
  -- 7 Okt: Agus hadir di luar radius (jarak 187m > 100m) tapi dapat toleransi
  (1, 1, 1, 1, '2026-10-07', '2026-10-07 06:02:00+07', '2026-10-07 14:00:00+07', -6.8715, 107.5402, 12.0, 187.3, 'present', 'outside_radius', 2, 478, 0),
  -- 7 Okt: Dewi absen tanpa kabar
  (1, 2, 1, 2, '2026-10-07', NULL, NULL, NULL, NULL, NULL, NULL, 'absent', 'system', 0, 0, 0),
  -- 8 Okt: GPS palsu terdeteksi pada Rudi
  (1, 3, 1, 3, '2026-10-08', '2026-10-08 06:01:00+07', NULL, -6.8700, 107.5390, 3.0, 0.0, 'present', 'mock_gps', 0, 0, 0);

-- Update fraud flag untuk mock gps
UPDATE attendances SET fraud_flag = TRUE, is_mock_gps = TRUE WHERE clock_in_status = 'mock_gps';

-- ============================================================
-- SEED: PAYROLL RUN (Oktober 2026)
-- ============================================================
INSERT INTO payroll_runs (
  tenant_id, period_year, period_month, period_label, pay_date,
  status, generated_by
)
VALUES
  (1, 2026, 10, 'Oktober 2026', '2026-10-28', 'draft', 6),
  (2, 2026, 10, 'Oktober 2026', '2026-10-28', 'draft', 10);

-- ============================================================
-- SEED: PAYROLL ITEMS (Siti — monthly staf sebagai contoh)
-- ============================================================
INSERT INTO payroll_items (
  tenant_id, payroll_run_id, employee_id, payroll_type,
  working_days, present_days, absent_days, late_count, late_total_minutes,
  total_work_hours, overtime_hours,
  base_salary, total_earnings, total_deductions,
  total_bpjs_employee, total_bpjs_company, pph21, net_salary,
  status
)
VALUES
  (1, 1, 4, 'monthly',
   23, 22, 0, 0, 0,
   176.0, 0.833,
   4500000, 5524348, 133304,
   46304, 175500, 0, 5391044,
   'calculated');

-- ============================================================
-- SEED: PAYROLL ITEM DETAILS (Siti)
-- ============================================================
INSERT INTO payroll_item_details (payroll_item_id, salary_component_id, component_name, component_type, amount)
VALUES
  (1, 1, 'Gaji Pokok',           'earning_fixed',     4500000),
  (1, 2, 'Tunjangan Makan',      'earning_fixed',      600000),
  (1, 3, 'Tunjangan Transport',  'earning_fixed',      400000),
  (1, 4, 'Upah Lembur',          'earning_variable',    24348),
  (1, 5, 'BPJS Kesehatan (Kar)', 'bpjs',                45000),
  (1, 6, 'BPJS TK JHT (Kar)',   'bpjs',                 4304);  -- sample
```

---

## Catatan Index Strategy

### Tabel `attendances` (volume tertinggi)
```
- Composite (employee_id, attendance_date DESC)     → rekap per karyawan
- Composite (tenant_id, attendance_date DESC)       → dashboard harian HR
- Partial (fraud_flag = TRUE)                       → monitoring keamanan
- Partial (late_minutes > 0)                        → laporan keterlambatan
```

### Tabel `payroll_items`
```
- Composite (employee_id, payroll_run_id DESC)      → history slip gaji karyawan
- Composite (payroll_run_id, status)                → progress payroll run
```

### Tabel `employees`
```
- GIN trgm pada full_name                           → search karyawan
- Composite (tenant_id, role)                       → role-based query
- Partial WHERE deleted_at IS NULL                  → soft delete efficiency
```

### Tabel `shift_assignments`
```
- Composite (employee_id, effective_date, end_date) → jadwal aktif karyawan
```

---

## Estimasi Volume Data (3 Tahun)

| Tabel | Baris / Tahun | 3 Tahun |
|---|---|---|
| employees | 500 / tenant | ~10.000 |
| attendances | 500 × 260 hari | ~390.000 / tenant |
| shift_assignments | 500 × 12 siklus | ~18.000 / tenant |
| payroll_items | 500 × 12 bulan | ~18.000 / tenant |
| payroll_item_details | 18.000 × 8 komponen | ~144.000 / tenant |
| audit_logs | ~2M / tahun | ~6M |

> Dengan indexing di atas, query rekap kehadiran 100K baris selesai < 50ms di PostgreSQL 15+ dengan hardware standar (8-core, 16GB RAM).
