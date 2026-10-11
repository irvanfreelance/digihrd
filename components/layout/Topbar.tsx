'use client'

import * as React from 'react'
import { Bell, Sun, Moon, ShieldCheck } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'

interface TopbarProps {
  companyName?: string
  logoUrl?: string
}

export function Topbar({ companyName = 'PT Pucuk Singkong Sejahtera', logoUrl }: TopbarProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs transition-colors">
      <div className="flex items-center space-x-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          Akses HR Admin (Mode Tanpa Login Aktif)
        </span>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Toggle Dark / Light Mode */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title={`Ganti ke mode ${theme === 'light' ? 'Gelap (Dark)' : 'Terang (Light)'}`}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span className="hidden md:inline font-semibold">Mode Gelap</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline font-semibold">Mode Terang</span>
            </>
          )}
        </button>

        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-medium text-slate-400">Tenant Perusahaan</p>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{companyName}</p>
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />

        <button className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-primary,#1D4ED8)] ring-2 ring-white dark:ring-slate-900" />
        </button>
      </div>
    </header>
  )
}
