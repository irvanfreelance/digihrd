import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'locations:read')

    const data = await sql`
      SELECT id, name, address, latitude, longitude, radius_meter,
             allow_outside_with_reason, max_outside_tolerance_count, require_photo,
             is_active, created_at
      FROM locations
      WHERE deleted_at IS NULL
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
    requirePermission(role, 'locations:write')

    const body = await req.json()
    const {
      name,
      address,
      latitude,
      longitude,
      radius_meter = 100,
      allow_outside_with_reason = false,
      max_outside_tolerance_count = 0,
      require_photo = false
    } = body

    const [loc] = await sql`
      INSERT INTO locations (
        tenant_id, name, address, latitude, longitude, radius_meter,
        allow_outside_with_reason, max_outside_tolerance_count, require_photo
      )
      VALUES (
        1, ${name}, ${address || ''}, ${latitude}, ${longitude}, ${radius_meter},
        ${allow_outside_with_reason}, ${max_outside_tolerance_count}, ${require_photo}
      )
      RETURNING *
    `

    return NextResponse.json({ data: loc }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
