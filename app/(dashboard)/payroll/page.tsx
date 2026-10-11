'use client'

import * as React from 'react'
import {
  Plus,
  Play,
  Eye,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'
import { formatIDR } from '@/lib/utils/currency'

export default function PayrollRunsPage() {
  const [runs, setRuns] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createModal, setCreateModal] = React.useState(false)

  // Form New Run
  const [year, setYear] = React.useState(2026)
  const [month, setMonth] = React.useState(11)
  const [payDate, setPayDate] = React.useState('2026-11-28')
  const [submitting, setSubmitting] = React.useState(false)

  const loadRuns = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payroll-runs')
      const json = await res.json()
      setRuns(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadRuns()
  }, [])

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ]
      const periodLabel = `${months[month - 1]} ${year}`

      const res = await fetch('/api/payroll-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_year: year,
          period_month: month,
          period_label: periodLabel,
          pay_date: payDate
        })
      })

      if (res.ok) {
        setCreateModal(false)
        loadRuns()
      } else {
        const data = await res.json()
        alert('Gagal: ' + (data.error || 'Periode run sudah ada'))
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunGenerate = async (runId: number) => {
    if (!confirm('Jalankan kalkulasi payroll otomatis untuk seluruh karyawan di periode ini?')) return
    try {
      const res = await fetch(`/api/payroll-runs/${runId}/generate`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        loadRuns()
      } else {
        alert('Gagal kalkulasi: ' + data.error)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Calculated', value: 'calculated' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Approved', value: 'approved' },
    { label: 'Paid', value: 'paid' },
  ]

  const filters: FilterOption[] = [
    { key: 'status', label: 'Status Lifecycle', options: statusOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'period_label',
      header: 'Periode Penggajian',
      render: (r) => <span className="font-bold text-slate-900 dark:text-white text-sm">{r.period_label}</span>
    },
    {
      key: 'pay_date',
      header: 'Tanggal Bayar',
      render: (r) => <span className="text-xs text-slate-500 font-mono">{r.pay_date || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status Lifecycle',
      render: (r) => (
        <Badge
          variant={
            r.status === 'paid'
              ? 'success'
              : r.status === 'approved'
              ? 'default'
              : r.status === 'calculated'
              ? 'warning'
              : 'secondary'
          }
          className="capitalize text-xs"
        >
          {r.status}
        </Badge>
      )
    },
    {
      key: 'total_employees',
      header: 'Total Karyawan',
      render: (r) => <span className="font-semibold text-xs">{r.total_employees} Orang</span>
    },
    {
      key: 'total_gross',
      header: 'Gross (Bruto)',
      render: (r) => <span className="text-xs font-semibold">{formatIDR(Number(r.total_gross))}</span>
    },
    {
      key: 'total_deductions',
      header: 'Total Potongan',
      render: (r) => <span className="text-xs font-semibold text-red-600">-{formatIDR(Number(r.total_deductions))}</span>
    },
    {
      key: 'total_net',
      header: 'Total Netto',
      render: (r) => <span className="text-xs font-black text-emerald-600">{formatIDR(Number(r.total_net))}</span>
    },
    {
      key: 'actions',
      header: 'Aksi Engine',
      align: 'right',
      render: (r) => (
        <div className="space-x-2 whitespace-nowrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => handleRunGenerate(r.id)}
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            Kalkulasi
          </Button>
          <Link href={`/payroll/run/${r.id}`}>
            <Button size="sm" variant="brand" className="gap-1 text-xs">
              <Eye className="w-3.5 h-3.5" />
              Rincian
            </Button>
          </Link>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Payroll Runs (Siklus Penggajian)
          </h1>
          <p className="text-sm text-slate-500">
            Kalkulasi gaji otomatis, potongan keterlambatan & absensi, BPJS, PPh21, dan cetak slip
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/api/reports/payroll?format=xlsx" download="laporan-payroll.xlsx">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Export Excel
            </Button>
          </a>
          <Button variant="brand" className="gap-2" onClick={() => setCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Buka Periode Payroll Baru
          </Button>
        </div>
      </div>

      <DataTable
        data={runs}
        columns={columns}
        searchPlaceholder="Cari periode payroll atau tahun..."
        searchKeys={['period_label', 'status', 'pay_date']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        showRowNumber={true}
        loading={loading}
      />

      {/* Modal Buat Periode Run Baru */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Buka Periode Payroll Baru"
        description="Pilih bulan dan tahun siklus penggajian karyawan"
      >
        <form onSubmit={handleCreateRun} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Tahun</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                <option value={10}>Oktober</option>
                <option value={11}>November</option>
                <option value={12}>Desember</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Target Tanggal Pembayaran</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setCreateModal(false)}>
              Batal
            </Button>
            <Button variant="brand" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Buat Periode'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
