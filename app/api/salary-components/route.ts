import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'salary_components:read')

    const data = await sql`
      SELECT * FROM salary_components
      ORDER BY id ASC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'salary_components:write')

    const body = await req.json()
    const {
      name,
      code,
      component_type,
      is_taxable = true,
      is_bpjs_base = false,
      default_amount = 0,
      default_rate = 0,
      calculation_basis = 'fixed'
    } = body

    const [comp] = await sql`
      INSERT INTO salary_components (
        tenant_id, name, code, component_type, is_taxable, is_bpjs_base,
        default_amount, default_rate, calculation_basis
      )
      VALUES (
        1, ${name}, ${code}, ${component_type}, ${is_taxable}, ${is_bpjs_base},
        ${default_amount}, ${default_rate}, ${calculation_basis}
      )
      RETURNING *
    `
    return NextResponse.json({ data: comp }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
