import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

// Membaca env
let dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^DATABASE_URL=(.*)$/)
    if (match) dbUrl = match[1].trim()
  }
}

const sql = neon(dbUrl!)

async function runMigration() {
  console.log('🚀 Menjalankan DDL Database Migration...')

  // Extensions
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`
    console.log('✅ Extension PostGIS aktif')
  } catch (err: any) {
    console.warn('⚠️ PostGIS extension warning (bisa dilompati jika neon free tier tanpa postgis):', err.message)
  }

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`
    console.log('✅ Extension pg_trgm aktif')
  } catch (err: any) {
    console.warn('⚠️ pg_trgm extension warning:', err.message)
  }

  // 1. Tenants
  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      logo_url TEXT,
      primary_color VARCHAR(7) NOT NULL DEFAULT '#1D4ED8',
      secondary_color VARCHAR(7) NOT NULL DEFAULT '#7E3AF2',
      font_heading VARCHAR(50) NOT NULL DEFAULT 'Cabin',
      font_body VARCHAR(50) NOT NULL DEFAULT 'Albert Sans',
      slip_header_color VARCHAR(7) NOT NULL DEFAULT '#1D4ED8',
      timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
      currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `

  // 2. Locations
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      address TEXT,
      latitude NUMERIC(10,7) NOT NULL,
      longitude NUMERIC(10,7) NOT NULL,
      radius_meter INT NOT NULL DEFAULT 100,
      allow_outside_with_reason BOOLEAN NOT NULL DEFAULT FALSE,
      max_outside_tolerance_count INT NOT NULL DEFAULT 0,
      require_photo BOOLEAN NOT NULL DEFAULT FALSE,
      restrict_mock_location BOOLEAN NOT NULL DEFAULT TRUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `

  // 3. Departments
  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      parent_id BIGINT REFERENCES departments(id),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `

  // 4. Employment Grades
  await sql`
    CREATE TABLE IF NOT EXISTS employment_grades (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      name VARCHAR(100) NOT NULL,
      level SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 5. Late Rules
  await sql`
    CREATE TABLE IF NOT EXISTS late_rules (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      employment_grade_id BIGINT NOT NULL REFERENCES employment_grades(id),
      tolerance_minutes INT NOT NULL DEFAULT 0,
      late_affects_payroll BOOLEAN NOT NULL DEFAULT FALSE,
      deduction_method VARCHAR(20) NOT NULL DEFAULT 'none',
      deduction_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      deduction_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
      max_late_count_per_month INT NOT NULL DEFAULT 99,
      late_count_triggers_warning INT NOT NULL DEFAULT 3,
      effective_from DATE NOT NULL,
      effective_until DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 6. Positions
  await sql`
    CREATE TABLE IF NOT EXISTS positions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      department_id BIGINT NOT NULL REFERENCES departments(id),
      employment_grade_id BIGINT NOT NULL REFERENCES employment_grades(id),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      payroll_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `

  // 7. Employees
  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      position_id BIGINT NOT NULL REFERENCES positions(id),
      location_id BIGINT REFERENCES locations(id),
      employee_number VARCHAR(50) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      nik VARCHAR(20),
      npwp VARCHAR(30),
      gender VARCHAR(10),
      birth_date DATE,
      join_date DATE NOT NULL,
      end_date DATE,
      employment_status VARCHAR(30) NOT NULL DEFAULT 'permanent',
      marital_status VARCHAR(20) DEFAULT 'single',
      dependent_count SMALLINT NOT NULL DEFAULT 0,
      bank_name VARCHAR(100),
      bank_account_number VARCHAR(50),
      bank_account_name VARCHAR(255),
      base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
      hourly_rate NUMERIC(12,2),
      overtime_rate_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
      ptkp_status VARCHAR(10) NOT NULL DEFAULT 'TK0',
      role VARCHAR(30) NOT NULL DEFAULT 'employee',
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT uq_employee_number UNIQUE (tenant_id, employee_number),
      CONSTRAINT uq_employee_email UNIQUE (tenant_id, email)
    );
  `

  // 8. Shift Templates
  await sql`
    CREATE TABLE IF NOT EXISTS shift_templates (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      name VARCHAR(100) NOT NULL,
      shift_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
      break_duration_minutes INT NOT NULL DEFAULT 60,
      tolerance_late_minutes INT NOT NULL DEFAULT 15,
      work_days VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
      color_hex VARCHAR(7) DEFAULT '#3B82F6',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `

  // 9. Shift Assignments
  await sql`
    CREATE TABLE IF NOT EXISTS shift_assignments (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      shift_template_id BIGINT NOT NULL REFERENCES shift_templates(id),
      location_id BIGINT REFERENCES locations(id),
      effective_date DATE NOT NULL,
      end_date DATE,
      recurrence VARCHAR(20) NOT NULL DEFAULT 'weekly',
      assigned_by BIGINT NOT NULL REFERENCES employees(id),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 10. Shift Swap Requests
  await sql`
    CREATE TABLE IF NOT EXISTS shift_swap_requests (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      requester_id BIGINT NOT NULL REFERENCES employees(id),
      target_employee_id BIGINT NOT NULL REFERENCES employees(id),
      requester_assignment_id BIGINT NOT NULL REFERENCES shift_assignments(id),
      target_assignment_id BIGINT NOT NULL REFERENCES shift_assignments(id),
      swap_date DATE NOT NULL,
      reason TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      target_approved_at TIMESTAMPTZ,
      supervisor_id BIGINT REFERENCES employees(id),
      supervisor_approved_at TIMESTAMPTZ,
      reject_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 11. Attendances
  await sql`
    CREATE TABLE IF NOT EXISTS attendances (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      location_id BIGINT REFERENCES locations(id),
      shift_assignment_id BIGINT REFERENCES shift_assignments(id),
      attendance_date DATE NOT NULL,
      clock_in_at TIMESTAMPTZ,
      clock_out_at TIMESTAMPTZ,
      clock_in_lat NUMERIC(10,7),
      clock_in_lng NUMERIC(10,7),
      clock_in_accuracy NUMERIC(8,2),
      clock_out_lat NUMERIC(10,7),
      clock_out_lng NUMERIC(10,7),
      clock_out_accuracy NUMERIC(8,2),
      clock_in_distance NUMERIC(10,2),
      clock_in_photo_url TEXT,
      clock_out_photo_url TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'present',
      clock_in_status VARCHAR(20) NOT NULL DEFAULT 'valid',
      is_mock_gps BOOLEAN NOT NULL DEFAULT FALSE,
      fraud_flag BOOLEAN NOT NULL DEFAULT FALSE,
      late_minutes INT NOT NULL DEFAULT 0,
      early_leave_minutes INT NOT NULL DEFAULT 0,
      effective_work_minutes INT NOT NULL DEFAULT 0,
      overtime_minutes INT NOT NULL DEFAULT 0,
      outside_radius_note TEXT,
      approved_by BIGINT REFERENCES employees(id),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date)
    );
  `

  // 12. Leave Requests
  await sql`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      leave_type VARCHAR(30) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days SMALLINT NOT NULL,
      is_paid BOOLEAN NOT NULL DEFAULT TRUE,
      reason TEXT,
      document_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reviewed_by BIGINT REFERENCES employees(id),
      reviewed_at TIMESTAMPTZ,
      reject_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 13. Overtime Requests
  await sql`
    CREATE TABLE IF NOT EXISTS overtime_requests (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      attendance_id BIGINT REFERENCES attendances(id),
      overtime_date DATE NOT NULL,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      duration_minutes INT NOT NULL,
      multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
      reason TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      approved_by BIGINT REFERENCES employees(id),
      approved_at TIMESTAMPTZ,
      reject_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 14. Salary Components
  await sql`
    CREATE TABLE IF NOT EXISTS salary_components (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) NOT NULL,
      component_type VARCHAR(20) NOT NULL,
      is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
      is_bpjs_base BOOLEAN NOT NULL DEFAULT FALSE,
      default_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      default_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
      calculation_basis VARCHAR(20) NOT NULL DEFAULT 'fixed',
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_component_code UNIQUE (tenant_id, code)
    );
  `

  // 15. Employee Salary Components
  await sql`
    CREATE TABLE IF NOT EXISTS employee_salary_components (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      salary_component_id BIGINT NOT NULL REFERENCES salary_components(id),
      amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      rate NUMERIC(8,4) NOT NULL DEFAULT 0,
      effective_from DATE NOT NULL,
      effective_until DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 16. Payroll Runs
  await sql`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      period_year SMALLINT NOT NULL,
      period_month SMALLINT NOT NULL,
      period_label VARCHAR(50) NOT NULL,
      pay_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      total_employees INT NOT NULL DEFAULT 0,
      total_gross NUMERIC(18,2) NOT NULL DEFAULT 0,
      total_deductions NUMERIC(18,2) NOT NULL DEFAULT 0,
      total_net NUMERIC(18,2) NOT NULL DEFAULT 0,
      generated_by BIGINT NOT NULL REFERENCES employees(id),
      generated_at TIMESTAMPTZ,
      reviewed_by BIGINT REFERENCES employees(id),
      reviewed_at TIMESTAMPTZ,
      approved_by BIGINT REFERENCES employees(id),
      approved_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_payroll_run UNIQUE (tenant_id, period_year, period_month)
    );
  `

  // 17. Payroll Items
  await sql`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      payroll_run_id BIGINT NOT NULL REFERENCES payroll_runs(id),
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      payroll_type VARCHAR(20) NOT NULL,
      working_days SMALLINT NOT NULL DEFAULT 0,
      present_days SMALLINT NOT NULL DEFAULT 0,
      absent_days SMALLINT NOT NULL DEFAULT 0,
      late_count SMALLINT NOT NULL DEFAULT 0,
      late_total_minutes INT NOT NULL DEFAULT 0,
      total_work_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
      overtime_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
      base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_earnings NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_bpjs_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_bpjs_company NUMERIC(15,2) NOT NULL DEFAULT 0,
      pph21 NUMERIC(15,2) NOT NULL DEFAULT 0,
      net_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
      slip_url TEXT,
      slip_generated_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'calculated',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_payroll_item UNIQUE (payroll_run_id, employee_id)
    );
  `

  // 18. Payroll Item Details
  await sql`
    CREATE TABLE IF NOT EXISTS payroll_item_details (
      id BIGSERIAL PRIMARY KEY,
      payroll_item_id BIGINT NOT NULL REFERENCES payroll_items(id),
      salary_component_id BIGINT NOT NULL REFERENCES salary_components(id),
      component_name VARCHAR(255) NOT NULL,
      component_type VARCHAR(20) NOT NULL,
      amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 19. Audit Logs
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      actor_id BIGINT REFERENCES employees(id),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id BIGINT,
      old_values JSONB,
      new_values JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 20. Notifications
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id),
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  console.log('✅ Semua tabel DDL berhasil dimigrasikan!')
}

runMigration().catch(err => {
  console.error('❌ Gagal migrasi DDL:', err)
  process.exit(1)
})
