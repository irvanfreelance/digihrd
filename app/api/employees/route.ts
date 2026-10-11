import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'employees:read')

    const q = req.nextUrl.searchParams.get('q') || ''
    const departmentId = req.nextUrl.searchParams.get('department_id')
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1))
    const limit = Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 25))
    const offset = (page - 1) * limit

    let data
    if (q) {
      data = await sql`
        SELECT e.id, e.employee_number, e.full_name, e.email, e.phone, e.nik, e.role,
               e.base_salary, e.hourly_rate, e.ptkp_status, e.is_active, e.employment_status,
               p.id as position_id, p.name as position_name, p.payroll_type,
               d.id as department_id, d.name as department_name,
               l.id as location_id, l.name as location_name
        FROM employees e
        JOIN positions p ON p.id = e.position_id
        JOIN departments d ON d.id = p.department_id
        LEFT JOIN locations l ON l.id = e.location_id
        WHERE e.deleted_at IS NULL
          AND (e.full_name ILIKE ${'%' + q + '%'} OR e.employee_number ILIKE ${'%' + q + '%'})
        ORDER BY e.id ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      data = await sql`
        SELECT e.id, e.employee_number, e.full_name, e.email, e.phone, e.nik, e.role,
               e.base_salary, e.hourly_rate, e.ptkp_status, e.is_active, e.employment_status,
               p.id as position_id, p.name as position_name, p.payroll_type,
               d.id as department_id, d.name as department_name,
               l.id as location_id, l.name as location_name
        FROM employees e
        JOIN positions p ON p.id = e.position_id
        JOIN departments d ON d.id = p.department_id
        LEFT JOIN locations l ON l.id = e.location_id
        WHERE e.deleted_at IS NULL
        ORDER BY e.id ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const [countResult] = await sql`SELECT count(*)::int as total FROM employees WHERE deleted_at IS NULL`

    return NextResponse.json({ data, total: countResult?.total || 0, page, limit })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'employees:write')

    const body = await req.json()
    const {
      position_id,
      location_id,
      employee_number,
      full_name,
      email,
      phone,
      nik,
      join_date,
      base_salary = 0,
      hourly_rate = null,
      ptkp_status = 'TK0',
      role: empRole = 'employee',
      employment_status = 'permanent',
      bank_name = 'BCA',
      bank_account_number = '',
      bank_account_name = ''
    } = body

    const [emp] = await sql`
      INSERT INTO employees (
        tenant_id, position_id, location_id, employee_number, full_name, email,
        phone, nik, join_date, base_salary, hourly_rate, ptkp_status,
        role, employment_status, bank_name, bank_account_number, bank_account_name,
        password_hash
      )
      VALUES (
        1, ${position_id}, ${location_id || null}, ${employee_number}, ${full_name}, ${email},
        ${phone || null}, ${nik || null}, ${join_date || '2026-01-01'}, ${base_salary}, ${hourly_rate}, ${ptkp_status},
        ${empRole}, ${employment_status}, ${bank_name}, ${bank_account_number}, ${bank_account_name},
        '$2b$10$hashed'
      )
      RETURNING *
    `

    return NextResponse.json({ data: emp }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
