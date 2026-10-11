'use client'

import * as React from 'react'
import {
  Plus,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'
import { formatIDR } from '@/lib/utils/currency'

export default function SalaryComponentsPage() {
  const [components, setComponents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  const [form, setForm] = React.useState({
    name: '',
    code: '',
    component_type: 'earning_fixed',
    is_taxable: true,
    is_bpjs_base: false,
    default_amount: 0,
    calculation_basis: 'fixed'
  })
  const [submitting, setSubmitting] = React.useState(false)

  const loadComponents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/salary-components')
      const json = await res.json()
      setComponents(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadComponents()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/salary-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setIsModalOpen(false)
        setForm({
          name: '',
          code: '',
          component_type: 'earning_fixed',
          is_taxable: true,
          is_bpjs_base: false,
          default_amount: 0,
          calculation_basis: 'fixed'
        })
        loadComponents()
      } else {
        alert('Gagal menambah komponen gaji')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const typeOptions = [
    { label: 'Earning Fixed', value: 'earning_fixed' },
    { label: 'Earning Variable', value: 'earning_variable' },
    { label: 'Deduction Fixed', value: 'deduction_fixed' },
    { label: 'Deduction Variable', value: 'deduction_variable' },
    { label: 'BPJS', value: 'bpjs' },
    { label: 'Pajak (Tax)', value: 'tax' },
  ]

  const filters: FilterOption[] = [
    { key: 'component_type', label: 'Tipe Komponen', options: typeOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'code',
      header: 'Kode Komponen',
      render: (c) => <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{c.code}</span>
    },
    {
      key: 'name',
      header: 'Nama Komponen',
      render: (c) => <span className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</span>
    },
    {
      key: 'component_type',
      header: 'Tipe Komponen',
      render: (c) => (
        <Badge variant="outline" className="text-xs uppercase font-mono">
          {c.component_type}
        </Badge>
      )
    },
    {
      key: 'is_taxable',
      header: 'Objek Pajak PPh21',
      render: (c) => <span className="text-xs">{c.is_taxable ? 'Ya (Taxable)' : 'Tidak'}</span>
    },
    {
      key: 'is_bpjs_base',
      header: 'Dasar BPJS',
      render: (c) => <span className="text-xs">{c.is_bpjs_base ? 'Ya' : 'Tidak'}</span>
    },
    {
      key: 'default_amount',
      header: 'Nominal Default (IDR)',
      render: (c) => (
        <span className="text-xs font-semibold">
          {Number(c.default_amount) > 0 ? formatIDR(Number(c.default_amount)) : '-'}
        </span>
      )
    },
    {
      key: 'is_system',
      header: 'Status Sistem',
      render: (c) => (
        c.is_system ? (
          <Badge variant="secondary" className="text-[10px]">Sistem Standar</Badge>
        ) : (
          <Badge variant="success" className="text-[10px]">Kustom</Badge>
        )
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Master Komponen Gaji & Tunjangan
          </h1>
          <p className="text-sm text-slate-500">
            Daftar komponen pendapatan tetap, variabel, iuran BPJS, dan potongan standar
          </p>
        </div>
        <Button variant="brand" className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Tambah Komponen Gaji
        </Button>
      </div>

      <DataTable
        data={components}
        columns={columns}
        searchPlaceholder="Cari kode atau nama komponen..."
        searchKeys={['name', 'code', 'component_type']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        showRowNumber={true}
        loading={loading}
      />

      {/* Modal Tambah Komponen Gaji */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Master Komponen Gaji"
        description="Buat komponen pendapatan atau pemotongan gaji baru"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold block mb-1">Nama Komponen *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Tunjangan Kehadiran"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Kode Unik (UPPERCASE) *</label>
            <input
              type="text"
              required
              placeholder="Contoh: TUNJ_HADIR"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Tipe Komponen</label>
            <select
              value={form.component_type}
              onChange={e => setForm({ ...form, component_type: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              <option value="earning_fixed">Earning Fixed (Pendapatan Tetap)</option>
              <option value="earning_variable">Earning Variable (Pendapatan Variabel)</option>
              <option value="deduction_fixed">Deduction Fixed (Potongan Tetap)</option>
              <option value="deduction_variable">Deduction Variable (Potongan Variabel)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Nominal Bawaan Default (IDR)</label>
            <input
              type="number"
              value={form.default_amount}
              onChange={e => setForm({ ...form, default_amount: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_taxable}
                onChange={e => setForm({ ...form, is_taxable: e.target.checked })}
                className="rounded border-slate-300 w-4 h-4 text-blue-600"
              />
              Objek Pajak PPh 21
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_bpjs_base}
                onChange={e => setForm({ ...form, is_bpjs_base: e.target.checked })}
                className="rounded border-slate-300 w-4 h-4 text-blue-600"
              />
              Dasar Hitung BPJS
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="brand" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Komponen'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
