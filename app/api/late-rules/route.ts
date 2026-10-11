import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'late_rules:read')

    const data = await sql`
      SELECT lr.*, eg.name as grade_name
      FROM late_rules lr
      JOIN employment_grades eg ON eg.id = lr.employment_grade_id
      ORDER BY lr.id ASC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'late_rules:write')

    const body = await req.json()
    const {
      employment_grade_id,
      tolerance_minutes = 0,
      late_affects_payroll = false,
      deduction_method = 'none',
      deduction_amount = 0,
      effective_from = '2026-01-01'
    } = body

    const [rule] = await sql`
      INSERT INTO late_rules (
        tenant_id, employment_grade_id, tolerance_minutes,
        late_affects_payroll, deduction_method, deduction_amount, effective_from
      )
      VALUES (
        1, ${employment_grade_id}, ${tolerance_minutes},
        ${late_affects_payroll}, ${deduction_method}, ${deduction_amount}, ${effective_from}
      )
      RETURNING *
    `
    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
