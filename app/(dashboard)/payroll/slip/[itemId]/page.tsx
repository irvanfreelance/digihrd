'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import {
  Printer,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  QrCode
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatIDR, terbilang } from '@/lib/utils/currency'

export default function SlipGajiPage() {
  const params = useParams()
  const itemId = params.itemId

  const [item, setItem] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadSlip() {
      setLoading(true)
      try {
        const res = await fetch(`/api/payroll-items/${itemId}`)
        const json = await res.json()
        setItem(json.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadSlip()
  }, [itemId])

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat slip gaji...</div>
  if (!item) return <div className="p-8 text-center text-red-500">Slip gaji tidak ditemukan.</div>

  const earnings = (item.details || []).filter((d: any) => d.component_type.startsWith('earning'))
  const deductions = (item.details || []).filter((d: any) =>
    d.component_type.startsWith('deduction') || d.component_type === 'bpjs' || d.component_type === 'tax'
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 print:hidden">
        <Link href={`/payroll/run/${item.payroll_run_id}`}>
          <Button variant="outline" size="sm" className="gap-1 w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Item
          </Button>
        </Link>
        <Button variant="brand" onClick={handlePrint} className="gap-2 w-full sm:w-auto">
          <Printer className="w-4 h-4" />
          Cetak / Download PDF Slip
        </Button>
      </div>

      {/* Tampilan Fisik Slip Gaji Responsif */}
      <Card className="p-4 sm:p-8 border-2 border-slate-200 dark:border-slate-800 bg-white text-slate-900 shadow-xl print:shadow-none print:border-none">
        {/* Header Perusahaan */}
        <div className="border-b-2 border-slate-900 pb-4 sm:pb-5 mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <h2 className="text-base sm:text-xl font-black uppercase tracking-wide text-[var(--slip-header-color,#1D4ED8)] font-heading">
                {item.company_name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Jl. Industri No. 12 Cimahi - Jawa Barat • HR & Payroll System
            </p>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-base sm:text-lg font-black uppercase text-slate-800 font-heading">
              SLIP GAJI KARYAWAN
            </h1>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              Periode: {item.period_label}
            </p>
          </div>
        </div>

        {/* Informasi Karyawan (1 kolom di mobile, 2 kolom di tablet/desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs pb-5 sm:pb-6 border-b border-slate-200 mb-5 sm:mb-6">
          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-32 text-slate-500">NIK / ID Karyawan:</span>
              <span className="font-bold">{item.employee_number}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500">Nama Lengkap:</span>
              <span className="font-bold text-sm">{item.employee_name}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500">Departemen:</span>
              <span className="font-medium">{item.department_name}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500">Jabatan:</span>
              <span className="font-medium">{item.position_name}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-32 text-slate-500">Tipe Penggajian:</span>
              <span className="font-bold uppercase">{item.payroll_type}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500">Rekening Bank:</span>
              <span className="font-medium">{item.bank_name} - {item.bank_account_number || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500">Rekap Kehadiran:</span>
              <span className="font-medium">{item.present_days} hari hadir / {item.late_count}x telat</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500">Total Jam Kerja:</span>
              <span className="font-medium">{item.total_work_hours} jam</span>
            </div>
          </div>
        </div>

        {/* Tabel Komponen Earning & Deduction (1 kolom di mobile, 2 kolom di desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-xs mb-6">
          {/* Penerimaan */}
          <div>
            <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1.5 mb-2 uppercase tracking-wider text-[11px]">
              A. PENERIMAAN (EARNINGS)
            </h4>
            <div className="space-y-2">
              {earnings.map((e: any) => (
                <div key={e.id} className="flex justify-between items-center">
                  <span className="text-slate-700">{e.component_name}</span>
                  <span className="font-semibold">{formatIDR(Number(e.amount))}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-300 mt-4 pt-2 flex justify-between font-bold text-slate-900">
              <span>TOTAL PENERIMAAN (GROSS)</span>
              <span>{formatIDR(Number(item.total_earnings))}</span>
            </div>
          </div>

          {/* Potongan */}
          <div>
            <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1.5 mb-2 uppercase tracking-wider text-[11px]">
              B. POTONGAN (DEDUCTIONS)
            </h4>
            <div className="space-y-2">
              {deductions.map((d: any) => (
                <div key={d.id} className="flex justify-between items-center text-red-700">
                  <span>{d.component_name}</span>
                  <span className="font-semibold">-{formatIDR(Number(d.amount))}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-300 mt-4 pt-2 flex justify-between font-bold text-red-700">
              <span>TOTAL POTONGAN</span>
              <span>-{formatIDR(Number(item.total_deductions))}</span>
            </div>
          </div>
        </div>

        {/* Take Home Pay */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              GAJI BERSIH YANG DITERIMA (TAKE HOME PAY)
            </span>
            <p className="text-[11px] text-slate-500 italic mt-0.5">
              Terbilang: #{terbilang(Number(item.net_salary))} Rupiah#
            </p>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 font-heading">
            {formatIDR(Number(item.net_salary))}
          </div>
        </div>

        {/* Tanda Tangan & QR Verification */}
        <div className="pt-5 sm:pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-8 sm:mb-12">Penerima,</p>
            <p className="font-bold underline">{item.employee_name}</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="p-2 border border-slate-300 rounded-lg bg-white shadow-sm inline-block">
              <QrCode className="w-14 h-14 sm:w-16 sm:h-16 text-slate-800" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-mono">VERIFIKASI RESMI</span>
          </div>
          <div>
            <p className="text-slate-500 mb-8 sm:mb-12">Bagian Keuangan & HRD,</p>
            <p className="font-bold underline">Nining Ratnasari (HR Admin)</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
