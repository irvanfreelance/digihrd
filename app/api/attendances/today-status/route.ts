import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSessionFromRequest } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    const employeeId = session.employeeId

    // 1. Ambil data profil karyawan & jadwal shift aktif
    const [emp] = await sql`
      SELECT e.id as employee_id, e.full_name, e.employee_number, e.location_id,
             l.name as location_name, l.address as location_address,
             l.radius_meter, l.latitude, l.longitude, l.allow_outside_with_reason,
             st.id as shift_id, st.name as shift_name, st.start_time, st.end_time,
             st.shift_type, st.tolerance_late_minutes, st.color_hex as shift_color
      FROM employees e
      LEFT JOIN locations l ON l.id = e.location_id
      LEFT JOIN shift_assignments sa ON sa.employee_id = e.id
      LEFT JOIN shift_templates st ON st.id = sa.shift_template_id
      WHERE e.id = ${employeeId}
      ORDER BY sa.effective_date DESC
      LIMIT 1
    `

    // 2. Ambil absensi hari ini (berdasarkan CURRENT_DATE di PostgreSQL)
    const [todayAtt] = await sql`
      SELECT a.*,
             to_char(a.attendance_date, 'YYYY-MM-DD') as attendance_date_str,
             to_char(a.clock_in_at, 'HH24:MI:SS') as clock_in_time_str,
             to_char(a.clock_out_at, 'HH24:MI:SS') as clock_out_time_str,
             l.name as attendance_location_name
      FROM attendances a
      LEFT JOIN locations l ON l.id = a.location_id
      WHERE a.employee_id = ${employeeId}
        AND a.attendance_date = CURRENT_DATE
      ORDER BY a.id DESC
      LIMIT 1
    `

    return NextResponse.json({
      data: {
        profile: emp,
        todayAttendance: todayAtt || null
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
