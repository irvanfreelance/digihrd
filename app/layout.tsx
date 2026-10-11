import type { Metadata } from 'next'
import { Cabin, Albert_Sans } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'

const cabin = Cabin({
  subsets: ['latin'],
  variable: '--font-cabin',
  display: 'swap',
})

const albertSans = Albert_Sans({
  subsets: ['latin'],
  variable: '--font-albert-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sistem HRD Absensi & Payroll - PT Pucuk Singkong Sejahtera',
  description: 'Portal manajemen absensi geolokasi dan payroll otomatis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${cabin.variable} ${albertSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('app-theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased font-body min-h-screen transition-colors duration-150">
        {children}
      </body>
    </html>
  )
}
