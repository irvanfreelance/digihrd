'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

// Import dynamic tanpa SSR untuk menghindari window is not defined dari leaflet
const DynamicLeafletMap = dynamic(
  () => import('./DynamicLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse text-sm text-slate-500">
        Memuat Peta OpenStreetMap (Leaflet)...
      </div>
    )
  }
)

export interface LeafletMapProps {
  center: [number, number]
  zoom?: number
  markers?: Array<{
    lat: number
    lng: number
    title: string
    radius?: number
  }>
  onLocationSelect?: (lat: number, lng: number) => void
  userLocation?: [number, number] | null
}

export function LeafletMap(props: LeafletMapProps) {
  return <DynamicLeafletMap {...props} />
}
