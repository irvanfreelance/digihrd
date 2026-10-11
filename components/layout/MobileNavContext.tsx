'use client'

import * as React from 'react'

interface MobileNavContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const MobileNavContext = React.createContext<MobileNavContextType | undefined>(undefined)

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])

  return (
    <MobileNavContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav() {
  const ctx = React.useContext(MobileNavContext)
  if (!ctx) {
    throw new Error('useMobileNav must be used within MobileNavProvider')
  }
  return ctx
}
