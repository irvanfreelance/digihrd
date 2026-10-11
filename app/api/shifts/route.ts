import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'shifts:read')

    const data = await sql`
      SELECT st.*, count(sa.id)::int as active_assignments_count
      FROM shift_templates st
      LEFT JOIN shift_assignments sa ON sa.shift_template_id = st.id
      WHERE st.deleted_at IS NULL
      GROUP BY st.id
      ORDER BY st.id ASC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'shifts:write')

    const body = await req.json()
    const {
      name,
      shift_type = 'fixed',
      start_time,
      end_time,
      is_overnight = false,
      break_duration_minutes = 60,
      tolerance_late_minutes = 15,
      work_days = '1,2,3,4,5',
      color_hex = '#3B82F6'
    } = body

    const [shift] = await sql`
      INSERT INTO shift_templates (
        tenant_id, name, shift_type, start_time, end_time, is_overnight,
        break_duration_minutes, tolerance_late_minutes, work_days, color_hex
      )
      VALUES (
        1, ${name}, ${shift_type}, ${start_time}, ${end_time}, ${is_overnight},
        ${break_duration_minutes}, ${tolerance_late_minutes}, ${work_days}, ${color_hex}
      )
      RETURNING *
    `
    return NextResponse.json({ data: shift }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
