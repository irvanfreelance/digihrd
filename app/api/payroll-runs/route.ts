import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'payroll:read')

    const data = await sql`
      SELECT pr.*, e.full_name as generated_by_name
      FROM payroll_runs pr
      JOIN employees e ON e.id = pr.generated_by
      ORDER BY pr.period_year DESC, pr.period_month DESC, pr.id DESC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'payroll:write')

    const body = await req.json()
    const { period_year, period_month, period_label, pay_date } = body

    const [created] = await sql`
      INSERT INTO payroll_runs (
        tenant_id, period_year, period_month, period_label, pay_date,
        status, generated_by
      )
      VALUES (
        1, ${period_year}, ${period_month}, ${period_label}, ${pay_date},
        'draft', 6
      )
      RETURNING *
    `
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
