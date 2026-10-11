'use client'

import * as React from 'react'
import {
  Palette,
  Save,
  CheckCircle2,
  Building2,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function BrandingSettingsPage() {
  const [config, setConfig] = React.useState<any>(null)
  const [name, setName] = React.useState('')
  const [logoUrl, setLogoUrl] = React.useState('/pucuk-singkong.png')
  const [primaryColor, setPrimaryColor] = React.useState('#1D4ED8')
  const [secondaryColor, setSecondaryColor] = React.useState('#7E3AF2')
  const [sidebarColor, setSidebarColor] = React.useState('#0F172A')
  const [sidebarTextColor, setSidebarTextColor] = React.useState('#FFFFFF')
  const [slipHeaderColor, setSlipHeaderColor] = React.useState('#1D4ED8')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [savedSuccess, setSavedSuccess] = React.useState(false)

  React.useEffect(() => {
    async function loadConfig() {
      setLoading(true)
      try {
        const res = await fetch('/api/app-config')
        const json = await res.json()
        if (json.data) {
          setConfig(json.data)
          setName(json.data.name || '')
          setLogoUrl(json.data.logo_url || '/pucuk-singkong.png')
          setPrimaryColor(json.data.primary_color || '#1D4ED8')
          setSecondaryColor(json.data.secondary_color || '#7E3AF2')
          setSidebarColor(json.data.sidebar_color || '#0F172A')
          setSidebarTextColor(json.data.sidebar_text_color || '#FFFFFF')
          setSlipHeaderColor(json.data.slip_header_color || '#1D4ED8')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSavedSuccess(false)
    try {
      const res = await fetch('/api/app-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          sidebar_color: sidebarColor,
          sidebar_text_color: sidebarTextColor,
          slip_header_color: slipHeaderColor
        })
      })

      if (res.ok) {
        setSavedSuccess(true)
        // Update CSS variables di client secara realtime
        document.documentElement.style.setProperty('--color-primary', primaryColor)
        document.documentElement.style.setProperty('--color-secondary', secondaryColor)
        document.documentElement.style.setProperty('--sidebar-color', sidebarColor)
        document.documentElement.style.setProperty('--sidebar-text-color', sidebarTextColor)
        document.documentElement.style.setProperty('--slip-header-color', slipHeaderColor)
        setTimeout(() => setSavedSuccess(false), 3000)
      } else {
        alert('Gagal menyimpan konfigurasi branding')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat konfigurasi branding...</div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
          Pengaturan Branding Perusahaan & Tampilan
        </h1>
        <p className="text-sm text-slate-500">
          Ubah logo, warna tema sidebar, skema warna brand, dan header slip gaji secara dinamis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Form Editor */}
        <div className="md:col-span-7">
          <form onSubmit={handleSave} className="space-y-5">
            <Card className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Nama Perusahaan / Entitas Legal</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">URL Logo Perusahaan (Dinamis)</label>
                <input
                  type="text"
                  required
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="/pucuk-singkong.png atau URL eksternal https://..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Logo akan ditampilkan otomatis di pojok kiri atas sidebar dan kop slip gaji.</p>
              </div>

              {/* Warna Sidebar Kustom */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold block text-blue-600 dark:text-blue-400">
                  Pengaturan Warna Sidebar Dinamis
                </span>

                <div>
                  <label className="text-xs font-semibold block mb-1">Warna Background Sidebar</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={sidebarColor}
                      onChange={e => setSidebarColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={sidebarColor}
                      onChange={e => setSidebarColor(e.target.value)}
                      className="w-32 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-mono bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-400">Contoh: #0F172A (Navy) atau #1E293B</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Warna Teks Menu Sidebar</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={sidebarTextColor}
                      onChange={e => setSidebarTextColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={sidebarTextColor}
                      onChange={e => setSidebarTextColor(e.target.value)}
                      className="w-32 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-mono bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-400">Bawaan: #FFFFFF</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Warna Aksen Primer Brand (--color-primary)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-32 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-mono bg-white dark:bg-slate-900"
                  />
                  <span className="text-xs text-slate-400">Tombol aksi, menu aktif, link</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Warna Kop Slip Gaji (--slip-header-color)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={slipHeaderColor}
                    onChange={e => setSlipHeaderColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={slipHeaderColor}
                    onChange={e => setSlipHeaderColor(e.target.value)}
                    className="w-32 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-mono bg-white dark:bg-slate-900"
                  />
                  <span className="text-xs text-slate-400">Warna header cetak slip gaji</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {savedSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Berhasil disimpan & tema terupdate!
                  </span>
                )}
                <div className="ml-auto">
                  <Button variant="brand" type="submit" disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="md:col-span-5 space-y-4">
          <Card className="p-6">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Live Preview Visual Sidebar & Branding
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 pt-2">
              {/* Preview Sidebar Kustom */}
              <div
                className="p-4 rounded-xl border border-white/20 shadow-md transition-colors"
                style={{ backgroundColor: sidebarColor, color: sidebarTextColor }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Preview Logo"
                      className="w-9 h-9 rounded-lg object-contain bg-white/10 p-1"
                      onError={e => { (e.target as HTMLElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
                      🌱
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{name || 'Nama Perusahaan'}</p>
                    <p className="text-[10px] opacity-70">Pratinjau Sidebar</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div
                    className="p-2 rounded-lg text-white font-semibold flex items-center justify-between"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>Menu Aktif</span>
                    <span>✓</span>
                  </div>
                  <div className="p-2 rounded-lg opacity-70">
                    Menu Tidak Aktif
                  </div>
                </div>
              </div>

              {/* Preview Kop Slip Gaji */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[11px] font-bold block mb-1 text-slate-500">Pratinjau Kop Slip Gaji:</span>
                <p
                  className="font-black text-base uppercase font-heading tracking-wide"
                  style={{ color: slipHeaderColor }}
                >
                  {name || 'Nama Perusahaan'}
                </p>
                <p className="text-[10px] text-slate-400">SLIP GAJI RESMI KARYAWAN</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
