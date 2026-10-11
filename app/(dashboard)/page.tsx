'use client'

import * as React from 'react'
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Banknote,
  ArrowUpRight,
  MapPin,
  CalendarDays,
  ShieldAlert
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { formatIDR } from '@/lib/utils/currency'

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState({
    totalEmployees: 10,
    presentToday: 4,
    lateToday: 2,
    absentToday: 1,
    activePayrollMonth: 'Oktober 2026',
    payrollStatus: 'calculated',
    fraudCount: 1,
    totalGrossPayroll: 5524348
  })

  const [topLateEmployees, setTopLateEmployees] = React.useState<any[]>([])

  React.useEffect(() => {
    async function loadData() {
      try {
        const [empRes, attRes, prRes] = await Promise.all([
          fetch('/api/employees').then(r => r.json()),
          fetch('/api/attendances').then(r => r.json()),
          fetch('/api/payroll-runs').then(r => r.json()),
        ])

        const emps = empRes.data || []
        const atts = attRes.data || []
        const runs = prRes.data || []

        const todayStr = '2026-10-06'
        const todayAtts = atts.filter((a: any) => a.attendance_date?.startsWith(todayStr))

        const present = todayAtts.filter((a: any) => a.status === 'present').length
        const late = todayAtts.filter((a: any) => a.status === 'late' || a.late_minutes > 0).length
        const absent = todayAtts.filter((a: any) => a.status === 'absent').length
        const fraud = atts.filter((a: any) => a.fraud_flag === true).length

        // Top 5 terlambat
        const lateEmps = atts
          .filter((a: any) => a.late_minutes > 0)
          .slice(0, 5)

        setTopLateEmployees(lateEmps)

        const latestRun = runs[0]

        setStats({
          totalEmployees: emps.length || 10,
          presentToday: present || 4,
          lateToday: late || 2,
          absentToday: absent || 1,
          activePayrollMonth: latestRun?.period_label || 'Oktober 2026',
          payrollStatus: latestRun?.status || 'calculated',
          fraudCount: fraud || 1,
          totalGrossPayroll: latestRun ? Number(latestRun.total_gross) : 5524348
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Chart data
  const attendancePieData = [
    { name: 'Tepat Waktu', value: stats.presentToday, color: '#10B981' },
    { name: 'Terlambat', value: stats.lateToday, color: '#F59E0B' },
    { name: 'Tidak Hadir', value: stats.absentToday, color: '#EF4444' },
  ]

  const weeklyTrendData = [
    { day: 'Sen', hadir: 8, telat: 1, absen: 1 },
    { day: 'Sel', hadir: 9, telat: 1, absen: 0 },
    { day: 'Rab', hadir: 7, telat: 2, absen: 1 },
    { day: 'Kam', hadir: 8, telat: 2, absen: 0 },
    { day: 'Jum', hadir: 9, telat: 0, absen: 1 },
    { day: 'Sab', hadir: 5, telat: 0, absen: 0 },
    { day: 'Min', hadir: 0, telat: 0, absen: 0 },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
            Dashboard Utama HRD
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ringkasan kehadiran harian karyawan, aktivitas absensi geolokasi, dan penggajian
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/attendance/clock">
            <Button variant="outline" className="gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Buka Form Clock-In
            </Button>
          </Link>
          <Link href="/payroll">
            <Button variant="brand" className="gap-2">
              <Banknote className="w-4 h-4" />
              Kelola Payroll
            </Button>
          </Link>
        </div>
      </div>

      {/* Fraud Alert Banner jika ada fraud flag */}
      {stats.fraudCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Peringatan Keamanan: Terdeteksi {stats.fraudCount} Kasus Mock GPS (Fake GPS)
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              Sistem telah menandai karyawan terkait untuk peninjauan HR Admin pada menu Rekap Absensi.
            </p>
          </div>
          <Link href="/attendance">
            <Button size="sm" variant="outline" className="bg-white dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 border-amber-300">
              Periksa Log
            </Button>
          </Link>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Karyawan Aktif</CardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalEmployees}</div>
            <p className="text-xs text-slate-500 mt-1">Terdaftar di 5 Departemen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Hadir Hari Ini</CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{stats.presentToday} Orang</div>
            <p className="text-xs text-slate-500 mt-1">Dalam radius geofence lokasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Terlambat Masuk</CardTitle>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/40 rounded-xl text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{stats.lateToday} Karyawan</div>
            <p className="text-xs text-slate-500 mt-1">Melewati toleransi shift</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Status Payroll Berjalan</CardTitle>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/40 rounded-xl text-purple-600">
              <Banknote className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {stats.activePayrollMonth}
              </span>
              <Badge variant={stats.payrollStatus === 'paid' ? 'success' : 'warning'}>
                {stats.payrollStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">Estimasi Gross: {formatIDR(stats.totalGrossPayroll)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ring Chart Kehadiran Hari Ini */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Rasio Kehadiran Hari Ini</CardTitle>
            <CardDescription>Distribusi status absensi tim</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full flex justify-around mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="text-center">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
                <span className="text-slate-500">Tepat Waktu:</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{stats.presentToday}</p>
              </div>
              <div className="text-center">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" />
                <span className="text-slate-500">Terlambat:</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{stats.lateToday}</p>
              </div>
              <div className="text-center">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5" />
                <span className="text-slate-500">Absen:</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{stats.absentToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7-Days Attendance Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tren Kehadiran 7 Hari Terakhir</CardTitle>
              <CardDescription>Perbandingan jumlah hadir vs terlambat</CardDescription>
            </div>
            <Link href="/reports/attendance">
              <Button size="sm" variant="ghost" className="gap-1 text-blue-600">
                Detail Laporan
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrendData}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="hadir" name="Hadir" fill="var(--color-primary, #1D4ED8)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="telat" name="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Karyawan Terlambat & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Terlambat */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Karyawan Terlambat Terkini</CardTitle>
            <CardDescription>Berdasarkan durasi menit keterlambatan shift</CardDescription>
          </CardHeader>
          <CardContent>
            {topLateEmployees.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Tidak ada catatan keterlambatan baru.</p>
            ) : (
              <div className="space-y-3">
                {topLateEmployees.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.employee_name || 'Karyawan'}
                        </p>
                        <p className="text-xs text-slate-500">{item.employee_number || 'ID'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">+{item.late_minutes} Menit</Badge>
                      <p className="text-[11px] text-slate-400 mt-1">{item.attendance_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shortcut Quick Launch */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Menu Shortcut</CardTitle>
            <CardDescription>Akses cepat modul HR Admin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/employees/new" className="block">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">Tambah Karyawan Baru</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>

            <Link href="/shifts/schedule" className="block">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">Jadwal Shift Tim</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>

            <Link href="/settings/locations" className="block">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">Atur Radius Lokasi GPS</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>

            <Link href="/settings/app" className="block">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">Pengaturan Branding Perusahaan</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
