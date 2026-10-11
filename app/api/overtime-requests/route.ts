import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'overtime:read')

    const data = await sql`
      SELECT ot.*, e.full_name as employee_name, e.employee_number,
             p.name as position_name, d.name as department_name
      FROM overtime_requests ot
      JOIN employees e ON e.id = ot.employee_id
      JOIN positions p ON p.id = e.position_id
      JOIN departments d ON d.id = p.department_id
      ORDER BY ot.created_at DESC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'overtime:write')

    const body = await req.json()
    const {
      employee_id = 1,
      overtime_date,
      start_time,
      end_time,
      duration_minutes = 60,
      multiplier = 1.5,
      reason = ''
    } = body

    const [created] = await sql`
      INSERT INTO overtime_requests (
        tenant_id, employee_id, overtime_date, start_time, end_time,
        duration_minutes, multiplier, reason
      )
      VALUES (
        1, ${employee_id}, ${overtime_date}, ${start_time}, ${end_time},
        ${duration_minutes}, ${multiplier}, ${reason}
      )
      RETURNING *
    `
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
