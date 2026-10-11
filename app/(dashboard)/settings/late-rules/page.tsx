'use client'

import * as React from 'react'
import {
  ShieldAlert,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'
import { formatIDR } from '@/lib/utils/currency'

export default function LateRulesPage() {
  const [rules, setRules] = React.useState<any[]>([])
  const [grades, setGrades] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  const [form, setForm] = React.useState({
    employment_grade_id: 1,
    tolerance_minutes: 0,
    late_affects_payroll: true,
    deduction_method: 'per_minute',
    deduction_amount: 500,
    effective_from: '2026-01-01'
  })
  const [submitting, setSubmitting] = React.useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [rRes, gRes] = await Promise.all([
        fetch('/api/late-rules').then(r => r.json()),
        fetch('/api/employment-grades').then(r => r.json())
      ])
      setRules(rRes.data || [])
      setGrades(gRes.data || [])
      if (gRes.data?.length > 0) setForm(f => ({ ...f, employment_grade_id: gRes.data[0].id }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/late-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setIsModalOpen(false)
        loadData()
      } else {
        alert('Gagal menambah aturan keterlambatan')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const gradeOptions = React.useMemo(() => {
    return grades.map(g => ({ label: g.name, value: g.name }))
  }, [grades])

  const methodOptions = [
    { label: 'per_minute (Tarif per menit)', value: 'per_minute' },
    { label: 'per_hour (Tarif per jam)', value: 'per_hour' },
    { label: 'flat_cut (Potongan flat)', value: 'flat_cut' },
    { label: 'none (Tanpa denda)', value: 'none' },
  ]

  const filters: FilterOption[] = [
    { key: 'grade_name', label: 'Golongan Grade', options: gradeOptions },
    { key: 'deduction_method', label: 'Metode Denda', options: methodOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'grade_name',
      header: 'Golongan / Level Grade',
      render: (r) => <span className="font-bold text-slate-900 dark:text-white text-sm">{r.grade_name}</span>
    },
    {
      key: 'tolerance_minutes',
      header: 'Toleransi Waktu',
      render: (r) => (
        <span className="text-xs font-semibold">
          {r.tolerance_minutes > 0 ? `${r.tolerance_minutes} Menit` : '0 Menit (Tepat Waktu)'}
        </span>
      )
    },
    {
      key: 'late_affects_payroll',
      header: 'Efek Payroll',
      render: (r) => (
        r.late_affects_payroll ? (
          <Badge variant="warning" className="text-xs">Memotong Gaji</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Tidak Memotong</Badge>
        )
      )
    },
    {
      key: 'deduction_method',
      header: 'Metode Pemotongan',
      render: (r) => <span className="text-xs font-mono font-medium">{r.deduction_method}</span>
    },
    {
      key: 'deduction_amount',
      header: 'Tarif Potongan (IDR)',
      render: (r) => (
        <span className="text-xs font-bold text-red-600">
          {Number(r.deduction_amount) > 0 ? formatIDR(Number(r.deduction_amount)) : '-'}
        </span>
      )
    },
    {
      key: 'effective_from',
      header: 'Berlaku Sejak',
      render: (r) => <span className="text-xs text-slate-500 font-mono">{r.effective_from}</span>
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Aturan Keterlambatan (Late Rules)
          </h1>
          <p className="text-sm text-slate-500">
            Kebijakan toleransi menit keterlambatan dan metode potongan gaji per golongan/grade
          </p>
        </div>
        <Button variant="brand" className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Tambah Aturan Grade
        </Button>
      </div>

      <DataTable
        data={rules}
        columns={columns}
        searchPlaceholder="Cari aturan grade..."
        searchKeys={['grade_name', 'deduction_method']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        showRowNumber={true}
        loading={loading}
      />

      {/* Modal Tambah Rule */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Aturan Keterlambatan Baru"
        description="Pilih level golongan dan skema perhitungan denda keterlambatan"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold block mb-1">Pilih Grade / Golongan</label>
            <select
              value={form.employment_grade_id}
              onChange={e => setForm({ ...form, employment_grade_id: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.name} (Level {g.level})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Toleransi Keterlambatan (Menit)</label>
            <input
              type="number"
              value={form.tolerance_minutes}
              onChange={e => setForm({ ...form, tolerance_minutes: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="late_affects"
              checked={form.late_affects_payroll}
              onChange={e => setForm({ ...form, late_affects_payroll: e.target.checked })}
              className="rounded border-slate-300 w-4 h-4 text-blue-600"
            />
            <label htmlFor="late_affects" className="text-xs font-medium cursor-pointer">
              Keterlambatan Mempengaruhi Potongan Payroll
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Metode Pemotongan Denda</label>
            <select
              value={form.deduction_method}
              onChange={e => setForm({ ...form, deduction_method: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              <option value="none">none (Tanpa Denda)</option>
              <option value="per_minute">per_minute (Tarif per Menit)</option>
              <option value="per_hour">per_hour (Tarif per Jam Dibulatkan)</option>
              <option value="flat_cut">flat_cut (Potongan Tetap Sekali Telat)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Besaran Denda / Tarif (IDR)</label>
            <input
              type="number"
              value={form.deduction_amount}
              onChange={e => setForm({ ...form, deduction_amount: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="brand" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Aturan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
