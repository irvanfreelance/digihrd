'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  Users,
  MapPin,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  Banknote,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
  Building2,
  FileCheck2,
  PieChart
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

const navSections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Manajemen Operasional',
    items: [
      { title: 'Absensi & Geolocation', href: '/attendance', icon: Clock },
      { title: 'Clock-In / Out', href: '/attendance/clock', icon: CalendarCheck },
      { title: 'Jadwal & Shift', href: '/shifts/schedule', icon: CalendarDays },
      { title: 'Izin & Cuti', href: '/leave', icon: FileCheck2 },
      { title: 'Permohonan Lembur', href: '/overtime', icon: FileSpreadsheet },
    ]
  },
  {
    title: 'Payroll & Penggajian',
    items: [
      { title: 'Payroll Runs', href: '/payroll', icon: Banknote },
      { title: 'Komponen Gaji', href: '/settings/salary-components', icon: PieChart },
    ]
  },
  {
    title: 'Data & Karyawan',
    items: [
      { title: 'Daftar Karyawan', href: '/employees', icon: Users },
      { title: 'Master Lokasi (GPS)', href: '/settings/locations', icon: MapPin },
      { title: 'Aturan Keterlambatan', href: '/settings/late-rules', icon: ShieldCheck },
    ]
  },
  {
    title: 'Laporan & Pengaturan',
    items: [
      { title: 'Laporan Absensi', href: '/reports/attendance', icon: FileSpreadsheet },
      { title: 'Laporan Payroll', href: '/reports/payroll', icon: Banknote },
      { title: 'Pengaturan Branding', href: '/settings/app', icon: Settings },
    ]
  }
]

interface SidebarProps {
  companyName?: string
  logoUrl?: string
  sidebarBg?: string
  sidebarFg?: string
}

export function Sidebar({
  companyName = 'PT Pucuk Singkong Sejahtera',
  logoUrl = '/pucuk-singkong.png',
  sidebarBg,
  sidebarFg
}: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  // Menggunakan style inline untuk menjamin warna kustom dari brand settings
  const sidebarStyle: React.CSSProperties = {
    backgroundColor: sidebarBg || 'var(--sidebar-color, #0F172A)',
    color: sidebarFg || 'var(--sidebar-text-color, #FFFFFF)'
  }

  return (
    <aside
      style={sidebarStyle}
      className={cn(
        "h-screen sticky top-0 transition-all duration-300 flex flex-col z-40 select-none shadow-xl border-r border-white/10",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header dengan Logo Dinamis */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center space-x-3 overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 shrink-0"
              onError={(e) => {
                // fallback jika gambar gagal load
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary,#1D4ED8)] flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              🌱
            </div>
          )}

          {!collapsed && (
            <div className="leading-tight min-w-0">
              <h2 className="font-bold text-sm truncate font-heading">
                {companyName}
              </h2>
              <span className="text-xs opacity-70 font-medium">HR Portal</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {sec.title && !collapsed && (
              <p className="px-3 text-[11px] font-semibold opacity-50 uppercase tracking-wider mb-2">
                {sec.title}
              </p>
            )}
            {sec.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                    isActive
                      ? "bg-[var(--color-primary,#1D4ED8)] text-white shadow-md font-semibold"
                      : "opacity-80 hover:opacity-100 hover:bg-white/10"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "opacity-80 group-hover:opacity-100")} />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom Profile (Admin HR tanpa login indicator) */}
      <div className="p-3 border-t border-white/10">
        <div className={cn("flex items-center space-x-3 p-2 rounded-xl bg-white/10", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary,#1D4ED8)] text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-xs">
            NR
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">
                Nining Ratnasari
              </p>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <p className="text-[11px] opacity-70 capitalize">HR Admin (Active)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
