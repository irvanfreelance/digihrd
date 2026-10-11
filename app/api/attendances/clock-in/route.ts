import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSessionFromRequest } from '@/lib/auth'
import { calcDistance, calcLateMinutes } from '@/lib/utils/attendance'

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
      isMockGps = false,
      photoUrl = null,
      notes = null
    } = body

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Koordinat GPS (lat, lng) wajib diisi' }, { status: 400 })
    }

    // 1. Mock GPS Fraud Check
    if (isMockGps) {
      return NextResponse.json({
        status: 'mock_gps_detected',
        message: 'Fake GPS / Mock Location terdeteksi. Absensi diblokir.'
      }, { status: 400 })
    }

    // 2. Ambil employee, location, dan shift assignment aktif
    const [emp] = await sql`
      SELECT e.*, p.employment_grade_id
      FROM employees e
      JOIN positions p ON p.id = e.position_id
      WHERE e.id = ${employeeId}
    `
    if (!emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

    const locationId = emp.location_id || 1
    const [loc] = await sql`SELECT * FROM locations WHERE id = ${locationId}`
    if (!loc) return NextResponse.json({ error: 'Lokasi kantor tidak ditemukan' }, { status: 404 })

    // Hitung jarak aktual ke titik lokasi
    const distanceMeters = calcDistance(lat, lng, Number(loc.latitude), Number(loc.longitude))
    const isOutsideRadius = distanceMeters > Number(loc.radius_meter)

    // Cek toleransi luar radius jika ada limit
    if (isOutsideRadius && !loc.allow_outside_with_reason) {
      return NextResponse.json({
        status: 'tolerance_exhausted',
        message: `Anda berada di luar radius (${distanceMeters}m > ${loc.radius_meter}m) dan lokasi ini tidak mengizinkan absensi luar radius.`,
        data: { distanceMeters, radiusMeter: loc.radius_meter }
      }, { status: 400 })
    }

    // Ambil shift template
    const [assignment] = await sql`
      SELECT sa.*, st.start_time, st.end_time, st.tolerance_late_minutes
      FROM shift_assignments sa
      JOIN shift_templates st ON st.id = sa.shift_template_id
      WHERE sa.employee_id = ${employeeId}
      ORDER BY sa.effective_date DESC
      LIMIT 1
    `

    // Ambil late rule jika ada
    const [lateRule] = await sql`
      SELECT * FROM late_rules
      WHERE employment_grade_id = ${emp.employment_grade_id}
      ORDER BY id DESC LIMIT 1
    `

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const shiftStartTime = assignment?.start_time || '08:00:00'
    const tolerance = lateRule?.tolerance_minutes ?? (assignment?.tolerance_late_minutes || 0)

    const lateMinutes = calcLateMinutes(now, shiftStartTime, tolerance)
    const attStatus = lateMinutes > 0 ? 'late' : 'present'
    const clockInStatus = isOutsideRadius ? 'outside_radius' : 'valid'

    // Upsert absensi hari ini
    const [att] = await sql`
      INSERT INTO attendances (
        tenant_id, employee_id, location_id, shift_assignment_id,
        attendance_date, clock_in_at, clock_in_lat, clock_in_lng,
        clock_in_accuracy, clock_in_distance, clock_in_photo_url,
        status, clock_in_status, late_minutes, outside_radius_note
      )
      VALUES (
        1, ${employeeId}, ${locationId}, ${assignment?.id || null},
        ${todayStr}, NOW(), ${lat}, ${lng},
        ${accuracy}, ${distanceMeters}, ${photoUrl},
        ${attStatus}, ${clockInStatus}, ${lateMinutes}, ${notes}
      )
      ON CONFLICT (employee_id, attendance_date)
      DO UPDATE SET
        clock_in_at = EXCLUDED.clock_in_at,
        clock_in_lat = EXCLUDED.clock_in_lat,
        clock_in_lng = EXCLUDED.clock_in_lng,
        clock_in_distance = EXCLUDED.clock_in_distance,
        status = EXCLUDED.status,
        clock_in_status = EXCLUDED.clock_in_status,
        late_minutes = EXCLUDED.late_minutes,
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({
      status: isOutsideRadius ? 'outside_radius' : 'success',
      message: isOutsideRadius
        ? `Clock-in berhasil dicatat di luar radius (${distanceMeters}m).`
        : 'Clock-in berhasil!',
      data: {
        attendance: att,
        distanceMeters,
        lateMinutes,
        locationName: loc.name
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
