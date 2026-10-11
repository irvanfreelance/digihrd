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

    const components = await sql`
      SELECT esc.*, sc.name as component_name, sc.component_type, sc.code as component_code
      FROM employee_salary_components esc
      JOIN salary_components sc ON sc.id = esc.salary_component_id
      WHERE esc.employee_id = ${id}
      ORDER BY esc.id ASC
    `

    return NextResponse.json({ data: components })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'employees:write')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    const body = await req.json()
    const { salary_component_id, amount = 0, rate = 0, effective_from = '2026-01-01', notes } = body

    const [created] = await sql`
      INSERT INTO employee_salary_components (
        tenant_id, employee_id, salary_component_id, amount, rate, effective_from, notes
      )
      VALUES (
        1, ${id}, ${salary_component_id}, ${amount}, ${rate}, ${effective_from}, ${notes || null}
      )
      RETURNING *
    `

    return NextResponse.json({ data: created }, { status: 201 })
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
    requirePermission(role, 'employees:write')

    const compId = req.nextUrl.searchParams.get('comp_id')
    if (!compId) {
      return NextResponse.json({ error: 'comp_id is required' }, { status: 400 })
    }

    await sql`
      DELETE FROM employee_salary_components
      WHERE id = ${Number(compId)}
    `

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
