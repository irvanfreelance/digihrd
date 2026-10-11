'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Save } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function NewEmployeePage() {
  const router = useRouter()
  const [positions, setPositions] = React.useState<any[]>([])
  const [locations, setLocations] = React.useState<any[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  const [form, setForm] = React.useState({
    employee_number: '',
    full_name: '',
    email: '',
    phone: '',
    nik: '',
    position_id: 1,
    location_id: 1,
    base_salary: 4500000,
    hourly_rate: 22000,
    ptkp_status: 'TK0',
    role: 'employee',
    employment_status: 'permanent',
    bank_name: 'BCA',
    bank_account_number: '',
    bank_account_name: ''
  })

  React.useEffect(() => {
    async function loadOptions() {
      const [posRes, locRes] = await Promise.all([
        fetch('/api/positions').then(r => r.json()),
        fetch('/api/locations').then(r => r.json())
      ])
      setPositions(posRes.data || [])
      setLocations(locRes.data || [])
      if (posRes.data?.length > 0) setForm(f => ({ ...f, position_id: posRes.data[0].id }))
      if (locRes.data?.length > 0) setForm(f => ({ ...f, location_id: locRes.data[0].id }))
    }
    loadOptions()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        router.push('/employees')
      } else {
        const data = await res.json()
        alert('Gagal menambah karyawan: ' + (data.error || 'Terjadi kesalahan'))
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <Link href="/employees">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Tambah Karyawan Baru
          </h1>
          <p className="text-xs text-slate-500">
            Daftarkan biodata, jabatan, penempatan lokasi, dan skema gaji karyawan
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base">1. Biodata Karyawan</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">NIK / No Karyawan (NIP) *</label>
              <input
                type="text"
                required
                placeholder="Contoh: EMP-2026-011"
                value={form.employee_number}
                onChange={e => setForm({ ...form, employee_number: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Alamat Email *</label>
              <input
                type="email"
                required
                placeholder="budi@perusahaan.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">No. Handphone / WhatsApp</label>
              <input
                type="text"
                placeholder="081234567890"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base">2. Jabatan & Lokasi Penempatan</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Jabatan & Departemen *</label>
              <select
                value={form.position_id}
                onChange={e => setForm({ ...form, position_id: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                {positions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.department_name} - {p.payroll_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Lokasi Geofence Absensi *</label>
              <select
                value={form.location_id}
                onChange={e => setForm({ ...form, location_id: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Status Kepegawaian</label>
              <select
                value={form.employment_status}
                onChange={e => setForm({ ...form, employment_status: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                <option value="permanent">Tetap (Permanent)</option>
                <option value="contract">Kontrak (PKWT)</option>
                <option value="probation">Probation</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Role Akses Akun</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                <option value="employee">Employee (Karyawan Biasa)</option>
                <option value="supervisor">Supervisor</option>
                <option value="hr_staff">HR Staff</option>
                <option value="hr_admin">HR Admin</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base">3. Skema Kompensasi Gaji & Bank</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Gaji Pokok Bulanan (IDR)</label>
              <input
                type="number"
                value={form.base_salary}
                onChange={e => setForm({ ...form, base_salary: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Tarif Upah Per Jam (Jika Hourly)</label>
              <input
                type="number"
                value={form.hourly_rate}
                onChange={e => setForm({ ...form, hourly_rate: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Status Pajak PTKP</label>
              <select
                value={form.ptkp_status}
                onChange={e => setForm({ ...form, ptkp_status: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                <option value="TK0">TK/0 (Tidak Kawin, 0 Tanggungan)</option>
                <option value="K0">K/0 (Kawin, 0 Tanggungan)</option>
                <option value="K1">K/1 (Kawin, 1 Tanggungan)</option>
                <option value="K2">K/2 (Kawin, 2 Tanggungan)</option>
                <option value="K3">K/3 (Kawin, 3 Tanggungan)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Nama Bank Pembayaran</label>
              <input
                type="text"
                placeholder="BCA / Mandiri / BNI"
                value={form.bank_name}
                onChange={e => setForm({ ...form, bank_name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Nomor Rekening</label>
              <input
                type="text"
                value={form.bank_account_number}
                onChange={e => setForm({ ...form, bank_account_number: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Nama Pemilik Rekening</label>
              <input
                type="text"
                value={form.bank_account_name}
                onChange={e => setForm({ ...form, bank_account_name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/employees">
            <Button variant="outline" type="button">
              Batal
            </Button>
          </Link>
          <Button variant="brand" type="submit" disabled={submitting} className="gap-2">
            <Save className="w-4 h-4" />
            {submitting ? 'Menyimpan...' : 'Simpan Karyawan'}
          </Button>
        </div>
      </form>
    </div>
  )
}
