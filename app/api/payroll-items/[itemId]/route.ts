import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'payroll:read')

    const resolvedParams = await params
    const itemId = Number(resolvedParams.itemId)

    const [item] = await sql`
      SELECT pi.*, e.full_name as employee_name, e.employee_number, e.nik, e.bank_name, e.bank_account_number, e.bank_account_name,
             p.name as position_name, d.name as department_name, pr.period_label, pr.pay_date,
             t.name as company_name, t.logo_url, t.slip_header_color
      FROM payroll_items pi
      JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
      JOIN employees e ON e.id = pi.employee_id
      JOIN positions p ON p.id = e.position_id
      JOIN departments d ON d.id = p.department_id
      JOIN tenants t ON t.id = 1
      WHERE pi.id = ${itemId}
    `
    if (!item) return NextResponse.json({ error: 'Slip gaji tidak ditemukan' }, { status: 404 })

    const details = await sql`
      SELECT * FROM payroll_item_details
      WHERE payroll_item_id = ${itemId}
      ORDER BY id ASC
    `

    return NextResponse.json({ data: { ...item, details } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
