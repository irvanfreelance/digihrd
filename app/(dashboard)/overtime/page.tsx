'use client'

import * as React from 'react'
import {
  Plus,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'

export default function OvertimeRequestsPage() {
  const [overtimes, setOvertimes] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  const [form, setForm] = React.useState({
    employee_id: 1,
    overtime_date: '2026-10-10',
    start_time: '2026-10-10T17:00:00Z',
    end_time: '2026-10-10T19:00:00Z',
    duration_minutes: 120,
    multiplier: 1.5,
    reason: ''
  })
  const [submitting, setSubmitting] = React.useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [otRes, empRes] = await Promise.all([
        fetch('/api/overtime-requests').then(r => r.json()),
        fetch('/api/employees').then(r => r.json())
      ])
      setOvertimes(otRes.data || [])
      setEmployees(empRes.data || [])
      if (empRes.data?.length > 0) setForm(f => ({ ...f, employee_id: empRes.data[0].id }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!confirm(`Konfirmasi untuk ${action === 'approve' ? 'menyetujui' : 'menolak'} lembur ini?`)) return
    try {
      const res = await fetch(`/api/overtime-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        loadData()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/overtime-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setIsModalOpen(false)
        loadData()
      } else {
        alert('Gagal membuat lembur')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const statusOptions = [
    { label: 'Menunggu (Pending)', value: 'pending' },
    { label: 'Disetujui (Approved)', value: 'approved' },
    { label: 'Ditolak (Rejected)', value: 'rejected' },
  ]

  const filters: FilterOption[] = [
    { key: 'status', label: 'Status Persetujuan', options: statusOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'employee_name',
      header: 'Nama Karyawan',
      render: (ot) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">{ot.employee_name}</div>
          <div className="text-xs text-slate-400 font-mono">{ot.employee_number}</div>
        </div>
      )
    },
    {
      key: 'overtime_date',
      header: 'Tanggal Lembur',
      render: (ot) => <span className="text-xs font-semibold font-mono">{ot.overtime_date}</span>
    },
    {
      key: 'duration_minutes',
      header: 'Durasi',
      render: (ot) => (
        <span className="text-xs font-bold text-blue-600">
          {ot.duration_minutes} Menit ({(ot.duration_minutes / 60).toFixed(1)} Jam)
        </span>
      )
    },
    {
      key: 'multiplier',
      header: 'Rate Multiplier',
      render: (ot) => <span className="text-xs font-semibold">{ot.multiplier}x</span>
    },
    {
      key: 'reason',
      header: 'Alasan / Tugas',
      render: (ot) => <span className="text-xs max-w-xs truncate block">{ot.reason || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (ot) => (
        <Badge
          variant={
            ot.status === 'approved'
              ? 'success'
              : ot.status === 'rejected'
              ? 'destructive'
              : 'warning'
          }
          className="capitalize text-xs"
        >
          {ot.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Aksi HR',
      align: 'right',
      render: (ot) => (
        <div className="space-x-1 whitespace-nowrap">
          {ot.status === 'pending' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-emerald-600 gap-1"
                onClick={() => handleAction(ot.id, 'approve')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Setujui
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-600 gap-1"
                onClick={() => handleAction(ot.id, 'reject')}
              >
                <XCircle className="w-3.5 h-3.5" />
                Tolak
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400">Telah Diproses</span>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Permohonan & Rekap Lembur (Overtime)
          </h1>
          <p className="text-sm text-slate-500">
            Daftar pengajuan lembur, durasi jam lembur, multiplier, dan approval gaji lembur
          </p>
        </div>
        <Button variant="brand" className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Ajukan Surat Perintah Lembur
        </Button>
      </div>

      <DataTable
        data={overtimes}
        columns={columns}
        searchPlaceholder="Cari nama karyawan, NIK, tugas lembur..."
        searchKeys={['employee_name', 'employee_number', 'reason', 'overtime_date']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        showRowNumber={true}
        loading={loading}
      />

      {/* Modal Ajukan Lembur */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Form Pengajuan Lembur Karyawan"
        description="Masukkan tanggal, durasi lembur, dan rincian pekerjaan"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold block mb-1">Pilih Karyawan</label>
            <select
              value={form.employee_id}
              onChange={e => setForm({ ...form, employee_id: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} ({e.position_name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Tanggal Lembur</label>
            <input
              type="date"
              value={form.overtime_date}
              onChange={e => setForm({ ...form, overtime_date: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Durasi Lembur (Menit)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Pengali Multiplier</label>
              <input
                type="number"
                step="0.5"
                value={form.multiplier}
                onChange={e => setForm({ ...form, multiplier: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Tugas / Alasan Lembur</label>
            <textarea
              placeholder="Contoh: Penyelesaian target batch produksi lini A..."
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              className="w-full h-20 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="brand" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Ajukan Lembur'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
