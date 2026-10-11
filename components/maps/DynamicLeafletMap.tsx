'use client'

import * as React from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { LeafletMapProps } from './LeafletMap'

// Fix default leaflet marker icon di Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const userIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function MapClickHandler({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export default function DynamicLeafletMap({
  center,
  zoom = 15,
  markers = [],
  onLocationSelect,
  userLocation
}: LeafletMapProps) {
  return (
    <div className="w-full h-full min-h-[350px] relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[350px]"
      >
        {/* OpenStreetMap Tile Layer (Tanpa API Key) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onLocationSelect={onLocationSelect} />

        {/* Markers Lokasi Kantor / Geofence */}
        {markers.map((m, idx) => (
          <React.Fragment key={idx}>
            <Marker position={[m.lat, m.lng]} icon={defaultIcon}>
              <Popup>
                <div className="text-xs">
                  <strong className="block text-sm">{m.title}</strong>
                  {m.radius && <span>Radius Absensi: {m.radius} meter</span>}
                </div>
              </Popup>
            </Marker>
            {m.radius && (
              <Circle
                center={[m.lat, m.lng]}
                radius={m.radius}
                pathOptions={{
                  color: '#1D4ED8',
                  fillColor: '#3B82F6',
                  fillOpacity: 0.2,
                }}
              />
            )}
          </React.Fragment>
        ))}

        {/* Marker Posisi Karyawan Sekarang */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-xs font-semibold text-emerald-700">
                Posisi Anda Saat Ini (GPS)
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
