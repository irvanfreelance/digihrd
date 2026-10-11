'use client'

import * as React from 'react'
import {
  Download,
  AlertTriangle,
  Edit,
  ShieldAlert
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'

export default function AttendanceListPage() {
  const [attendances, setAttendances] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal Koreksi
  const [editItem, setEditItem] = React.useState<any>(null)
  const [newStatus, setNewStatus] = React.useState('')
  const [newLateMinutes, setNewLateMinutes] = React.useState(0)
  const [correctionNote, setCorrectionNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const loadAttendances = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendances')
      const json = await res.json()
      setAttendances(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadAttendances()
  }, [])

  const handleSaveCorrection = async () => {
    if (!editItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/attendances/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          late_minutes: Number(newLateMinutes),
          outside_radius_note: correctionNote
        })
      })
      if (res.ok) {
        setEditItem(null)
        loadAttendances()
      } else {
        alert('Gagal mengupdate koreksi absensi')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filters
  const locationOptions = React.useMemo(() => {
    const set = new Set(attendances.map(a => a.location_name).filter(Boolean))
    return Array.from(set).map(l => ({ label: l, value: l }))
  }, [attendances])

  const statusOptions = [
    { label: 'Hadir (Present)', value: 'present' },
    { label: 'Terlambat (Late)', value: 'late' },
    { label: 'Tidak Hadir (Absent)', value: 'absent' },
  ]

  const filters: FilterOption[] = [
    { key: 'status', label: 'Status Kehadiran', options: statusOptions },
    { key: 'location_name', label: 'Lokasi Kantor', options: locationOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'attendance_date',
      header: 'Tanggal',
      render: (att) => <span className="font-semibold text-xs font-mono">{att.attendance_date}</span>
    },
    {
      key: 'employee_name',
      header: 'Karyawan',
      render: (att) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">{att.employee_name}</div>
          <div className="text-xs text-slate-400 font-mono">{att.employee_number}</div>
        </div>
      )
    },
    {
      key: 'location_name',
      header: 'Lokasi & Jarak',
      render: (att) => (
        <div className="text-xs">
          <div className="font-medium">{att.location_name || 'Kantor'}</div>
          <div className="text-[11px] text-slate-400">
            {att.clock_in_distance ? `Jarak: ${att.clock_in_distance}m` : '-'}
          </div>
        </div>
      )
    },
    {
      key: 'clock_in_at',
      header: 'Jam Masuk / Pulang',
      render: (att) => (
        <div className="text-xs">
          <div>Masuk: <strong>{att.clock_in_at ? new Date(att.clock_in_at).toLocaleTimeString('id-ID') : '-'}</strong></div>
          <div>Pulang: <strong>{att.clock_out_at ? new Date(att.clock_out_at).toLocaleTimeString('id-ID') : '-'}</strong></div>
        </div>
      )
    },
    {
      key: 'clock_in_status',
      header: 'Status Masuk',
      render: (att) => {
        if (att.fraud_flag) {
          return (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="w-3 h-3" />
              Mock GPS (Fraud)
            </Badge>
          )
        }
        if (att.clock_in_status === 'outside_radius') {
          return (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Luar Radius
            </Badge>
          )
        }
        if (att.status === 'absent') {
          return <Badge variant="destructive">Tidak Hadir</Badge>
        }
        return <Badge variant="success">Valid Geofence</Badge>
      }
    },
    {
      key: 'late_minutes',
      header: 'Keterlambatan',
      render: (att) => (
        att.late_minutes > 0 ? (
          <span className="text-xs font-bold text-amber-600">+{att.late_minutes} menit</span>
        ) : (
          <span className="text-xs text-emerald-600 font-medium">Tepat Waktu</span>
        )
      )
    },
    {
      key: 'actions',
      header: 'Aksi HR',
      align: 'right',
      render: (att) => (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs"
          onClick={() => {
            setEditItem(att)
            setNewStatus(att.status)
            setNewLateMinutes(att.late_minutes)
            setCorrectionNote(att.outside_radius_note || '')
          }}
        >
          <Edit className="w-3.5 h-3.5" />
          Koreksi
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Rekap & Log Absensi Geolocation
          </h1>
          <p className="text-sm text-slate-500">
            Daftar absensi harian seluruh karyawan, validasi fraud GPS, dan koreksi data HR Admin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/reports/attendance?format=xlsx" download="rekap-absensi.xlsx">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Export Excel (.xlsx)
            </Button>
          </a>
        </div>
      </div>

      <DataTable
        data={attendances}
        columns={columns}
        searchPlaceholder="Cari nama karyawan, NIK, lokasi..."
        searchKeys={['employee_name', 'employee_number', 'location_name', 'status']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        showRowNumber={true}
        loading={loading}
      />

      {/* Modal Form Koreksi Absensi */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Koreksi Absensi: ${editItem?.employee_name}`}
        description={`Tanggal absensi: ${editItem?.attendance_date}`}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold block mb-1">Status Kehadiran</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              <option value="present">Hadir (Present)</option>
              <option value="late">Terlambat (Late)</option>
              <option value="absent">Tidak Hadir (Absent)</option>
              <option value="leave">Izin / Cuti (Leave)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Keterlambatan (Menit)</label>
            <input
              type="number"
              value={newLateMinutes}
              onChange={(e) => setNewLateMinutes(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Catatan Koreksi HR Admin</label>
            <textarea
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="Berikan alasan atau keterangan perbaikan data absensi..."
              className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Batal
            </Button>
            <Button variant="brand" disabled={submitting} onClick={handleSaveCorrection}>
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
