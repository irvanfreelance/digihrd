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
  Calendar
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

  // Load locations & today attendance
  React.useEffect(() => {
    async function loadData() {
      try {
        const [locRes, attRes] = await Promise.all([
          fetch('/api/locations').then(r => r.json()),
          fetch('/api/attendances').then(r => r.json())
        ])

        const locs = locRes.data || []
        setLocations(locs)
        if (locs.length > 0) {
          setSelectedLocation(locs[0])
        }

        const todayStr = new Date().toISOString().slice(0, 10)
        const myToday = (attRes.data || []).find((a: any) => a.attendance_date?.startsWith(todayStr))
        if (myToday) {
          setTodayAttendance(myToday)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
    detectGps()
  }, [])

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
        console.warn('Geolocation error:', err.message)
        // Fallback ke dekat lokasi kantor 1 untuk testing dev
        if (selectedLocation) {
          setUserCoords([Number(selectedLocation.latitude), Number(selectedLocation.longitude)])
          setGpsAccuracy(5)
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

      setTodayAttendance(data.data.attendance)
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

      setTodayAttendance(data.data)
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Berhasil Pulang!',
        message: 'Clock-out tersimpan. Durasi kerja efektif telah dikalkulasikan.'
      })
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const mapCenter: [number, number] = userCoords || (selectedLocation ? [Number(selectedLocation.latitude), Number(selectedLocation.longitude)] : [-6.8700, 107.5390])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Clock-In & Clock-Out Geolocation
          </h1>
          <p className="text-sm text-slate-500">
            Validasi presensi kehadiran real-time berbasis koordinat GPS OpenStreetMap & Geofence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            Live Jam Server
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Peta Interaktif Leaflet OSM */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <Card className="flex-1 flex flex-col p-4">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-sm">Peta Radius & Titik Lokasi Kantor</span>
              </div>
              <Button size="sm" variant="ghost" onClick={detectGps} disabled={isLocating} className="gap-1.5 text-xs">
                <Navigation className="w-3.5 h-3.5" />
                {isLocating ? 'Mencari GPS...' : 'Refresh GPS Saya'}
              </Button>
            </div>

            <div className="flex-1 min-h-[380px] w-full rounded-xl overflow-hidden relative">
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

            <div className="pt-3 mt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500 border border-white inline-block" />
                  Titik Kantor & Geofence
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white inline-block" />
                  Koordinat Anda
                </span>
              </div>
              {gpsAccuracy && <span>Akurasi GPS: ±{gpsAccuracy}m</span>}
            </div>
          </Card>
        </div>

        {/* Panel Form Clock-In & Kartu Waktu */}
        <div className="lg:col-span-5 space-y-5">
          {/* Realtime Clock Card */}
          <Card className="text-center p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">Waktu Indonesia Barat (WIB)</p>
            <div className="text-4xl sm:text-5xl font-black my-2 font-heading tracking-wider">
              {currentTime || '--:--:--'}
            </div>
            <p className="text-xs text-blue-100 flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </Card>

          {/* Lokasi Selector & Validasi Radius */}
          <Card className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Lokasi Penugasan Kantor
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium"
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
              <p className="text-[11px] text-slate-400 mt-1 truncate">{selectedLocation?.address}</p>
            </div>

            {/* Status Geofence Distance */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
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
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Luar Radius (+{Math.round((calculatedDistance || 0) - (selectedLocation?.radius_meter || 0))}m)
                  </Badge>
                ) : (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Dalam Radius Kantor
                  </Badge>
                )}
              </div>
            </div>

            {/* Tombol Aksi Clock-In / Out */}
            <div className="space-y-3 pt-2">
              {!todayAttendance?.clock_in_at ? (
                <Button
                  variant="brand"
                  size="lg"
                  className="w-full text-base font-bold shadow-lg"
                  disabled={loading}
                  onClick={() => handleClockIn(false)}
                >
                  <Clock className="w-5 h-5 mr-2" />
                  {loading ? 'Memproses...' : 'CLOCK-IN SEKARANG'}
                </Button>
              ) : !todayAttendance?.clock_out_at ? (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ✅ Sudah Clock-In jam {new Date(todayAttendance.clock_in_at).toLocaleTimeString('id-ID')}
                  </div>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full text-base font-bold"
                    disabled={loading}
                    onClick={handleClockOut}
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    {loading ? 'Memproses...' : 'CLOCK-OUT (PULANG)'}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Presensi Selesai</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Anda sudah clock-in dan clock-out untuk hari ini.
                  </p>
                </div>
              )}
            </div>
          </Card>
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
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Lokasi ini mengizinkan absensi luar radius dengan catatan khusus. Silakan tuliskan alasan atau keperluan dinas luar Anda:
          </p>
          <textarea
            className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: Bertemu klien di cabang, tugas operasional lapangan..."
            value={outsideNote}
            onChange={(e) => setOutsideNote(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalState({ ...modalState, isOpen: false })}>
              Batal
            </Button>
            <Button
              variant="brand"
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
          <Button variant="brand" onClick={() => setModalState({ ...modalState, isOpen: false })}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  )
}
