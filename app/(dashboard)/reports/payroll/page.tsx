'use client'

import * as React from 'react'
import {
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'
import { formatIDR } from '@/lib/utils/currency'

export default function PayrollReportsPage() {
  const [data, setData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadReport() {
      setLoading(true)
      try {
        const res = await fetch('/api/reports/payroll')
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

  const periodOptions = React.useMemo(() => {
    const set = new Set(data.map(d => d.period_label).filter(Boolean))
    return Array.from(set).map(p => ({ label: p, value: p }))
  }, [data])

  const typeOptions = [
    { label: 'Bulanan (Monthly)', value: 'monthly' },
    { label: 'Per Jam (Hourly)', value: 'hourly' }
  ]

  const filters: FilterOption[] = [
    { key: 'period_label', label: 'Periode', options: periodOptions },
    { key: 'payroll_type', label: 'Skema Gaji', options: typeOptions }
  ]

  const columns: Column<any>[] = [
    {
      key: 'period_label',
      header: 'Periode',
      render: (r) => <span className="font-semibold text-xs whitespace-nowrap">{r.period_label}</span>
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
      key: 'position_name',
      header: 'Jabatan',
      render: (r) => <span className="text-xs">{r.position_name}</span>
    },
    {
      key: 'present_days',
      header: 'Hari Hadir',
      render: (r) => <span className="text-xs font-semibold">{r.present_days} Hari</span>
    },
    {
      key: 'total_earnings',
      header: 'Penghasilan Bruto',
      render: (r) => (
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          {formatIDR(Number(r.total_earnings))}
        </span>
      )
    },
    {
      key: 'total_deductions',
      header: 'Potongan',
      render: (r) => (
        <span className="text-xs font-semibold text-red-600">
          -{formatIDR(Number(r.total_deductions))}
        </span>
      )
    },
    {
      key: 'total_bpjs_employee',
      header: 'BPJS Kar',
      render: (r) => <span className="text-xs text-slate-600 dark:text-slate-400">{formatIDR(Number(r.total_bpjs_employee))}</span>
    },
    {
      key: 'pph21',
      header: 'PPh 21',
      render: (r) => <span className="text-xs text-slate-600 dark:text-slate-400">{formatIDR(Number(r.pph21))}</span>
    },
    {
      key: 'net_salary',
      header: 'Gaji Bersih (Net)',
      render: (r) => (
        <span className="text-xs font-black text-emerald-600">
          {formatIDR(Number(r.net_salary))}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Laporan Rekapitulasi Penggajian & PPh 21
          </h1>
          <p className="text-sm text-slate-500">
            Export data gaji kotor, potongan BPJS, PPh21, dan gaji bersih ke file Microsoft Excel (.xlsx)
          </p>
        </div>
        <a href="/api/reports/payroll?format=xlsx" download="laporan-payroll.xlsx">
          <Button variant="brand" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4" />
            Download Excel Spreadsheet (.xlsx)
          </Button>
        </a>
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Cari nama karyawan, NIK, jabatan, periode..."
        searchKeys={['full_name', 'employee_number', 'position_name', 'period_label']}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        showRowNumber={true}
        loading={loading}
      />
    </div>
  )
}
