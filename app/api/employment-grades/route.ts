import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'grades:read')

    const data = await sql`
      SELECT eg.*, count(p.id)::int as positions_count
      FROM employment_grades eg
      LEFT JOIN positions p ON p.employment_grade_id = eg.id AND p.deleted_at IS NULL
      GROUP BY eg.id
      ORDER BY eg.level ASC, eg.id ASC
    `
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'grades:write')

    const body = await req.json()
    const { name, level = 1 } = body

    const [grade] = await sql`
      INSERT INTO employment_grades (tenant_id, name, level)
      VALUES (1, ${name}, ${level})
      RETURNING *
    `
    return NextResponse.json({ data: grade }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
