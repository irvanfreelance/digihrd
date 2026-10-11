import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'locations:read')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    const [loc] = await sql`SELECT * FROM locations WHERE id = ${id} AND deleted_at IS NULL`
    if (!loc) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    return NextResponse.json({ data: loc })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'locations:write')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    const body = await req.json()

    const {
      name,
      address,
      latitude,
      longitude,
      radius_meter,
      allow_outside_with_reason,
      max_outside_tolerance_count,
      require_photo,
      is_active
    } = body

    const [updated] = await sql`
      UPDATE locations
      SET
        name = COALESCE(${name}, name),
        address = COALESCE(${address}, address),
        latitude = COALESCE(${latitude}, latitude),
        longitude = COALESCE(${longitude}, longitude),
        radius_meter = COALESCE(${radius_meter}, radius_meter),
        allow_outside_with_reason = COALESCE(${allow_outside_with_reason}, allow_outside_with_reason),
        max_outside_tolerance_count = COALESCE(${max_outside_tolerance_count}, max_outside_tolerance_count),
        require_photo = COALESCE(${require_photo}, require_photo),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'locations:delete')

    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    await sql`UPDATE locations SET deleted_at = NOW(), is_active = FALSE WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
