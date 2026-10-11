import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'leave:write')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    const body = await req.json()
    const { action = 'approve', reject_reason = null } = body

    const status = action === 'approve' ? 'approved' : 'rejected'

    const [updated] = await sql`
      UPDATE leave_requests
      SET
        status = ${status},
        reviewed_by = 6,
        reviewed_at = NOW(),
        reject_reason = ${reject_reason},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
