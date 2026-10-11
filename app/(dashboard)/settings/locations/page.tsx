'use client'

import * as React from 'react'
import {
  MapPin,
  Plus,
  Trash2,
  Edit,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column, FilterOption } from '@/components/ui/DataTable'
import { LeafletMap } from '@/components/maps/LeafletMap'

export default function LocationsSettingsPage() {
  const [locations, setLocations] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table')

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<number | null>(null)

  // Map Selected Location for Form
  const [form, setForm] = React.useState({
    name: '',
    address: '',
    latitude: -6.9175,
    longitude: 107.6191,
    radius_meter: 100,
    allow_outside_with_reason: true,
    max_outside_tolerance_count: 3,
    require_photo: false
  })
  const [submitting, setSubmitting] = React.useState(false)

  const loadLocations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/locations')
      const json = await res.json()
      setLocations(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadLocations()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm({
      name: '',
      address: '',
      latitude: -6.9175,
      longitude: 107.6191,
      radius_meter: 100,
      allow_outside_with_reason: true,
      max_outside_tolerance_count: 3,
      require_photo: false
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (loc: any) => {
    setEditingId(loc.id)
    setForm({
      name: loc.name || '',
      address: loc.address || '',
      latitude: Number(loc.latitude) || -6.9175,
      longitude: Number(loc.longitude) || 107.6191,
      radius_meter: Number(loc.radius_meter) || 100,
      allow_outside_with_reason: Boolean(loc.allow_outside_with_reason),
      max_outside_tolerance_count: Number(loc.max_outside_tolerance_count) || 3,
      require_photo: Boolean(loc.require_photo)
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingId ? `/api/locations/${editingId}` : '/api/locations'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        setIsModalOpen(false)
        setEditingId(null)
        loadLocations()
      } else {
        alert(`Gagal ${editingId ? 'mengedit' : 'menambah'} lokasi`)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus lokasi ${name}?`)) return
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadLocations()
      } else {
        alert('Gagal menghapus lokasi')
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Nama Lokasi / Kantor',
      render: (loc) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">{loc.name}</div>
          <div className="text-xs text-slate-400 truncate max-w-xs">{loc.address || '-'}</div>
        </div>
      )
    },
    {
      key: 'coordinates',
      header: 'Koordinat GPS',
      render: (loc) => (
        <span className="text-xs font-mono font-medium">
          {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
        </span>
      )
    },
    {
      key: 'radius_meter',
      header: 'Radius Geofence',
      render: (loc) => (
        <Badge variant="outline" className="text-xs font-mono font-bold">
          {loc.radius_meter} Meter
        </Badge>
      )
    },
    {
      key: 'allow_outside',
      header: 'Izin Luar Radius',
      render: (loc) => (
        loc.allow_outside_with_reason ? (
          <Badge variant="success" className="text-[10px]">Diizinkan (Catatan)</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">Dilarang Keras</Badge>
        )
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (loc) => (
        <div className="space-x-1 whitespace-nowrap">
          <Button
            size="sm"
            variant="ghost"
            className="p-1.5 text-blue-600 dark:text-blue-400"
            title="Edit Lokasi"
            onClick={() => handleOpenEdit(loc)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="p-1.5 text-red-600 dark:text-red-400"
            title="Hapus Lokasi"
            onClick={() => handleDelete(loc.id, loc.name)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
            Master Lokasi & Geofence GPS
          </h1>
          <p className="text-sm text-slate-500">
            Kelola titik koordinat kantor, pabrik, outlet, dan radius toleransi absensi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabel
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Peta Kartu
            </button>
          </div>

          <Button variant="brand" className="gap-2" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Tambah Lokasi Baru
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={locations}
          columns={columns}
          searchPlaceholder="Cari nama lokasi, alamat..."
          searchKeys={['name', 'address']}
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          showRowNumber={true}
          loading={loading}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locations.map((loc) => (
            <Card key={loc.id} className="overflow-hidden flex flex-col justify-between">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                      {loc.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{loc.address}</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-bold">
                    Radius: {loc.radius_meter}m
                  </Badge>
                </div>

                {/* Peta Mini Leaflet OSM */}
                <div className="h-48 w-full mt-4 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
                  <LeafletMap
                    center={[Number(loc.latitude), Number(loc.longitude)]}
                    zoom={16}
                    markers={[{
                      lat: Number(loc.latitude),
                      lng: Number(loc.longitude),
                      title: loc.name,
                      radius: loc.radius_meter
                    }]}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div>
                    Koordinat: <strong>{Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</strong>
                  </div>
                  <div>
                    Luar Radius: <strong>{loc.allow_outside_with_reason ? 'Diizinkan (Catatan)' : 'Dilarang'}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => handleOpenEdit(loc)}
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Lokasi
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 gap-1 text-xs"
                  onClick={() => handleDelete(loc.id, loc.name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Lokasi dengan Map Picker */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Lokasi Geofence' : 'Tambah Lokasi Geofence Baru'}
        description="Klik pada peta di bawah ini untuk memperbarui titik koordinat GPS"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold block mb-1">Nama Lokasi / Cabang *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Outlet Cabang Dago"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Alamat Lengkap</label>
            <input
              type="text"
              placeholder="Jl. Ir. H. Juanda No. 77 Bandung"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
            />
          </div>

          {/* Map Picker */}
          <div>
            <span className="text-xs font-semibold block mb-1 text-blue-600 dark:text-blue-400">
              📍 Klik pada peta di bawah ini untuk menentukan titik koordinat:
            </span>
            <div className="h-56 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <LeafletMap
                center={[form.latitude, form.longitude]}
                zoom={15}
                markers={[{
                  lat: form.latitude,
                  lng: form.longitude,
                  title: form.name || 'Titik Terpilih',
                  radius: form.radius_meter
                }]}
                onLocationSelect={(lat, lng) => {
                  setForm({ ...form, latitude: lat, longitude: lng })
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Radius Toleransi (Meter)</label>
              <input
                type="number"
                value={form.radius_meter}
                onChange={e => setForm({ ...form, radius_meter: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allow_outside_with_reason}
                  onChange={e => setForm({ ...form, allow_outside_with_reason: e.target.checked })}
                  className="rounded border-slate-300 w-4 h-4 text-blue-600"
                />
                Izinkan Absen Luar Radius (Alasan Khusus)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="brand" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Lokasi' : 'Simpan Lokasi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
