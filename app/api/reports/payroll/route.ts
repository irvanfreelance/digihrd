import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import * as XLSX from 'xlsx'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get('format') || 'json'

    const rows = await sql`
      SELECT pi.id, pr.period_label, e.employee_number, e.full_name,
             p.name as position_name, d.name as department_name, pi.payroll_type,
             pi.working_days, pi.present_days, pi.absent_days, pi.late_count,
             pi.base_salary, pi.total_earnings, pi.total_deductions,
             pi.total_bpjs_employee, pi.pph21, pi.net_salary, pi.status
      FROM payroll_items pi
      JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
      JOIN employees e ON e.id = pi.employee_id
      JOIN positions p ON p.id = e.position_id
      JOIN departments d ON d.id = p.department_id
      ORDER BY pr.period_year DESC, pr.period_month DESC, e.full_name ASC
    `

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows.map(r => ({
        'Periode': r.period_label,
        'NIK/NIP': r.employee_number,
        'Nama Karyawan': r.full_name,
        'Jabatan': r.position_name,
        'Departemen': r.department_name,
        'Tipe Gaji': r.payroll_type,
        'Hari Kerja': r.working_days,
        'Hadir': r.present_days,
        'Absen': r.absent_days,
        'Telat (kali)': r.late_count,
        'Gaji Pokok': Number(r.base_salary),
        'Total Penghasilan (Gross)': Number(r.total_earnings),
        'Total Potongan': Number(r.total_deductions),
        'BPJS Karyawan': Number(r.total_bpjs_employee),
        'PPh 21': Number(r.pph21),
        'Gaji Bersih (Net)': Number(r.net_salary),
        'Status': r.status
      })))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Payroll')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="laporan-payroll.xlsx"'
        }
      })
    }

    return NextResponse.json({ data: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
