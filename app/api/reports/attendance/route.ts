import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import * as XLSX from 'xlsx'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get('format') || 'json'

    const rows = await sql`
      SELECT a.attendance_date, e.employee_number, e.full_name,
             d.name as department_name, l.name as location_name,
             a.status, a.clock_in_status, a.late_minutes,
             a.clock_in_at, a.clock_out_at, a.effective_work_minutes
      FROM attendances a
      JOIN employees e ON e.id = a.employee_id
      JOIN positions p ON p.id = e.position_id
      JOIN departments d ON d.id = p.department_id
      LEFT JOIN locations l ON l.id = a.location_id
      ORDER BY a.attendance_date DESC, e.full_name ASC
    `

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows.map(r => ({
        'Tanggal': r.attendance_date,
        'NIK/NIP': r.employee_number,
        'Nama Karyawan': r.full_name,
        'Departemen': r.department_name,
        'Lokasi': r.location_name || '-',
        'Status': r.status,
        'Clock-In Status': r.clock_in_status,
        'Keterlambatan (menit)': r.late_minutes,
        'Jam Masuk': r.clock_in_at ? new Date(r.clock_in_at).toLocaleTimeString('id-ID') : '-',
        'Jam Pulang': r.clock_out_at ? new Date(r.clock_out_at).toLocaleTimeString('id-ID') : '-',
        'Durasi Kerja (menit)': r.effective_work_minutes
      })))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="rekap-absensi.xlsx"'
        }
      })
    }

    return NextResponse.json({ data: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
