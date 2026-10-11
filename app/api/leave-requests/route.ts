import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'leave:read')

    const data = await sql`
      SELECT lr.*, e.full_name as employee_name, e.employee_number,
             p.name as position_name, d.name as department_name
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      JOIN positions p ON p.id = e.position_id
      JOIN departments d ON d.id = p.department_id
      ORDER BY lr.created_at DESC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'leave:write')

    const body = await req.json()
    const {
      employee_id = 1,
      leave_type = 'annual',
      start_date,
      end_date,
      total_days = 1,
      reason = '',
      is_paid = true
    } = body

    const [created] = await sql`
      INSERT INTO leave_requests (
        tenant_id, employee_id, leave_type, start_date, end_date, total_days, is_paid, reason
      )
      VALUES (
        1, ${employee_id}, ${leave_type}, ${start_date}, ${end_date}, ${total_days}, ${is_paid}, ${reason}
      )
      RETURNING *
    `
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
