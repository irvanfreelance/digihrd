'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Banknote,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatIDR } from '@/lib/utils/currency'

export default function PayrollRunDetailPage() {
  const params = useParams()
  const router = useRouter()
  const runId = params.runId

  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const loadDetail = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll-runs/${runId}`)
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadDetail()
  }, [runId])

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`Ubah status lifecycle payroll menjadi: "${newStatus}"?`)) return
    try {
      const res = await fetch(`/api/payroll-runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        loadDetail()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat rincian payroll run...</div>
  }

  const run = data?.run
  const items = data?.items || []

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <Link href="/payroll">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Rincian Payroll: {run?.period_label}
          </h1>
          <p className="text-xs text-slate-500">
            Lifecycle: <strong className="uppercase text-blue-600">{run?.status}</strong> • Dibuat oleh: {run?.generated_by_name}
          </p>
        </div>
      </div>

      {/* Approval Lifecycle Action Bar */}
      <Card className="p-4 bg-slate-50 dark:bg-slate-900 border-dashed">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Alur Persetujuan (Workflow):</span>
            <Badge variant="outline" className="text-xs uppercase font-bold">
              {run?.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {run?.status === 'calculated' && (
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('reviewed')}>
                Tandai Sudah Direview (Reviewed)
              </Button>
            )}
            {run?.status === 'reviewed' && (
              <Button size="sm" variant="brand" onClick={() => handleUpdateStatus('approved')}>
                Approve Payroll (Disetujui)
              </Button>
            )}
            {run?.status === 'approved' && (
              <Button size="sm" variant="brand" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus('paid')}>
                Tandai Selesai Dibayarkan (Mark Paid)
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Penghasilan Bruto</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatIDR(Number(run?.total_gross || 0))}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Potongan (Absen/Telat/Pajak)</p>
          <p className="text-xl font-black text-red-600 mt-1">
            -{formatIDR(Number(run?.total_deductions || 0))}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Transfer Netto</p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {formatIDR(Number(run?.total_net || 0))}
          </p>
        </Card>
      </div>

      {/* Tabel Rincian per Karyawan */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NIK</TableHead>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Jabatan / Tipe</TableHead>
              <TableHead>Hadir / Telat</TableHead>
              <TableHead>Gaji Pokok</TableHead>
              <TableHead>Penghasilan</TableHead>
              <TableHead>Potongan</TableHead>
              <TableHead>Gaji Bersih (Net)</TableHead>
              <TableHead className="text-right">Slip Gaji</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it: any) => (
              <TableRow key={it.id}>
                <TableCell className="font-semibold text-xs">{it.employee_number}</TableCell>
                <TableCell className="font-bold text-slate-900 dark:text-white text-sm">
                  {it.employee_name}
                </TableCell>
                <TableCell className="text-xs">
                  <div>{it.position_name}</div>
                  <Badge variant="outline" className="text-[10px] uppercase">{it.payroll_type}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  <div>{it.present_days} hr hadir</div>
                  {it.late_count > 0 && <span className="text-amber-600">({it.late_count}x telat)</span>}
                </TableCell>
                <TableCell className="text-xs font-medium">{formatIDR(Number(it.base_salary))}</TableCell>
                <TableCell className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatIDR(Number(it.total_earnings))}
                </TableCell>
                <TableCell className="text-xs font-semibold text-red-600">
                  -{formatIDR(Number(it.total_deductions))}
                </TableCell>
                <TableCell className="text-xs font-black text-emerald-600">
                  {formatIDR(Number(it.net_salary))}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/payroll/slip/${it.id}`}>
                    <Button size="sm" variant="outline" className="gap-1 text-xs">
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      Lihat Slip
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
