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

export default function LeaveRequestsPage() {
  const [leaves, setLeaves] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  const [form, setForm] = React.useState({
    employee_id: 1,
    leave_type: 'annual',
    start_date: '2026-10-15',
    end_date: '2026-10-16',
    total_days: 2,
    reason: '',
    is_paid: true
  })
  const [submitting, setSubmitting] = React.useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [leaveRes, empRes] = await Promise.all([
        fetch('/api/leave-requests').then(r => r.json()),
        fetch('/api/employees').then(r => r.json())
      ])
      setLeaves(leaveRes.data || [])
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
    if (!confirm(`Konfirmasi untuk ${action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan cuti ini?`)) return
    try {
      const res = await fetch(`/api/leave-requests/${id}/approve`, {
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
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setIsModalOpen(false)
        loadData()
      } else {
        alert('Gagal membuat pengajuan cuti')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const leaveTypeOptions = [
    { label: 'Cuti Tahunan (Annual)', value: 'annual' },
    { label: 'Sakit (Sick)', value: 'sick' },
    { label: 'Izin Mendesak (Emergency)', value: 'emergency' },
    { label: 'Tanpa Gaji (Unpaid)', value: 'unpaid' },
  ]

  const statusOptions = [
    { label: 'Menunggu (Pending)', value: 'pending' },
    { label: 'Disetujui (Approved)', value: 'approved' },
    { label: 'Ditolak (Rejected)', value: 'rejected' },
  ]

  const filters: FilterOption[] = [
    { key: 'leave_type', label: 'Jenis Cuti', options: leaveTypeOptions },
    { key: 'status', label: 'Status Persetujuan', options: statusOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'employee_name',
      header: 'Nama Karyawan',
      render: (l) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">{l.employee_name}</div>
          <div className="text-xs text-slate-400 font-mono">{l.employee_number}</div>
        </div>
      )
    },
    {
      key: 'leave_type',
      header: 'Tipe Cuti',
      render: (l) => (
        <Badge variant="outline" className="capitalize text-xs">
          {l.leave_type}
        </Badge>
      )
    },
    {
      key: 'dates',
      header: 'Tanggal Rentang',
      render: (l) => <span className="text-xs font-mono">{l.start_date} s/d {l.end_date}</span>
    },
    {
      key: 'total_days',
      header: 'Durasi',
      render: (l) => <span className="font-semibold text-xs">{l.total_days} Hari</span>
    },
    {
      key: 'reason',
      header: 'Alasan / Keperluan',
      render: (l) => <span className="text-xs max-w-xs truncate block">{l.reason || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <Badge
          variant={
            l.status === 'approved'
              ? 'success'
              : l.status === 'rejected'
              ? 'destructive'
              : 'warning'
          }
          className="capitalize text-xs"
        >
          {l.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Aksi HR',
      align: 'right',
      render: (l) => (
        <div className="space-x-1 whitespace-nowrap">
          {l.status === 'pending' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-emerald-600 gap-1"
                onClick={() => handleAction(l.id, 'approve')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Setujui
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-600 gap-1"
                onClick={() => handleAction(l.id, 'reject')}
              >
                <XCircle className="w-3.5 h-3.5" />
                Tolak
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400">Selesai Ditinjau</span>
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
            Pengajuan Izin & Cuti
          </h1>
          <p className="text-sm text-slate-500">
            Persetujuan cuti tahunan, sakit, dan izin khusus karyawan
          </p>
        </div>
        <Button variant="brand" className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Ajukan Izin / Cuti
        </Button>
      </div>

      <DataTable
        data={leaves}
        columns={columns}
        searchPlaceholder="Cari nama karyawan, alasan cuti..."
        searchKeys={['employee_name', 'employee_number', 'reason', 'leave_type']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        showRowNumber={true}
        loading={loading}
      />

      {/* Modal Ajukan Cuti */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Form Pengajuan Izin / Cuti"
        description="Masukkan tanggal cuti dan alasan ketidakhadiran"
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
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Jenis Cuti / Izin</label>
            <select
              value={form.leave_type}
              onChange={e => setForm({ ...form, leave_type: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              <option value="annual">Cuti Tahunan (Annual Leave)</option>
              <option value="sick">Sakit (Sick Leave)</option>
              <option value="emergency">Izin Keperluan Mendesak</option>
              <option value="unpaid">Izin Tanpa Gaji (Unpaid)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Total Hari Cuti</label>
            <input
              type="number"
              value={form.total_days}
              onChange={e => setForm({ ...form, total_days: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Alasan</label>
            <textarea
              placeholder="Tuliskan keterangan keperluan cuti..."
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
              {submitting ? 'Menyimpan...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
