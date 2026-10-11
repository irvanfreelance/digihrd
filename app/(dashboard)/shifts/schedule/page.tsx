'use client'

import * as React from 'react'
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

export default function ShiftsSchedulePage() {
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [templates, setTemplates] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [locations, setLocations] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isAssignModal, setIsAssignModal] = React.useState(false)

  // Form Assign Shift
  const [form, setForm] = React.useState({
    employee_id: 1,
    shift_template_id: 1,
    location_id: 1,
    effective_date: '2026-10-01',
    recurrence: 'weekly'
  })
  const [submitting, setSubmitting] = React.useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [saRes, stRes, empRes, locRes] = await Promise.all([
        fetch('/api/shift-assignments').then(r => r.json()),
        fetch('/api/shifts').then(r => r.json()),
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/locations').then(r => r.json())
      ])
      setAssignments(saRes.data || [])
      setTemplates(stRes.data || [])
      setEmployees(empRes.data || [])
      setLocations(locRes.data || [])
      if (empRes.data?.length > 0) setForm(f => ({ ...f, employee_id: empRes.data[0].id }))
      if (stRes.data?.length > 0) setForm(f => ({ ...f, shift_template_id: stRes.data[0].id }))
      if (locRes.data?.length > 0) setForm(f => ({ ...f, location_id: locRes.data[0].id }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/shift-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setIsAssignModal(false)
        loadData()
      } else {
        alert('Gagal menetapkan shift')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Days of week for roster
  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Penjadwalan Shift & Roster Tim
          </h1>
          <p className="text-sm text-slate-500">
            Plotting shift kerja tim pabrik, kantor pusat, dan gerai outlet
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="brand" className="gap-2" onClick={() => setIsAssignModal(true)}>
            <Plus className="w-4 h-4" />
            Plot Jadwal Shift Karyawan
          </Button>
        </div>
      </div>

      {/* Template Shift Badges Legend */}
      <Card className="p-4">
        <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
          Master Template Shift Tersedia
        </span>
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium"
              style={{
                borderColor: `${t.color_hex}40`,
                backgroundColor: `${t.color_hex}15`,
                color: t.color_hex
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color_hex }} />
              <strong>{t.name}</strong>
              <span className="text-slate-500">({t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)})</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Roster Calendar Matrix */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="p-4 w-60">Nama Karyawan</th>
                {daysOfWeek.map((d, i) => (
                  <th key={i} className="p-4 text-center min-w-[120px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.map(emp => {
                const empShift = assignments.find(a => a.employee_id === emp.id)
                const shiftColor = empShift?.color_hex || '#3B82F6'

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {emp.full_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {emp.employee_number} • {emp.position_name}
                      </div>
                    </td>

                    {daysOfWeek.map((d, i) => {
                      const isWeekend = i >= 5 && emp.position_name?.includes('Staf')
                      return (
                        <td key={i} className="p-2 text-center align-middle">
                          {isWeekend ? (
                            <span className="text-[11px] text-slate-400 italic">Libur</span>
                          ) : empShift ? (
                            <div
                              className="p-2 rounded-xl text-xs font-semibold shadow-xs"
                              style={{
                                backgroundColor: `${shiftColor}20`,
                                color: shiftColor,
                                border: `1px solid ${shiftColor}50`
                              }}
                            >
                              <div className="font-bold truncate">{empShift.shift_name}</div>
                              <div className="text-[10px] opacity-80">
                                {empShift.start_time?.slice(0, 5)} - {empShift.end_time?.slice(0, 5)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Assign Shift */}
      <Modal
        isOpen={isAssignModal}
        onClose={() => setIsAssignModal(false)}
        title="Tetapkan Shift Karyawan"
        description="Pilih karyawan dan template jam kerja shift"
      >
        <form onSubmit={handleAssignShift} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold block mb-1">Pilih Karyawan</label>
            <select
              value={form.employee_id}
              onChange={e => setForm({ ...form, employee_id: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.position_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Template Shift</label>
            <select
              value={form.shift_template_id}
              onChange={e => setForm({ ...form, shift_template_id: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Lokasi Penugasan</label>
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
            <label className="text-xs font-semibold block mb-1">Tanggal Mulai Berlaku</label>
            <input
              type="date"
              value={form.effective_date}
              onChange={e => setForm({ ...form, effective_date: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAssignModal(false)}>
              Batal
            </Button>
            <Button variant="brand" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Plot Shift'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
