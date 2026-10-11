import { neon } from '@neondatabase/serverless'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { MobileNavProvider } from '@/components/layout/MobileNavContext'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Inject CSS vars & branding dari tenants WHERE id = 1
  let companyName = 'PT Pucuk Singkong Sejahtera'
  let logoUrl = '/pucuk-singkong.png'
  let primaryColor = '#1D4ED8'
  let secondaryColor = '#7E3AF2'
  let sidebarColor = '#0F172A'
  let sidebarTextColor = '#FFFFFF'
  let slipHeaderColor = '#1D4ED8'

  try {
    const [cfg] = await sql`
      SELECT name, logo_url, primary_color, secondary_color,
             sidebar_color, sidebar_text_color, slip_header_color
      FROM tenants
      WHERE id = 1
    `
    if (cfg) {
      companyName = cfg.name || companyName
      logoUrl = cfg.logo_url || logoUrl
      primaryColor = cfg.primary_color || primaryColor
      secondaryColor = cfg.secondary_color || secondaryColor
      sidebarColor = cfg.sidebar_color || sidebarColor
      sidebarTextColor = cfg.sidebar_text_color || sidebarTextColor
      slipHeaderColor = cfg.slip_header_color || slipHeaderColor
    }
  } catch (err) {
    // fallback
  }

  return (
    <ThemeProvider>
      <MobileNavProvider>
        <div className="flex min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
          {/* Dynamic CSS Branding Variables */}
          <style>{`
            :root {
              --color-primary: ${primaryColor};
              --color-secondary: ${secondaryColor};
              --slip-header-color: ${slipHeaderColor};
              --sidebar-color: ${sidebarColor};
              --sidebar-text-color: ${sidebarTextColor};
            }
          `}</style>

          <Sidebar
            companyName={companyName}
            logoUrl={logoUrl}
            sidebarBg={sidebarColor}
            sidebarFg={sidebarTextColor}
          />

          <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors">
            <Topbar companyName={companyName} logoUrl={logoUrl} />
            <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </MobileNavProvider>
    </ThemeProvider>
  )
}
