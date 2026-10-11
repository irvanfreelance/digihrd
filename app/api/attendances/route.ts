import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'
import { calcDistance, calcLateMinutes } from '@/lib/utils/attendance'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'attendances:read')

    const employeeId = req.nextUrl.searchParams.get('employee_id')
    const startDate = req.nextUrl.searchParams.get('start_date')
    const endDate = req.nextUrl.searchParams.get('end_date')

    const data = await sql`
      SELECT a.*, e.full_name as employee_name, e.employee_number,
             l.name as location_name, l.radius_meter,
             st.name as shift_name, st.start_time as shift_start_time, st.end_time as shift_end_time
      FROM attendances a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN locations l ON l.id = a.location_id
      LEFT JOIN shift_assignments sa ON sa.id = a.shift_assignment_id
      LEFT JOIN shift_templates st ON st.id = sa.shift_template_id
      ORDER BY a.attendance_date DESC, a.id DESC
      LIMIT 100
    `

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
