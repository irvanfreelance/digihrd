import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'attendances:write')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    const body = await req.json()
    const { status, late_minutes, outside_radius_note } = body

    const [updated] = await sql`
      UPDATE attendances
      SET
        status = COALESCE(${status}, status),
        late_minutes = COALESCE(${late_minutes}, late_minutes),
        outside_radius_note = COALESCE(${outside_radius_note}, outside_radius_note),
        approved_by = 6,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
