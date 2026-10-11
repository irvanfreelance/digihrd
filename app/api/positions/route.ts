import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'positions:read')

    const data = await sql`
      SELECT p.*, d.name as department_name, eg.name as grade_name
      FROM positions p
      JOIN departments d ON d.id = p.department_id
      JOIN employment_grades eg ON eg.id = p.employment_grade_id
      WHERE p.deleted_at IS NULL
      ORDER BY p.id ASC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'positions:write')

    const body = await req.json()
    const { department_id, employment_grade_id, name, code, payroll_type = 'monthly' } = body

    const [pos] = await sql`
      INSERT INTO positions (tenant_id, department_id, employment_grade_id, name, code, payroll_type)
      VALUES (1, ${department_id}, ${employment_grade_id}, ${name}, ${code || null}, ${payroll_type})
      RETURNING *
    `
    return NextResponse.json({ data: pos }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
