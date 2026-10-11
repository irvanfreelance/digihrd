import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'app_config:read')

    const [cfg] = await sql`
      SELECT id, name, slug, logo_url, primary_color, secondary_color,
             sidebar_color, sidebar_text_color,
             font_heading, font_body, slip_header_color, timezone, currency
      FROM tenants
      WHERE id = 1
    `
    return NextResponse.json({ data: cfg })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const role = await getRoleFromRequest(req)
    requirePermission(role, 'app_config:write')

    const body = await req.json()
    const {
      name,
      logo_url,
      primary_color,
      secondary_color,
      sidebar_color,
      sidebar_text_color,
      slip_header_color
    } = body

    const [updated] = await sql`
      UPDATE tenants
      SET
        name = COALESCE(${name}, name),
        logo_url = COALESCE(${logo_url}, logo_url),
        primary_color = COALESCE(${primary_color}, primary_color),
        secondary_color = COALESCE(${secondary_color}, secondary_color),
        sidebar_color = COALESCE(${sidebar_color}, sidebar_color),
        sidebar_text_color = COALESCE(${sidebar_text_color}, sidebar_text_color),
        slip_header_color = COALESCE(${slip_header_color}, slip_header_color),
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
