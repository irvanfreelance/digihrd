'use client'

import * as React from 'react'
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Navigation,
  ShieldCheck,
  Building2,
  Calendar,
  Compass,
  ArrowRight,
  Briefcase,
  Timer,
  LogOut,
  LogIn
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LeafletMap } from '@/components/maps/LeafletMap'
import { calcDistance } from '@/lib/utils/attendance'

export default function ClockInOutPage() {
  const [currentTime, setCurrentTime] = React.useState<string>('')
  const [locations, setLocations] = React.useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = React.useState<any>(null)
  const [userCoords, setUserCoords] = React.useState<[number, number] | null>(null)
  const [gpsAccuracy, setGpsAccuracy] = React.useState<number | null>(null)
  const [isLocating, setIsLocating] = React.useState(false)
  const [outsideNote, setOutsideNote] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [todayAttendance, setTodayAttendance] = React.useState<any>(null)
  const [employeeProfile, setEmployeeProfile] = React.useState<any>(null)

  // Modals state
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean
    type: 'success' | 'outside_radius' | 'tolerance_exhausted' | 'mock_gps' | 'gps_error'
    title?: string
    message?: string
    distance?: number
  }>({
    isOpen: false,
    type: 'success'
  })

  // Jam Realtime
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fungsi reload status absensi & profil jadwal shift hari ini langsung dari DB
  const fetchStatusAndLocations = React.useCallback(async () => {
    try {
      const [locRes, statusRes] = await Promise.all([
        fetch('/api/locations').then(r => r.json()),
        fetch('/api/attendances/today-status').then(r => r.json())
      ])

      const locs = locRes.data || []
      setLocations(locs)

      const statusData = statusRes.data || {}
      setEmployeeProfile(statusData.profile || null)
      setTodayAttendance(statusData.todayAttendance || null)

      // Set lokasi terpilih (utamakan lokasi penugasan absensi hari ini, atau lokasi penempatan default)
      if (locs.length > 0) {
        if (statusData.todayAttendance?.location_id) {
          const matchLoc = locs.find((l: any) => l.id === Number(statusData.todayAttendance.location_id))
          if (matchLoc) setSelectedLocation(matchLoc)
          else setSelectedLocation(locs[0])
        } else if (statusData.profile?.location_id) {
          const matchLoc = locs.find((l: any) => l.id === Number(statusData.profile.location_id))
          if (matchLoc) setSelectedLocation(matchLoc)
          else setSelectedLocation(locs[0])
        } else {
          setSelectedLocation(locs[0])
        }
      }
    } catch (err) {
      console.error('Error fetching today status:', err)
    }
  }, [])

  React.useEffect(() => {
    fetchStatusAndLocations()
    detectGps()
  }, [fetchStatusAndLocations])

  // GPS Detection via Browser Geolocation
  const detectGps = () => {
    setIsLocating(true)
    if (!navigator.geolocation) {
      setModalState({
        isOpen: true,
        type: 'gps_error',
        title: 'GPS Tidak Tersedia',
        message: 'Browser Anda tidak mendukung layanan Geolocation.'
      })
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserCoords([lat, lng])
        setGpsAccuracy(Math.round(pos.coords.accuracy))
        setIsLocating(false)
      },
      (err) => {
        console.warn('Geolocation warning:', err.message)
        // Fallback ke lokasi kantor aktif jika diizinkan/untuk keperluan dev
        if (selectedLocation) {
          setUserCoords([Number(selectedLocation.latitude), Number(selectedLocation.longitude)])
          setGpsAccuracy(10)
        }
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Hitung estimasi jarak
  const calculatedDistance = React.useMemo(() => {
    if (!userCoords || !selectedLocation) return null
    return calcDistance(
      userCoords[0],
      userCoords[1],
      Number(selectedLocation.latitude),
      Number(selectedLocation.longitude)
    )
  }, [userCoords, selectedLocation])

  const isOutside = calculatedDistance !== null && selectedLocation && calculatedDistance > selectedLocation.radius_meter

  // Handle Clock-In Action
  const handleClockIn = async (forceWithNote = false) => {
    if (loading) return // Cegah klik dobel
    if (!userCoords) {
      detectGps()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/attendances/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocation?.id,
          lat: userCoords[0],
          lng: userCoords[1],
          accuracy: gpsAccuracy || 10,
          isMockGps: false,
          notes: forceWithNote ? outsideNote : null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.status === 'tolerance_exhausted') {
          setModalState({
            isOpen: true,
            type: 'tolerance_exhausted',
            title: 'Di Luar Radius Geofence',
            message: data.message,
            distance: data.data?.distanceMeters
          })
        } else {
          setModalState({
            isOpen: true,
            type: 'gps_error',
            title: 'Gagal Clock-In',
            message: data.message || data.error
          })
        }
        return
      }

      if (data.status === 'outside_radius' && !forceWithNote) {
        setModalState({
          isOpen: true,
          type: 'outside_radius',
          title: 'Konfirmasi Luar Radius',
          message: data.message,
          distance: data.data?.distanceMeters
        })
        return
      }

      // Berhasil clock-in, refresh data dari DB
      await fetchStatusAndLocations()
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Berhasil Masuk!',
        message: data.message,
        distance: data.data?.distanceMeters
      })
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Clock-Out Action
  const handleClockOut = async () => {
    if (loading) return // Cegah klik dobel
    if (!userCoords) {
      detectGps()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/attendances/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userCoords[0],
          lng: userCoords[1],
          accuracy: gpsAccuracy || 10
        })
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Gagal clock-out')
        return
      }

      // Berhasil clock-out, refresh status terbaru dari DB
      await fetchStatusAndLocations()
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Berhasil Pulang!',
        message: data.message || 'Clock-out tersimpan. Durasi kerja efektif telah dikalkulasikan.'
      })
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const mapCenter: [number, number] = userCoords || (selectedLocation ? [Number(selectedLocation.latitude), Number(selectedLocation.longitude)] : [-6.9175, 107.6191])

  // Format Jam Masuk & Jam Pulang untuk ditampilkan
  const formatTime = (timeStr?: string | null, dateStr?: string | null) => {
    if (timeStr) return timeStr
    if (dateStr) {
      try {
        return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      } catch (e) {
        return '-'
      }
    }
    return '-'
  }

  const clockInDisplay = todayAttendance?.clock_in_time_str || formatTime(null, todayAttendance?.clock_in_at)
  const clockOutDisplay = todayAttendance?.clock_out_time_str || formatTime(null, todayAttendance?.clock_out_at)

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-6 animate-in fade-in duration-200">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
            Clock-In & Clock-Out Geolocation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Validasi presensi kehadiran real-time berbasis koordinat GPS OpenStreetMap & Geofence
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="px-2.5 py-1 gap-1.5 text-[11px] sm:text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            Live Jam Server
          </Badge>
        </div>
      </div>

      {/* Grid: di Mobile Panel Waktu & Aksi ditempatkan di atas (order-1), Peta di bawah (order-2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Panel Form Clock-In & Kartu Waktu */}
        <div className="order-1 lg:order-2 lg:col-span-5 space-y-4 sm:space-y-5">
          {/* Realtime Clock Card Touch-Friendly */}
          <Card className="text-center p-5 sm:p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/10">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-blue-200">Waktu Indonesia Barat (WIB)</p>
            <div className="text-3xl sm:text-5xl font-black my-1.5 sm:my-2 font-heading tracking-wider">
              {currentTime || '--:--:--'}
            </div>
            <p className="text-xs text-blue-100 flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </p>
          </Card>

          {/* KARTU INFO JADWAL SHIFT & STATUS PRESENSI HARI INI */}
          <Card className="p-4 sm:p-5 space-y-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {/* Header Jadwal Shift */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Jadwal Shift Kerja</span>
              </div>
              <Badge
                variant="outline"
                className="text-[11px] font-semibold"
                style={{
                  borderColor: employeeProfile?.shift_color || '#3B82F6',
                  color: employeeProfile?.shift_color || '#3B82F6'
                }}
              >
                {employeeProfile?.shift_name || 'Jam Kantor Standar'}
              </Badge>
            </div>

            {/* Jam Kerja Jadwal Shift */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Jam Masuk Shift</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {employeeProfile?.start_time ? employeeProfile.start_time.slice(0, 5) : '08:00'} WIB
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Toleransi: {employeeProfile?.tolerance_late_minutes || 0} mnt
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Jam Pulang Shift</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {employeeProfile?.end_time ? employeeProfile.end_time.slice(0, 5) : '17:00'} WIB
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Tipe: {employeeProfile?.shift_type === 'fixed' ? 'Tetap (Fixed)' : 'Fleksibel'}
                </span>
              </div>
            </div>

            {/* Rekap Real Jam Masuk & Jam Pulang Karyawan */}
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                  Jam Check-In:
                </span>
                <span className={todayAttendance?.clock_in_at ? "font-mono font-bold text-emerald-700 dark:text-emerald-400" : "text-slate-400"}>
                  {todayAttendance?.clock_in_at ? `${clockInDisplay} WIB` : 'Belum Check-In'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <LogOut className="w-3.5 h-3.5 text-blue-600" />
                  Jam Check-Out:
                </span>
                <span className={todayAttendance?.clock_out_at ? "font-mono font-bold text-blue-700 dark:text-blue-400" : "text-slate-400"}>
                  {todayAttendance?.clock_out_at ? `${clockOutDisplay} WIB` : (todayAttendance?.clock_in_at ? 'Sedang Bekerja' : 'Belum')}
                </span>
              </div>
              {todayAttendance?.effective_work_minutes > 0 && (
                <div className="pt-1.5 border-t border-blue-200/50 dark:border-blue-900/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Total Durasi Kerja Efektif:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Math.floor(todayAttendance.effective_work_minutes / 60)}j {todayAttendance.effective_work_minutes % 60}m
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Lokasi Selector & Validasi Radius */}
          <Card className="p-4 sm:p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Lokasi Penugasan Kantor
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={detectGps}
                  disabled={isLocating}
                  className="h-7 px-2 text-[11px] gap-1 text-blue-600 dark:text-blue-400"
                >
                  <Navigation className="w-3 h-3" />
                  {isLocating ? 'Mencari...' : 'Cek GPS'}
                </Button>
              </div>
              <select
                className="w-full h-11 sm:h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                value={selectedLocation?.id || ''}
                onChange={(e) => {
                  const loc = locations.find(l => l.id === Number(e.target.value))
                  setSelectedLocation(loc)
                }}
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} (Radius: {l.radius_meter}m)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{selectedLocation?.address}</p>
            </div>

            {/* Status Geofence Distance Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Jarak dari Titik Kantor:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {calculatedDistance !== null ? `${calculatedDistance} meter` : 'Menghitung...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Batas Maksimal Radius:</span>
                <span className="font-bold text-blue-600">{selectedLocation?.radius_meter || 100} meter</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-medium">Status Geofence:</span>
                {isOutside ? (
                  <Badge variant="destructive" className="gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3" />
                    Luar Radius (+{Math.round((calculatedDistance || 0) - (selectedLocation?.radius_meter || 0))}m)
                  </Badge>
                ) : (
                  <Badge variant="success" className="gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    Dalam Radius Kantor
                  </Badge>
                )}
              </div>
            </div>

            {/* Tombol Aksi Utama di Desktop (Di Mobile disembunyikan agar tidak dobel dengan Floating Bar) */}
            <div className="space-y-2.5 pt-1 hidden md:block">
              {!todayAttendance?.clock_in_at ? (
                <Button
                  variant="brand"
                  size="lg"
                  className="w-full h-11 text-base font-bold shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-transform"
                  disabled={loading}
                  onClick={() => handleClockIn(false)}
                >
                  <Clock className="w-5 h-5 mr-2 shrink-0" />
                  {loading ? 'Memproses Presensi...' : 'CLOCK-IN SEKARANG'}
                </Button>
              ) : !todayAttendance?.clock_out_at ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sudah Clock-In jam <strong>{clockInDisplay} WIB</strong></span>
                  </div>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full h-11 text-base font-bold active:scale-[0.99] transition-transform"
                    disabled={loading}
                    onClick={handleClockOut}
                  >
                    <Clock className="w-5 h-5 mr-2 shrink-0" />
                    {loading ? 'Memproses...' : 'CLOCK-OUT (PULANG)'}
                  </Button>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Presensi Hari Ini Selesai</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masuk: {clockInDisplay} WIB • Pulang: {clockOutDisplay} WIB
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Peta Interaktif Leaflet OSM (Order 2 di mobile, Order 1 di Desktop lg:col-span-7) */}
        <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col space-y-3">
          <Card className="flex-1 flex flex-col p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="font-semibold text-xs sm:text-sm">Peta Radius & Titik Lokasi Kantor</span>
              </div>
              <Button size="sm" variant="ghost" onClick={detectGps} disabled={isLocating} className="h-8 gap-1.5 text-xs">
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isLocating ? 'Mencari GPS...' : 'Refresh GPS Saya'}</span>
                <span className="sm:hidden">{isLocating ? '...' : 'Refresh'}</span>
              </Button>
            </div>

            {/* Container Peta dengan Tinggi Responsif */}
            <div className="h-64 sm:h-96 md:h-[440px] w-full rounded-xl overflow-hidden relative">
              <LeafletMap
                center={mapCenter}
                zoom={16}
                markers={locations.map(l => ({
                  lat: Number(l.latitude),
                  lng: Number(l.longitude),
                  title: l.name,
                  radius: l.radius_meter
                }))}
                userLocation={userCoords}
              />
            </div>

            <div className="pt-2.5 mt-1 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white inline-block" />
                  Titik Kantor & Geofence
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white inline-block" />
                  Koordinat Anda
                </span>
              </div>
              {gpsAccuracy && <span>Akurasi: ±{gpsAccuracy}m</span>}
            </div>
          </Card>
        </div>
      </div>

      {/* Satu-satunya Tombol Aksi di Mobile: Floating Bottom Bar (Mencegah tombol ganda di layar kecil) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:hidden z-30 shadow-2xl">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          {!todayAttendance?.clock_in_at ? (
            <Button
              variant="brand"
              className="flex-1 h-12 font-bold text-sm shadow-md active:scale-[0.98]"
              disabled={loading}
              onClick={() => handleClockIn(false)}
            >
              <Clock className="w-4 h-4 mr-2" />
              {loading ? 'Memproses...' : 'CLOCK-IN SEKARANG'}
            </Button>
          ) : !todayAttendance?.clock_out_at ? (
            <Button
              variant="destructive"
              className="flex-1 h-12 font-bold text-sm shadow-md active:scale-[0.98]"
              disabled={loading}
              onClick={handleClockOut}
            >
              <Clock className="w-4 h-4 mr-2" />
              {loading ? 'Memproses...' : 'CLOCK-OUT (PULANG)'}
            </Button>
          ) : (
            <div className="w-full text-center py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ✅ Presensi Hari Ini Lengkap ({clockInDisplay} - {clockOutDisplay})
            </div>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl"
            onClick={detectGps}
            disabled={isLocating}
            title="Refresh GPS"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modal Luar Radius dengan Input Alasan */}
      <Modal
        isOpen={modalState.isOpen && modalState.type === 'outside_radius'}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title="Konfirmasi Presensi Luar Radius"
        description={`Posisi Anda berada ${modalState.distance} meter dari titik kantor.`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Lokasi ini mengizinkan absensi luar radius dengan catatan khusus. Silakan tuliskan alasan atau keperluan dinas luar Anda:
          </p>
          <textarea
            className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: Bertemu klien di cabang, tugas operasional lapangan..."
            value={outsideNote}
            onChange={(e) => setOutsideNote(e.target.value)}
          />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setModalState({ ...modalState, isOpen: false })}>
              Batal
            </Button>
            <Button
              variant="brand"
              className="w-full sm:w-auto"
              disabled={!outsideNote.trim() || loading}
              onClick={() => {
                setModalState({ ...modalState, isOpen: false })
                handleClockIn(true)
              }}
            >
              Simpan Presensi Luar Radius
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Notifikasi Sukses / Error Umum */}
      <Modal
        isOpen={modalState.isOpen && modalState.type !== 'outside_radius'}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        description={modalState.message}
      >
        <div className="pt-4 flex justify-end">
          <Button variant="brand" className="w-full sm:w-auto" onClick={() => setModalState({ ...modalState, isOpen: false })}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  )
}
