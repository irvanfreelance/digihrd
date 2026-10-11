import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'employees:read')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    const [emp] = await sql`
      SELECT e.*,
             p.name as position_name, p.payroll_type,
             d.name as department_name,
             l.name as location_name
      FROM employees e
      JOIN positions p ON p.id = e.position_id
      JOIN departments d ON d.id = p.department_id
      LEFT JOIN locations l ON l.id = e.location_id
      WHERE e.id = ${id} AND e.deleted_at IS NULL
    `

    if (!emp) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const salaryComponents = await sql`
      SELECT esc.*, sc.name as component_name, sc.component_type, sc.code as component_code
      FROM employee_salary_components esc
      JOIN salary_components sc ON sc.id = esc.salary_component_id
      WHERE esc.employee_id = ${id}
      ORDER BY esc.id ASC
    `

    return NextResponse.json({ data: { ...emp, salary_components: salaryComponents } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'employees:write')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    const body = await req.json()

    const {
      full_name,
      email,
      phone,
      nik,
      position_id,
      location_id,
      base_salary,
      hourly_rate,
      ptkp_status,
      role: empRole,
      employment_status,
      bank_name,
      bank_account_number,
      bank_account_name,
      is_active
    } = body

    const [updated] = await sql`
      UPDATE employees
      SET
        full_name = COALESCE(${full_name}, full_name),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        nik = COALESCE(${nik}, nik),
        position_id = COALESCE(${position_id}, position_id),
        location_id = COALESCE(${location_id}, location_id),
        base_salary = COALESCE(${base_salary}, base_salary),
        hourly_rate = COALESCE(${hourly_rate}, hourly_rate),
        ptkp_status = COALESCE(${ptkp_status}, ptkp_status),
        role = COALESCE(${empRole}, role),
        employment_status = COALESCE(${employment_status}, employment_status),
        bank_name = COALESCE(${bank_name}, bank_name),
        bank_account_number = COALESCE(${bank_account_number}, bank_account_number),
        bank_account_name = COALESCE(${bank_account_name}, bank_account_name),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'employees:delete')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    // Soft delete
    await sql`
      UPDATE employees
      SET deleted_at = NOW(), is_active = FALSE
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true, message: 'Karyawan berhasil dinonaktifkan (soft deleted)' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
