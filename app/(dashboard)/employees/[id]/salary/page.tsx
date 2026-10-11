'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, DollarSign, Save } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatIDR } from '@/lib/utils/currency'

export default function EmployeeSalaryComponentsPage() {
  const params = useParams()
  const employeeId = params.id

  const [employee, setEmployee] = React.useState<any>(null)
  const [components, setComponents] = React.useState<any[]>([])
  const [masterComponents, setMasterComponents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Form State
  const [selectedCompId, setSelectedCompId] = React.useState<number>(1)
  const [compAmount, setCompAmount] = React.useState<number>(500000)
  const [effectiveFrom, setEffectiveFrom] = React.useState('2026-01-01')
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [empRes, masterRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`).then(r => r.json()),
        fetch('/api/salary-components').then(r => r.json())
      ])

      setEmployee(empRes.data)
      setComponents(empRes.data?.salary_components || [])
      setMasterComponents(masterRes.data || [])
      if (masterRes.data?.length > 0) setSelectedCompId(masterRes.data[0].id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [employeeId])

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary_component_id: selectedCompId,
          amount: compAmount,
          effective_from: effectiveFrom,
          notes
        })
      })

      if (res.ok) {
        setIsModalOpen(false)
        loadData()
      } else {
        alert('Gagal menambahkan komponen gaji')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComponent = async (id: number) => {
    if (!confirm('Hapus komponen gaji ini dari karyawan?')) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/salary?comp_id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        loadData()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat data gaji...</div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/employees">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
              Komponen Gaji: {employee?.full_name}
            </h1>
            <p className="text-xs text-slate-500">
              {employee?.employee_number} • {employee?.position_name} ({employee?.payroll_type})
            </p>
          </div>
        </div>

        <Button variant="brand" className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Tambah Komponen
        </Button>
      </div>

      {/* Ringkasan Gaji Pokok */}
      <Card className="p-5 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <div>
          <span className="text-xs text-blue-800 dark:text-blue-300 font-semibold uppercase">
            Gaji Pokok / Upah Master Karyawan
          </span>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-0.5">
            {employee?.payroll_type === 'hourly'
              ? `${formatIDR(Number(employee?.hourly_rate || 0))} / jam`
              : formatIDR(Number(employee?.base_salary || 0))}
          </div>
        </div>
        <Badge variant="outline" className="text-xs uppercase bg-white dark:bg-slate-900">
          Skema {employee?.payroll_type}
        </Badge>
      </Card>

      {/* Tabel Komponen Tambahan */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Tunjangan & Komponen Khusus</CardTitle>
          <CardDescription>Komponen tambahan yang aktif dimasukkan ke payroll run</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Komponen</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Nominal (IDR)</TableHead>
              <TableHead>Berlaku Sejak</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                  Belum ada komponen tambahan untuk karyawan ini.
                </TableCell>
              </TableRow>
            ) : (
              components.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.component_code}</TableCell>
                  <TableCell className="font-bold text-sm text-slate-900 dark:text-white">
                    {c.component_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {c.component_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-xs">
                    {formatIDR(Number(c.amount))}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{c.effective_from}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1.5 text-red-600"
                      onClick={() => handleDeleteComponent(c.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Tambah Komponen Gaji */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Komponen Gaji Karyawan"
        description={`Karyawan: ${employee?.full_name}`}
      >
        <form onSubmit={handleAddComponent} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold block mb-1">Pilih Komponen Master</label>
            <select
              value={selectedCompId}
              onChange={e => setSelectedCompId(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              {masterComponents.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.component_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Nominal Tambahan (IDR)</label>
            <input
              type="number"
              value={compAmount}
              onChange={e => setCompAmount(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Tanggal Berlaku Efektif</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Catatan Keterangan</label>
            <input
              type="text"
              placeholder="Contoh: Tunjangan kinerja penugasan khusus"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            />
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
