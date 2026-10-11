import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'departments:read')

    const data = await sql`
      SELECT d.*, count(p.id)::int as positions_count
      FROM departments d
      LEFT JOIN positions p ON p.department_id = d.id AND p.deleted_at IS NULL
      WHERE d.deleted_at IS NULL
      GROUP BY d.id
      ORDER BY d.id ASC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'departments:write')

    const body = await req.json()
    const { name, code } = body

    const [dept] = await sql`
      INSERT INTO departments (tenant_id, name, code)
      VALUES (1, ${name}, ${code || null})
      RETURNING *
    `
    return NextResponse.json({ data: dept }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
