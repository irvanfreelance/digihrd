'use client'

import * as React from 'react'
import {
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'

export default function AttendanceReportsPage() {
  const [data, setData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadReport() {
      setLoading(true)
      try {
        const res = await fetch('/api/reports/attendance')
        const json = await res.json()
        setData(json.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [])

  const departmentOptions = React.useMemo(() => {
    const set = new Set(data.map(d => d.department_name).filter(Boolean))
    return Array.from(set).map(dept => ({ label: dept, value: dept }))
  }, [data])

  const statusOptions = [
    { label: 'Hadir', value: 'present' },
    { label: 'Terlambat', value: 'late' },
    { label: 'Absen', value: 'absent' }
  ]

  const filters: FilterOption[] = [
    { key: 'department_name', label: 'Departemen', options: departmentOptions },
    { key: 'status', label: 'Status', options: statusOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'attendance_date',
      header: 'Tanggal',
      render: (r) => <span className="font-semibold text-xs font-mono">{r.attendance_date}</span>
    },
    {
      key: 'employee_number',
      header: 'NIK',
      render: (r) => <span className="text-xs font-mono">{r.employee_number}</span>
    },
    {
      key: 'full_name',
      header: 'Nama Karyawan',
      render: (r) => <span className="font-bold text-sm text-slate-900 dark:text-white">{r.full_name}</span>
    },
    {
      key: 'department_name',
      header: 'Departemen',
      render: (r) => <span className="text-xs">{r.department_name}</span>
    },
    {
      key: 'location_name',
      header: 'Lokasi Kerja',
      render: (r) => <span className="text-xs text-slate-500">{r.location_name || '-'}</span>
    },
    {
      key: 'hours',
      header: 'Jam Masuk / Keluar',
      render: (r) => (
        <span className="text-xs font-mono">
          {r.clock_in_at ? new Date(r.clock_in_at).toLocaleTimeString('id-ID') : '-'} s/d{' '}
          {r.clock_out_at ? new Date(r.clock_out_at).toLocaleTimeString('id-ID') : '-'}
        </span>
      )
    },
    {
      key: 'late_minutes',
      header: 'Keterlambatan',
      render: (r) => (
        r.late_minutes > 0 ? (
          <span className="text-xs font-semibold text-amber-600">+{r.late_minutes} mnt</span>
        ) : (
          <span className="text-xs text-emerald-600">On-time</span>
        )
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge
          variant={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : 'destructive'}
          className="text-xs capitalize"
        >
          {r.status}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Laporan Rekapitulasi Absensi & Jam Kerja
          </h1>
          <p className="text-sm text-slate-500">
            Export data absensi periodik ke format file Microsoft Excel (.xlsx)
          </p>
        </div>
        <a href="/api/reports/attendance?format=xlsx" download="rekap-absensi.xlsx">
          <Button variant="brand" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4" />
            Download Excel Spreadsheet (.xlsx)
          </Button>
        </a>
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Cari nama, NIK, lokasi, departemen..."
        searchKeys={['full_name', 'employee_number', 'department_name', 'location_name', 'status']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        showRowNumber={true}
        loading={loading}
      />
    </div>
  )
}
