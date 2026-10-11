'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id

  const [positions, setPositions] = React.useState<any[]>([])
  const [locations, setLocations] = React.useState<any[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  const [form, setForm] = React.useState<any>({
    full_name: '',
    email: '',
    phone: '',
    nik: '',
    position_id: 1,
    location_id: 1,
    base_salary: 0,
    hourly_rate: 0,
    ptkp_status: 'TK0',
    role: 'employee',
    employment_status: 'permanent',
    bank_name: 'BCA',
    bank_account_number: '',
    bank_account_name: ''
  })

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [empRes, posRes, locRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}`).then(r => r.json()),
          fetch('/api/positions').then(r => r.json()),
          fetch('/api/locations').then(r => r.json())
        ])

        const emp = empRes.data
        if (emp) {
          setForm({
            full_name: emp.full_name || '',
            email: emp.email || '',
            phone: emp.phone || '',
            nik: emp.nik || '',
            position_id: emp.position_id,
            location_id: emp.location_id || 1,
            base_salary: Number(emp.base_salary) || 0,
            hourly_rate: Number(emp.hourly_rate) || 0,
            ptkp_status: emp.ptkp_status || 'TK0',
            role: emp.role || 'employee',
            employment_status: emp.employment_status || 'permanent',
            bank_name: emp.bank_name || 'BCA',
            bank_account_number: emp.bank_account_number || '',
            bank_account_name: emp.bank_account_name || ''
          })
        }
        setPositions(posRes.data || [])
        setLocations(locRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [employeeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        router.push('/employees')
      } else {
        alert('Gagal mengupdate karyawan')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat profil karyawan...</div>

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
            Edit Data Karyawan
          </h1>
          <p className="text-xs text-slate-500">Perbarui informasi jabatan, gaji, atau akun karyawan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base">1. Biodata</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Nomor HP</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">NIK</label>
              <input
                type="text"
                value={form.nik}
                onChange={e => setForm({ ...form, nik: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base">2. Penempatan & Kompensasi</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Jabatan</label>
              <select
                value={form.position_id}
                onChange={e => setForm({ ...form, position_id: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                {positions.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.payroll_type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Lokasi Absensi</label>
              <select
                value={form.location_id}
                onChange={e => setForm({ ...form, location_id: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Gaji Pokok (IDR)</label>
              <input
                type="number"
                value={form.base_salary}
                onChange={e => setForm({ ...form, base_salary: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Tarif Per Jam (IDR)</label>
              <input
                type="number"
                value={form.hourly_rate}
                onChange={e => setForm({ ...form, hourly_rate: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/employees">
            <Button variant="outline" type="button">Batal</Button>
          </Link>
          <Button variant="brand" type="submit" disabled={submitting} className="gap-2">
            <Save className="w-4 h-4" />
            {submitting ? 'Menyimpan...' : 'Perbarui Data'}
          </Button>
        </div>
      </form>
    </div>
  )
}
