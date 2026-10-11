/**
 * Hitung jarak antara 2 koordinat (lat, lng) menggunakan Haversine Formula dalam satuan meter
 */
export function calcDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Radius bumi dalam meter
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c * 10) / 10 // presisi 1 desimal
}

/**
 * Hitung keterlambatan dalam menit berdasarkan jam clock-in, start time shift, dan toleransi
 */
export function calcLateMinutes(
  clockInDate: Date,
  shiftStartTime: string, // format "HH:mm:ss" atau "HH:mm"
  toleranceMinutes: number = 0
): number {
  const [shiftHours, shiftMins] = shiftStartTime.split(':').map(Number)
  const shiftTimeInMins = shiftHours * 60 + shiftMins

  const clockInHours = clockInDate.getHours()
  const clockInMinutes = clockInDate.getMinutes()
  const clockInTimeInMins = clockInHours * 60 + clockInMinutes

  const diffMinutes = clockInTimeInMins - shiftTimeInMins
  if (diffMinutes <= toleranceMinutes) {
    return 0
  }
  return diffMinutes
}
