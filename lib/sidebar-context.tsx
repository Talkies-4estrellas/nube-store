'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

type SidebarCtx = {
  open: boolean
  toggle: () => void
  close: () => void
  isMobile: boolean
}

const Ctx = createContext<SidebarCtx>({
  open: false, toggle: () => {}, close: () => {}, isMobile: false,
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Cierra el sidebar al navegar en mobile
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <Ctx.Provider value={{ open, toggle: () => setOpen(v => !v), close: () => setOpen(false), isMobile }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSidebar = () => useContext(Ctx)
