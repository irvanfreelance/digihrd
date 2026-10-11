import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'shifts:read')

    const employeeId = req.nextUrl.searchParams.get('employee_id')

    let data
    if (employeeId) {
      data = await sql`
        SELECT sa.*, e.full_name as employee_name, e.employee_number,
               st.name as shift_name, st.start_time, st.end_time, st.color_hex,
               l.name as location_name
        FROM shift_assignments sa
        JOIN employees e ON e.id = sa.employee_id
        JOIN shift_templates st ON st.id = sa.shift_template_id
        LEFT JOIN locations l ON l.id = sa.location_id
        WHERE sa.employee_id = ${Number(employeeId)}
        ORDER BY sa.effective_date DESC
      `
    } else {
      data = await sql`
        SELECT sa.*, e.full_name as employee_name, e.employee_number,
               st.name as shift_name, st.start_time, st.end_time, st.color_hex,
               l.name as location_name
        FROM shift_assignments sa
        JOIN employees e ON e.id = sa.employee_id
        JOIN shift_templates st ON st.id = sa.shift_template_id
        LEFT JOIN locations l ON l.id = sa.location_id
        ORDER BY sa.effective_date DESC
      `
    }

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
      employee_id,
      shift_template_id,
      location_id,
      effective_date,
      end_date = null,
      recurrence = 'weekly',
      notes = null
    } = body

    const [assignment] = await sql`
      INSERT INTO shift_assignments (
        tenant_id, employee_id, shift_template_id, location_id,
        effective_date, end_date, recurrence, assigned_by, notes
      )
      VALUES (
        1, ${employee_id}, ${shift_template_id}, ${location_id || null},
        ${effective_date}, ${end_date}, ${recurrence}, 6, ${notes}
      )
      RETURNING *
    `
    return NextResponse.json({ data: assignment }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
