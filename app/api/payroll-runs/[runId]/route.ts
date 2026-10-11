import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'payroll:read')

    const resolvedParams = await params
    const runId = Number(resolvedParams.runId)

    const [run] = await sql`
      SELECT pr.*, e.full_name as generated_by_name
      FROM payroll_runs pr
      JOIN employees e ON e.id = pr.generated_by
      WHERE pr.id = ${runId}
    `
    if (!run) return NextResponse.json({ error: 'Payroll run tidak ditemukan' }, { status: 404 })

    const items = await sql`
      SELECT pi.*, e.full_name as employee_name, e.employee_number,
             p.name as position_name, d.name as department_name
      FROM payroll_items pi
      JOIN employees e ON e.id = pi.employee_id
      JOIN positions p ON p.id = e.position_id
      JOIN departments d ON d.id = p.department_id
      WHERE pi.payroll_run_id = ${runId}
      ORDER BY pi.id ASC
    `

    return NextResponse.json({ data: { run, items } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'payroll:write')

    const resolvedParams = await params
    const runId = Number(resolvedParams.runId)
    const body = await req.json()
    const { status, notes } = body

    const [updated] = await sql`
      UPDATE payroll_runs
      SET
        status = COALESCE(${status}, status),
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${runId}
      RETURNING *
    `

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
