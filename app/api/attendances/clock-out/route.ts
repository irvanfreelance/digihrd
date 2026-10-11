import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSessionFromRequest } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    const body = await req.json()
    const {
      employeeId = session.employeeId,
      lat,
      lng,
      accuracy = 10,
      photoUrl = null
    } = body

    const [att] = await sql`
      SELECT * FROM attendances
      WHERE employee_id = ${employeeId} AND attendance_date = CURRENT_DATE
      ORDER BY id DESC LIMIT 1
    `

    if (!att || !att.clock_in_at) {
      return NextResponse.json({ error: 'Anda belum melakukan clock-in hari ini' }, { status: 400 })
    }

    if (att.clock_out_at) {
      return NextResponse.json({
        error: 'Anda sudah melakukan clock-out untuk hari ini',
        data: att
      }, { status: 400 })
    }

    const clockInTime = new Date(att.clock_in_at).getTime()
    const nowTime = new Date().getTime()
    const effectiveMins = Math.max(0, Math.round((nowTime - clockInTime) / (1000 * 60)))

    const [updated] = await sql`
      UPDATE attendances
      SET
        clock_out_at = NOW(),
        clock_out_lat = ${lat || null},
        clock_out_lng = ${lng || null},
        clock_out_accuracy = ${accuracy},
        clock_out_photo_url = ${photoUrl},
        effective_work_minutes = ${effectiveMins},
        updated_at = NOW()
      WHERE id = ${att.id}
      RETURNING *,
        to_char(attendance_date, 'YYYY-MM-DD') as attendance_date_str,
        to_char(clock_in_at, 'HH24:MI:SS') as clock_in_time_str,
        to_char(clock_out_at, 'HH24:MI:SS') as clock_out_time_str
    `

    return NextResponse.json({
      status: 'success',
      message: 'Clock-out berhasil! Selamat beristirahat.',
      data: updated
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
