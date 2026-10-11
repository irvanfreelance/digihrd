import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

let dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^DATABASE_URL=(.*)$/)
    if (match) dbUrl = match[1].trim()
  }
}

const sql = neon(dbUrl!)

async function runSeed() {
  console.log('🌱 Menjalankan Seed Idempotent...')

  // 1. Tenant
  await sql`
    INSERT INTO tenants (id, name, slug, logo_url, primary_color, secondary_color, slip_header_color, timezone, currency)
    VALUES (
      1,
      'PT Pucuk Singkong Sejahtera',
      'pucuk-singkong',
      '/pucuk-singkong.png',
      '#1D4ED8',
      '#7C3AED',
      '#1D4ED8',
      'Asia/Jakarta',
      'IDR'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      slip_header_color = EXCLUDED.slip_header_color;
  `
  // Sync sequence
  await sql`SELECT setval('tenants_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tenants));`

  // 2. Locations
  await sql`
    INSERT INTO locations (id, tenant_id, name, address, latitude, longitude, radius_meter, allow_outside_with_reason, max_outside_tolerance_count, require_photo)
    VALUES
      (1, 1, 'Pabrik Cimahi', 'Jl. Industri No.12, Cimahi, Jawa Barat', -6.8700, 107.5390, 100, FALSE, 0, TRUE),
      (2, 1, 'Kantor Pusat Bandung', 'Jl. Asia Afrika No.8, Bandung', -6.9175, 107.6191, 150, TRUE, 3, FALSE),
      (3, 1, 'Outlet Dago', 'Jl. Ir. H. Juanda No.77, Bandung', -6.8965, 107.6129, 80, TRUE, 2, TRUE),
      (4, 1, 'Outlet Cihampelas', 'Jl. Cihampelas No.160, Bandung', -6.8923, 107.6059, 80, TRUE, 2, TRUE)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      radius_meter = EXCLUDED.radius_meter;
  `
  await sql`SELECT setval('locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM locations));`

  // 3. Departments
  await sql`
    INSERT INTO departments (id, tenant_id, name, code)
    VALUES
      (1, 1, 'Produksi', 'PROD'),
      (2, 1, 'Quality Control', 'QC'),
      (3, 1, 'Human Resources', 'HR'),
      (4, 1, 'Finance', 'FIN'),
      (5, 1, 'Operasional Outlet', 'OPS')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      code = EXCLUDED.code;
  `
  await sql`SELECT setval('departments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM departments));`

  // 4. Employment Grades
  await sql`
    INSERT INTO employment_grades (id, tenant_id, name, level)
    VALUES
      (1, 1, 'Produksi', 1),
      (2, 1, 'Teknisi / QC', 2),
      (3, 1, 'Staf', 3),
      (4, 1, 'Manajemen', 4)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      level = EXCLUDED.level;
  `
  await sql`SELECT setval('employment_grades_id_seq', (SELECT COALESCE(MAX(id), 1) FROM employment_grades));`

  // 5. Late Rules
  await sql`
    INSERT INTO late_rules (id, tenant_id, employment_grade_id, tolerance_minutes, late_affects_payroll, deduction_method, deduction_amount, effective_from)
    VALUES
      (1, 1, 1, 0, TRUE, 'per_minute', 500, '2026-01-01'),
      (2, 1, 2, 5, TRUE, 'per_hour', 20000, '2026-01-01'),
      (3, 1, 3, 15, TRUE, 'flat_cut', 25000, '2026-01-01'),
      (4, 1, 4, 30, FALSE, 'none', 0, '2026-01-01')
    ON CONFLICT (id) DO UPDATE SET
      tolerance_minutes = EXCLUDED.tolerance_minutes,
      deduction_method = EXCLUDED.deduction_method;
  `
  await sql`SELECT setval('late_rules_id_seq', (SELECT COALESCE(MAX(id), 1) FROM late_rules));`

  // 6. Positions
  await sql`
    INSERT INTO positions (id, tenant_id, department_id, employment_grade_id, name, code, payroll_type)
    VALUES
      (1, 1, 1, 1, 'Operator Line A', 'OPR-A', 'hourly'),
      (2, 1, 1, 1, 'Operator Line B', 'OPR-B', 'hourly'),
      (3, 1, 2, 2, 'Teknisi QC', 'TKN-QC', 'monthly'),
      (4, 1, 3, 3, 'Staf HR', 'STF-HR', 'monthly'),
      (5, 1, 3, 4, 'HR Manager', 'MGR-HR', 'monthly'),
      (6, 1, 5, 3, 'Pramuniaga Outlet', 'PRM-OTL', 'monthly'),
      (7, 1, 5, 4, 'Supervisor Outlet', 'SPV-OTL', 'monthly')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      payroll_type = EXCLUDED.payroll_type;
  `
  await sql`SELECT setval('positions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM positions));`

  // 7. Employees
  await sql`
    INSERT INTO employees (
      id, tenant_id, position_id, location_id, employee_number, full_name, email,
      phone, nik, join_date, employment_status, marital_status, dependent_count,
      bank_name, bank_account_number, bank_account_name,
      base_salary, hourly_rate, overtime_rate_multiplier, ptkp_status, role, password_hash
    )
    VALUES
      (1, 1, 1, 1, 'EMP-2024-001', 'Agus Supriyadi', 'agus@maju.co.id', '081234560001', '3273011234560001', '2020-03-01', 'permanent', 'married', 2, 'BCA', '1231001001', 'Agus Supriyadi', 0, 22000, 1.5, 'K2', 'employee', '$2b$10$hashed'),
      (2, 1, 1, 1, 'EMP-2024-002', 'Dewi Lestari', 'dewi@maju.co.id', '081234560002', '3273012234560002', '2021-06-15', 'permanent', 'single', 0, 'Mandiri', '1231002002', 'Dewi Lestari', 0, 22000, 1.5, 'TK0', 'employee', '$2b$10$hashed'),
      (3, 1, 2, 1, 'EMP-2024-003', 'Rudi Hartono', 'rudi@maju.co.id', '081234560003', '3273013234560003', '2019-01-10', 'permanent', 'married', 1, 'BNI', '1231003003', 'Rudi Hartono', 0, 22000, 1.5, 'K1', 'employee', '$2b$10$hashed'),
      (4, 1, 3, 2, 'EMP-2024-004', 'Siti Rahayu', 'siti@maju.co.id', '081234560004', '3273014234560004', '2022-02-01', 'permanent', 'single', 0, 'BCA', '1231004004', 'Siti Rahayu', 4500000, NULL, 1.5, 'TK0', 'employee', '$2b$10$hashed'),
      (5, 1, 4, 2, 'EMP-2024-005', 'Budi Firmansyah', 'budi@maju.co.id', '081234560005', '3273015234560005', '2018-08-01', 'permanent', 'married', 3, 'BRI', '1231005005', 'Budi Firmansyah', 6500000, NULL, 2.0, 'K3', 'hr_staff', '$2b$10$hashed'),
      (6, 1, 5, 2, 'EMP-2024-006', 'Nining Ratnasari', 'nining@maju.co.id', '081234560006', '3273016234560006', '2017-04-20', 'permanent', 'married', 2, 'BCA', '1231006006', 'Nining Ratnasari', 9000000, NULL, 2.0, 'K2', 'hr_admin', '$2b$10$hashed'),
      (7, 1, 6, 3, 'OTL-2023-001', 'Rizky Pratama', 'rizky@cahaya.co.id', '081234560007', '3273017234560007', '2023-01-15', 'permanent', 'single', 0, 'BCA', '2231001001', 'Rizky Pratama', 3200000, NULL, 1.5, 'TK0', 'employee', '$2b$10$hashed'),
      (8, 1, 6, 4, 'OTL-2023-002', 'Yanti Kusuma', 'yanti@cahaya.co.id', '081234560008', '3273018234560008', '2023-03-01', 'permanent', 'single', 0, 'Mandiri', '2231002002', 'Yanti Kusuma', 3200000, NULL, 1.5, 'TK0', 'employee', '$2b$10$hashed'),
      (9, 1, 7, 3, 'OTL-2023-003', 'Hendra Wijaya', 'hendra@cahaya.co.id', '081234560009', '3273019234560009', '2022-07-01', 'permanent', 'married', 1, 'BNI', '2231003003', 'Hendra Wijaya', 5500000, NULL, 1.5, 'K1', 'supervisor', '$2b$10$hashed'),
      (10, 1, 5, 3, 'OTL-2023-004', 'Rika Marlina', 'rika@cahaya.co.id', '081234560010', '3273020234560010', '2021-05-01', 'permanent', 'married', 2, 'BCA', '2231004004', 'Rika Marlina', 8500000, NULL, 2.0, 'K2', 'hr_admin', '$2b$10$hashed')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      base_salary = EXCLUDED.base_salary,
      hourly_rate = EXCLUDED.hourly_rate;
  `
  await sql`SELECT setval('employees_id_seq', (SELECT COALESCE(MAX(id), 1) FROM employees));`

  // 8. Shift Templates
  await sql`
    INSERT INTO shift_templates (id, tenant_id, name, shift_type, start_time, end_time, is_overnight, break_duration_minutes, tolerance_late_minutes, work_days, color_hex)
    VALUES
      (1, 1, 'Shift Pagi A', 'fixed', '06:00', '14:00', FALSE, 60, 0, '1,2,3,4,5', '#3B82F6'),
      (2, 1, 'Shift Siang B', 'fixed', '14:00', '22:00', FALSE, 60, 0, '1,2,3,4,5', '#F59E0B'),
      (3, 1, 'Shift Malam C', 'fixed', '22:00', '06:00', TRUE, 60, 0, '1,2,3,4,5,6', '#6366F1'),
      (4, 1, 'Jam Kantor', 'fixed', '08:00', '17:00', FALSE, 60, 15, '1,2,3,4,5', '#10B981'),
      (5, 1, 'Shift Outlet Pagi', 'fixed', '08:00', '16:00', FALSE, 60, 10, '1,2,3,4,5,6', '#EF4444'),
      (6, 1, 'Shift Outlet Sore', 'fixed', '14:00', '22:00', FALSE, 60, 10, '1,2,3,4,5,6', '#8B5CF6')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time;
  `
  await sql`SELECT setval('shift_templates_id_seq', (SELECT COALESCE(MAX(id), 1) FROM shift_templates));`

  // 9. Shift Assignments
  await sql`
    INSERT INTO shift_assignments (id, tenant_id, employee_id, shift_template_id, location_id, effective_date, recurrence, assigned_by)
    VALUES
      (1, 1, 1, 1, 1, '2026-01-01', 'weekly', 6),
      (2, 1, 2, 2, 1, '2026-01-01', 'weekly', 6),
      (3, 1, 3, 1, 1, '2026-01-01', 'weekly', 6),
      (4, 1, 4, 4, 2, '2026-01-01', 'weekly', 6),
      (5, 1, 5, 4, 2, '2026-01-01', 'weekly', 6),
      (6, 1, 6, 4, 2, '2026-01-01', 'weekly', 6),
      (7, 1, 7, 5, 3, '2026-01-01', 'weekly', 6),
      (8, 1, 8, 6, 4, '2026-01-01', 'weekly', 6),
      (9, 1, 9, 5, 3, '2026-01-01', 'weekly', 6),
      (10, 1, 10, 4, 3, '2026-01-01', 'weekly', 6)
    ON CONFLICT (id) DO UPDATE SET
      shift_template_id = EXCLUDED.shift_template_id;
  `
  await sql`SELECT setval('shift_assignments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM shift_assignments));`

  // 10. Salary Components
  await sql`
    INSERT INTO salary_components (id, tenant_id, name, code, component_type, is_taxable, is_bpjs_base, default_amount, default_rate, calculation_basis, is_system)
    VALUES
      (1, 1, 'Gaji Pokok', 'GAJI_POKOK', 'earning_fixed', TRUE, TRUE, 0, 0, 'fixed', FALSE),
      (2, 1, 'Tunjangan Makan', 'TUNJ_MAKAN', 'earning_fixed', FALSE, FALSE, 600000, 0, 'fixed', FALSE),
      (3, 1, 'Tunjangan Transport', 'TUNJ_TRANS', 'earning_fixed', FALSE, FALSE, 400000, 0, 'fixed', FALSE),
      (4, 1, 'Upah Lembur', 'LEMBUR', 'earning_variable', TRUE, FALSE, 0, 0, 'fixed', FALSE),
      (5, 1, 'BPJS Kesehatan (Kar)', 'BPJS_KES_KAR', 'bpjs', FALSE, FALSE, 0, 0.01, 'percent_of_base', TRUE),
      (6, 1, 'BPJS TK JHT (Kar)', 'BPJS_JHT_KAR', 'bpjs', FALSE, FALSE, 0, 0.02, 'percent_of_base', TRUE),
      (7, 1, 'BPJS TK JP (Kar)', 'BPJS_JP_KAR', 'bpjs', FALSE, FALSE, 0, 0.01, 'percent_of_base', TRUE),
      (8, 1, 'PPh 21', 'PPH21', 'tax', FALSE, FALSE, 0, 0, 'fixed', TRUE),
      (9, 1, 'Pot. Keterlambatan', 'POT_TELAT', 'deduction_variable', FALSE, FALSE, 0, 0, 'fixed', FALSE),
      (10, 1, 'Pot. Absensi', 'POT_ABSEN', 'deduction_variable', FALSE, FALSE, 0, 0, 'fixed', FALSE)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      code = EXCLUDED.code;
  `
  await sql`SELECT setval('salary_components_id_seq', (SELECT COALESCE(MAX(id), 1) FROM salary_components));`

  // 11. Employee Salary Components
  await sql`
    INSERT INTO employee_salary_components (id, tenant_id, employee_id, salary_component_id, amount, rate, effective_from)
    VALUES
      (1, 1, 1, 2, 600000, 0, '2024-01-01'),
      (2, 1, 1, 3, 400000, 0, '2024-01-01'),
      (3, 1, 2, 2, 600000, 0, '2024-01-01'),
      (4, 1, 2, 3, 400000, 0, '2024-01-01'),
      (5, 1, 4, 1, 4500000, 0, '2022-02-01'),
      (6, 1, 4, 2, 600000, 0, '2022-02-01'),
      (7, 1, 4, 3, 400000, 0, '2022-02-01'),
      (8, 1, 6, 1, 9000000, 0, '2017-04-20'),
      (9, 1, 6, 2, 800000, 0, '2017-04-20'),
      (10, 1, 6, 3, 600000, 0, '2017-04-20')
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount;
  `
  await sql`SELECT setval('employee_salary_components_id_seq', (SELECT COALESCE(MAX(id), 1) FROM employee_salary_components));`

  // 12. Attendances Sample
  await sql`
    INSERT INTO attendances (
      id, tenant_id, employee_id, location_id, shift_assignment_id,
      attendance_date, clock_in_at, clock_out_at,
      clock_in_lat, clock_in_lng, clock_in_accuracy, clock_in_distance,
      status, clock_in_status, late_minutes, effective_work_minutes, overtime_minutes
    )
    VALUES
      (1, 1, 1, 1, 1, '2026-10-06', '2026-10-06 05:58:00+07', '2026-10-06 14:05:00+07', -6.8700, 107.5390, 5.2, 8.0, 'present', 'valid', 0, 480, 0),
      (2, 1, 2, 1, 2, '2026-10-06', '2026-10-06 14:12:00+07', '2026-10-06 22:03:00+07', -6.8701, 107.5391, 6.1, 12.0, 'late', 'valid', 12, 468, 0),
      (3, 1, 4, 2, 4, '2026-10-06', '2026-10-06 07:55:00+07', '2026-10-06 17:10:00+07', -6.9175, 107.6191, 8.0, 20.0, 'present', 'valid', 0, 480, 10),
      (4, 1, 7, 3, 7, '2026-10-06', '2026-10-06 08:18:00+07', '2026-10-06 16:02:00+07', -6.8965, 107.6129, 4.5, 6.0, 'late', 'valid', 18, 462, 0),
      (5, 1, 1, 1, 1, '2026-10-07', '2026-10-07 06:02:00+07', '2026-10-07 14:00:00+07', -6.8715, 107.5402, 12.0, 187.3, 'present', 'outside_radius', 2, 478, 0),
      (6, 1, 2, 1, 2, '2026-10-07', NULL, NULL, NULL, NULL, NULL, NULL, 'absent', 'system', 0, 0, 0),
      (7, 1, 3, 1, 3, '2026-10-08', '2026-10-08 06:01:00+07', NULL, -6.8700, 107.5390, 3.0, 0.0, 'present', 'mock_gps', 0, 0, 0)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      late_minutes = EXCLUDED.late_minutes;
  `
  await sql`UPDATE attendances SET fraud_flag = TRUE, is_mock_gps = TRUE WHERE clock_in_status = 'mock_gps';`
  await sql`SELECT setval('attendances_id_seq', (SELECT COALESCE(MAX(id), 1) FROM attendances));`

  // 13. Payroll Run (Oktober 2026)
  await sql`
    INSERT INTO payroll_runs (
      id, tenant_id, period_year, period_month, period_label, pay_date,
      status, generated_by, total_employees, total_gross, total_deductions, total_net
    )
    VALUES
      (1, 1, 2026, 10, 'Oktober 2026', '2026-10-28', 'calculated', 6, 1, 5524348, 133304, 5391044)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status;
  `
  await sql`SELECT setval('payroll_runs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payroll_runs));`

  // 14. Payroll Items (Siti)
  await sql`
    INSERT INTO payroll_items (
      id, tenant_id, payroll_run_id, employee_id, payroll_type,
      working_days, present_days, absent_days, late_count, late_total_minutes,
      total_work_hours, overtime_hours,
      base_salary, total_earnings, total_deductions,
      total_bpjs_employee, total_bpjs_company, pph21, net_salary,
      status
    )
    VALUES
      (1, 1, 1, 4, 'monthly',
       23, 22, 0, 0, 0,
       176.0, 0.833,
       4500000, 5524348, 133304,
       46304, 175500, 0, 5391044,
       'calculated')
    ON CONFLICT (id) DO UPDATE SET
      net_salary = EXCLUDED.net_salary;
  `
  await sql`SELECT setval('payroll_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payroll_items));`

  // 15. Payroll Item Details
  await sql`
    INSERT INTO payroll_item_details (id, payroll_item_id, salary_component_id, component_name, component_type, amount)
    VALUES
      (1, 1, 1, 'Gaji Pokok', 'earning_fixed', 4500000),
      (2, 1, 2, 'Tunjangan Makan', 'earning_fixed', 600000),
      (3, 1, 3, 'Tunjangan Transport', 'earning_fixed', 400000),
      (4, 1, 4, 'Upah Lembur', 'earning_variable', 24348),
      (5, 1, 5, 'BPJS Kesehatan (Kar)', 'bpjs', 45000),
      (6, 1, 6, 'BPJS TK JHT (Kar)', 'bpjs', 4304)
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('payroll_item_details_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payroll_item_details));`

  console.log('✅ Seed data idempotent berhasil!')
}

runSeed().catch(err => {
  console.error('❌ Gagal seed:', err)
  process.exit(1)
})
