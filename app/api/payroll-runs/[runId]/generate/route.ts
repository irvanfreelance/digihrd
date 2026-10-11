import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'
import { calculatePayrollItem, EmployeeData, AttendanceSummary, SalaryComponentData, LateRuleData } from '@/lib/payroll/engine'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'payroll:write')

    const resolvedParams = await params
    const runId = Number(resolvedParams.runId)

    const [run] = await sql`SELECT * FROM payroll_runs WHERE id = ${runId}`
    if (!run) return NextResponse.json({ error: 'Payroll run tidak ditemukan' }, { status: 404 })

    // 1. Ambil semua employee aktif
    const employees = await sql`
      SELECT e.id, e.employee_number, e.full_name, e.base_salary, e.hourly_rate,
             e.overtime_rate_multiplier, e.ptkp_status, p.payroll_type, p.employment_grade_id
      FROM employees e
      JOIN positions p ON p.id = e.position_id
      WHERE e.deleted_at IS NULL AND e.is_active = TRUE
      ORDER BY e.id ASC
    `

    // Bersihkan item sebelumnya jika kalkulasi ulang
    await sql`DELETE FROM payroll_item_details WHERE payroll_item_id IN (SELECT id FROM payroll_items WHERE payroll_run_id = ${runId})`
    await sql`DELETE FROM payroll_items WHERE payroll_run_id = ${runId}`

    let runTotalGross = 0
    let runTotalDeductions = 0
    let runTotalNet = 0
    let calculatedEmployees = 0

    for (const emp of employees) {
      // Rekap absensi bulan ini
      const [att] = await sql`
        SELECT
          COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)::int as present_days,
          COUNT(CASE WHEN status = 'absent' THEN 1 END)::int as absent_days,
          COUNT(CASE WHEN status = 'late' THEN 1 END)::int as late_count,
          COALESCE(SUM(late_minutes), 0)::int as late_total_minutes,
          COALESCE(SUM(effective_work_minutes), 0)::numeric / 60 as total_work_hours,
          COALESCE(SUM(overtime_minutes), 0)::numeric / 60 as overtime_hours
        FROM attendances
        WHERE employee_id = ${emp.id}
          AND EXTRACT(YEAR FROM attendance_date) = ${run.period_year}
          AND EXTRACT(MONTH FROM attendance_date) = ${run.period_month}
      `

      const attendanceSummary: AttendanceSummary = {
        working_days: 22,
        present_days: att?.present_days || 0,
        absent_days: att?.absent_days || 0,
        late_count: att?.late_count || 0,
        late_total_minutes: att?.late_total_minutes || 0,
        total_work_hours: Number(att?.total_work_hours || 0),
        overtime_hours: Number(att?.overtime_hours || 0)
      }

      // Ambil komponen gaji karyawan
      const compRows = await sql`
        SELECT sc.id, sc.name, sc.code, sc.component_type, sc.calculation_basis,
               COALESCE(esc.amount, sc.default_amount) as amount,
               COALESCE(esc.rate, sc.default_rate) as rate
        FROM salary_components sc
        LEFT JOIN employee_salary_components esc
          ON esc.salary_component_id = sc.id AND esc.employee_id = ${emp.id}
        WHERE sc.is_active = TRUE
      `

      // Ambil late rule
      const [lateRule] = await sql`
        SELECT deduction_method, deduction_amount, deduction_rate, late_affects_payroll, tolerance_minutes
        FROM late_rules
        WHERE employment_grade_id = ${emp.employment_grade_id}
        ORDER BY id DESC LIMIT 1
      `

      const employeeData: EmployeeData = {
        id: emp.id,
        employee_number: emp.employee_number,
        full_name: emp.full_name,
        payroll_type: emp.payroll_type,
        base_salary: Number(emp.base_salary) || 0,
        hourly_rate: emp.hourly_rate ? Number(emp.hourly_rate) : null,
        overtime_rate_multiplier: Number(emp.overtime_rate_multiplier) || 1.5,
        ptkp_status: emp.ptkp_status || 'TK0'
      }

      // Panggil payroll engine (pure logic)
      const result = calculatePayrollItem({
        employee: employeeData,
        attendanceSummary,
        salaryComponents: compRows as any,
        lateRule: lateRule as any,
        periodYear: run.period_year,
        periodMonth: run.period_month
      })

      // Simpan ke payroll_items
      const [item] = await sql`
        INSERT INTO payroll_items (
          tenant_id, payroll_run_id, employee_id, payroll_type,
          working_days, present_days, absent_days, late_count, late_total_minutes,
          total_work_hours, overtime_hours, base_salary,
          total_earnings, total_deductions, total_bpjs_employee, total_bpjs_company,
          pph21, net_salary, status
        )
        VALUES (
          1, ${runId}, ${emp.id}, ${result.payroll_type},
          ${result.working_days}, ${result.present_days}, ${result.absent_days},
          ${result.late_count}, ${result.late_total_minutes},
          ${result.total_work_hours}, ${result.overtime_hours}, ${result.base_salary},
          ${result.total_earnings}, ${result.total_deductions}, ${result.total_bpjs_employee}, ${result.total_bpjs_company},
          ${result.pph21}, ${result.net_salary}, 'calculated'
        )
        RETURNING *
      `

      // Simpan ke payroll_item_details
      for (const d of result.details) {
        await sql`
          INSERT INTO payroll_item_details (
            payroll_item_id, salary_component_id, component_name, component_type, amount, notes
          )
          VALUES (
            ${item.id}, ${d.salary_component_id}, ${d.component_name}, ${d.component_type}, ${d.amount}, ${d.notes || null}
          )
        `
      }

      runTotalGross += result.total_earnings
      runTotalDeductions += result.total_deductions
      runTotalNet += result.net_salary
      calculatedEmployees++
    }

    // Update payroll_runs status
    const [updatedRun] = await sql`
      UPDATE payroll_runs
      SET
        status = 'calculated',
        total_employees = ${calculatedEmployees},
        total_gross = ${runTotalGross},
        total_deductions = ${runTotalDeductions},
        total_net = ${runTotalNet},
        generated_at = NOW(),
        updated_at = NOW()
      WHERE id = ${runId}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: `Kalkulasi payroll berhasil untuk ${calculatedEmployees} karyawan!`,
      data: updatedRun
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
