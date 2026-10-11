# Technical Requirements Document (TRD)
## Sistem HRD — Absensi & Payroll
**Versi:** 1.1  
**Status:** Draft  
**Tanggal:** Oktober 2026  
**Referensi:** PRD v1.0 · ERD v1.0

---

## 1. Stack Teknologi

| Layer | Pilihan | Catatan |
|---|---|---|
| Framework | **Next.js 14 (App Router, SSR)** | Bukan SPA; page di-render server-side. `export const dynamic = 'force-dynamic'` pada page yang butuh data fresh |
| Deployment | **Vercel** | Region: sin1 (Singapore); Edge Config untuk app config |
| Database | **Neon PostgreSQL Serverless** | PostgreSQL 15+, PostGIS, pg_trgm; koneksi via `@neondatabase/serverless` |
| Query Layer | **Raw SQL di API route** | Semua SQL ditulis langsung di `app/api/{model}/route.ts`. Tidak ada file query terpisah, tidak ada ORM saat runtime |
| Migration & Seed | **Drizzle Kit** | Hanya untuk `drizzle-kit push` / `drizzle-kit migrate` dan seed idempotent. Drizzle **tidak dipakai** sebagai ORM maupun query builder di aplikasi |
| Storage | **Vercel Blob Storage** | Avatar, logo, foto selfie clock-in, slip gaji PDF |
| Auth | **NextAuth v4 (stable)** | Disiapkan sebagai dependency; **implementasi ditunda**. Sementara: custom JWT middleware |
| PDF | **@react-pdf/renderer** | Generate slip gaji server-side di API route |
| Excel | **xlsx (SheetJS)** | Export laporan `.xlsx` |
| Drag & Drop | **dnd-kit** | Penjadwalan shift (kalender drag-drop) |
| Charts | **Recharts** | Dashboard: kehadiran, payroll summary |
| Rich Text | **Tiptap** | Catatan koreksi absensi, keterangan lembur |
| Icon | **lucide-react** | Semua ikon — **kecuali** checklist yang memakai emoji ✅ |
| Font | **Cabin** (heading) · **Albert Sans** (body) | Diimport via `next/font/google`; tidak boleh dioverride |
| Styling | **Tailwind CSS** + CSS Variables | Branding dinamis via CSS custom properties yang di-inject dari DB |

---

## 2. Arsitektur: Single Tenant dengan Dinamisasi Config

Aplikasi ini adalah **single-tenant** — satu deployment melayani satu perusahaan. Tidak ada isolasi data antar tenant, tidak ada subdomain routing multi-tenant, tidak ada `tenant_id` sebagai filter query runtime.

**Dinamisasi** tetap ada: konfigurasi tampilan (logo, warna, nama perusahaan, font) dibaca dari tabel `tenants` di database dan di-inject sebagai CSS variables ke seluruh app. Perubahan config langsung berlaku tanpa redeploy.

```
Satu database → Satu perusahaan → Config bisa diubah dari UI settings
```

### Apa yang tetap dari ERD

Kolom `tenant_id` tetap ada di semua tabel (warisan dari ERD), namun:
- **Tidak digunakan sebagai filter query** — semua query tidak menyertakan `WHERE tenant_id = ?`
- Nilainya selalu `1` (seeded satu tenant)
- Kolom dibiarkan ada untuk kemungkinan upgrade ke multi-tenant di masa depan

---

## 3. Arsitektur Proyek (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
│
├── (dashboard)/
│   ├── layout.tsx                  # Shell: sidebar toggle + inject CSS vars dari DB
│   ├── page.tsx                    # Dashboard utama
│   │
│   ├── employees/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── salary/page.tsx
│   │   └── new/page.tsx
│   │
│   ├── attendance/
│   │   ├── page.tsx                # Rekap absensi (HR view)
│   │   ├── clock/page.tsx          # Clock-in/out (employee view)
│   │   └── [id]/page.tsx
│   │
│   ├── shifts/
│   │   ├── templates/page.tsx
│   │   ├── schedule/page.tsx       # Kalender drag-drop (dnd-kit)
│   │   └── swap/page.tsx
│   │
│   ├── leave/
│   │   ├── page.tsx
│   │   └── request/page.tsx
│   │
│   ├── overtime/
│   │   ├── page.tsx
│   │   └── request/page.tsx
│   │
│   ├── payroll/
│   │   ├── page.tsx
│   │   ├── run/[runId]/page.tsx
│   │   └── slip/[itemId]/page.tsx
│   │
│   ├── reports/
│   │   ├── attendance/page.tsx
│   │   ├── late/page.tsx
│   │   ├── overtime/page.tsx
│   │   └── payroll/page.tsx
│   │
│   └── settings/
│       ├── app/page.tsx            # Branding, warna, logo (baca/tulis tabel tenants)
│       ├── locations/page.tsx
│       ├── late-rules/page.tsx
│       └── salary-components/page.tsx
│
├── api/
│   ├── employees/
│   │   ├── route.ts                # GET list, POST create — SQL di sini
│   │   └── [id]/
│   │       └── route.ts            # GET, PATCH, DELETE — SQL di sini
│   ├── attendances/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   ├── clock-in/route.ts
│   │   └── clock-out/route.ts
│   ├── shifts/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── shift-assignments/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── leave-requests/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── overtime-requests/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── payroll-runs/
│   │   ├── route.ts
│   │   └── [runId]/
│   │       ├── route.ts
│   │       └── generate/route.ts
│   ├── payroll-items/
│   │   └── [itemId]/
│   │       ├── route.ts
│   │       └── slip-pdf/route.ts
│   ├── salary-components/
│   │   └── route.ts
│   ├── locations/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── departments/route.ts
│   ├── positions/route.ts
│   ├── employment-grades/route.ts
│   ├── late-rules/route.ts
│   ├── app-config/route.ts         # GET & PATCH konfigurasi branding (tabel tenants)
│   ├── upload/route.ts             # Upload ke Vercel Blob
│   ├── reports/
│   │   ├── attendance/route.ts
│   │   └── payroll/route.ts
│   ├── auth/
│   │   └── login/route.ts
│   └── verify/
│       └── slip/[token]/route.ts
│
└── robots.txt                      # Disallow: / (no SEO)
```

---

## 4. Konvensi Query Layer

### 4.1 Prinsip

- **SQL ditulis langsung di `route.ts`** — tidak ada file query terpisah.
- Koneksi DB via `@neondatabase/serverless`:
  ```ts
  import { neon } from '@neondatabase/serverless'
  const sql = neon(process.env.DATABASE_URL!)
  ```
- **Tidak ada SQL di komponen FE** — komponen hanya memanggil fetch ke API route.
- **Tidak ada SQL di server components / page.tsx** — data fetching dari page dilakukan via `fetch('/api/...')` atau dengan memanggil fungsi helper yang tidak mengandung SQL (hanya wrapper fetch).
- Semua query menggunakan parameterized template literal neon (tidak ada string concatenation SQL).

### 4.2 Pola Route.ts

```ts
// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest, getEmployeeIdFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const role = await getRoleFromRequest(req)
  requirePermission(role, 'employees:read')

  const page = Number(req.nextUrl.searchParams.get('page') ?? 1)
  const limit = 25
  const offset = (page - 1) * limit
  const q = req.nextUrl.searchParams.get('q') ?? ''

  const data = q
    ? await sql`
        SELECT e.id, e.employee_number, e.full_name, e.email, e.role,
               e.employment_status, e.is_active,
               p.name AS position_name, d.name AS department_name
        FROM employees e
        JOIN positions p ON p.id = e.position_id
        JOIN departments d ON d.id = p.department_id
        WHERE e.deleted_at IS NULL
          AND e.full_name % ${q}
        ORDER BY similarity(e.full_name, ${q}) DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT e.id, e.employee_number, e.full_name, e.email, e.role,
               e.employment_status, e.is_active,
               p.name AS position_name, d.name AS department_name
        FROM employees e
        JOIN positions p ON p.id = e.position_id
        JOIN departments d ON d.id = p.department_id
        WHERE e.deleted_at IS NULL
        ORDER BY e.full_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const role = await getRoleFromRequest(req)
  requirePermission(role, 'employees:write')

  const body = await req.json()
  const { employee_number, full_name, email, position_id, join_date,
          employment_status, base_salary, hourly_rate, role: empRole,
          password_hash } = body

  const [employee] = await sql`
    INSERT INTO employees (
      position_id, employee_number, full_name, email,
      join_date, employment_status, base_salary, hourly_rate,
      role, password_hash
    ) VALUES (
      ${position_id}, ${employee_number}, ${full_name}, ${email},
      ${join_date}, ${employment_status}, ${base_salary}, ${hourly_rate},
      ${empRole}, ${password_hash}
    )
    RETURNING id, employee_number, full_name, email
  `

  return NextResponse.json({ data: employee }, { status: 201 })
}
```

### 4.3 Pola Fetch dari FE (Client Component)

```tsx
// components/employees/EmployeeList.tsx  — CLIENT COMPONENT
'use client'
import { useEffect, useState } from 'react'

export function EmployeeList() {
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    fetch('/api/employees?page=1')
      .then(r => r.json())
      .then(({ data }) => setEmployees(data))
  }, [])

  // render ...
}
```

```tsx
// app/(dashboard)/employees/page.tsx  — SERVER COMPONENT
// Fetch data di server component via internal fetch, bukan SQL langsung
export default async function EmployeesPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${getTokenFromCookie()}` }
  })
  const { data } = await res.json()
  return <EmployeeTable initialData={data} />
}
```

---

## 5. Branding Dinamis (Single Tenant Config)

Konfigurasi visual dibaca dari tabel `tenants` (row id=1) dan di-inject ke root layout sebagai CSS variables.

```ts
// app/(dashboard)/layout.tsx  — SERVER COMPONENT
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function DashboardLayout({ children }) {
  const [config] = await sql`
    SELECT name, logo_url, primary_color, secondary_color,
           slip_header_color, font_heading, font_body
    FROM tenants
    WHERE id = 1
  `

  const tenantStyle = `
    :root {
      --color-primary: ${config.primary_color};
      --color-secondary: ${config.secondary_color};
      --slip-header-color: ${config.slip_header_color};
      --font-heading: 'Cabin', sans-serif;
      --font-body: 'Albert Sans', sans-serif;
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: tenantStyle }} />
      <div className="flex h-screen">
        <Sidebar companyName={config.name} logoUrl={config.logo_url} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </>
  )
}
```

> Layout ini adalah **satu-satunya tempat** yang boleh query DB langsung (bukan via API route), karena ia adalah server component yang hanya berjalan saat render dan hasilnya adalah style injection — bukan data bisnis.

---

## 6. Struktur Komponen (Reusable)

```
components/
├── ui/                         # Primitif
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Badge.tsx
│   ├── Modal.tsx
│   ├── Drawer.tsx
│   ├── Tabs.tsx
│   ├── Table.tsx
│   ├── DataTable.tsx
│   ├── Avatar.tsx
│   ├── Skeleton.tsx
│   └── Toast.tsx
│
├── layout/
│   ├── Sidebar.tsx             # Collapsible, role-aware nav
│   ├── SidebarToggle.tsx
│   ├── Topbar.tsx
│   ├── PageHeader.tsx
│   └── BreadcrumbNav.tsx
│
├── attendance/
│   ├── ClockInButton.tsx
│   ├── OutsideRadiusModal.tsx
│   ├── ToleranceExhaustedModal.tsx
│   ├── GpsUnavailableModal.tsx
│   ├── AttendanceStatusBadge.tsx
│   └── AttendanceSummaryCard.tsx
│
├── shifts/
│   ├── ShiftCalendar.tsx       # dnd-kit
│   ├── ShiftCard.tsx
│   ├── ShiftAssignModal.tsx
│   └── ShiftBadge.tsx
│
├── payroll/
│   ├── PayrollRunCard.tsx
│   ├── PayrollStatusBadge.tsx
│   ├── PayrollItemRow.tsx
│   ├── SlipPreview.tsx
│   └── PayrollApprovalFlow.tsx
│
├── reports/
│   ├── ReportFilterBar.tsx
│   ├── AttendanceChart.tsx     # Recharts
│   ├── PayrollSummaryChart.tsx
│   └── ExportButton.tsx
│
└── settings/
    ├── BrandingForm.tsx
    ├── ColorPicker.tsx
    └── LogoUploader.tsx
```

### Sidebar Responsif

```
State sidebar:
- expanded   : default di ≥ 1280px
- collapsed  : icon-only di ≥ 768px
- hidden     : mobile, toggle via Drawer overlay

Persist state di localStorage key: 'sidebar-state'
Active item color: var(--color-primary)
Nav items di-filter berdasarkan role user dari JWT
```

---

## 7. Auth & RBAC

### 7.1 Sementara (sebelum NextAuth diaktifkan)

- Login via `POST /api/auth/login` → JWT (HS256, 8 jam)
- JWT payload: `{ sub: employeeId, role, email, iat, exp }`
- Middleware `middleware.ts` validasi JWT di semua `/api/*` dan `/(dashboard)/*`

### 7.2 Helper Auth

```
lib/
├── auth.ts       # getTokenFromRequest(), getEmployeeIdFromRequest(), getRoleFromRequest()
└── rbac.ts       # requirePermission(), ROLE_PERMISSIONS map
```

> `lib/auth.ts` dan `lib/rbac.ts` **tidak mengandung SQL** — hanya parse JWT dan cek permission map.

### 7.3 Role Hierarchy

```
super_admin > tenant_admin > hr_admin > hr_staff > manager > supervisor > employee
```

### 7.4 RBAC Map (ringkasan)

```ts
// lib/rbac.ts
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  hr_admin:   ['employees:write', 'payroll:generate', 'payroll:approve',
               'attendance:edit', 'settings:write', 'reports:read', 'leave:approve'],
  hr_staff:   ['employees:write', 'payroll:review', 'attendance:edit',
               'reports:read', 'leave:approve'],
  manager:    ['attendance:read_team', 'leave:approve', 'reports:read_team',
               'overtime:approve'],
  supervisor: ['attendance:read_team', 'shift:assign', 'overtime:approve'],
  employee:   ['attendance:clock', 'leave:request', 'overtime:request', 'slip:read_own'],
}
```

### 7.5 NextAuth v4 (Dependency Only)

Package `next-auth` ada di `package.json` dan `authOptions` di-scaffold di `lib/next-auth.config.ts`, namun **tidak diaktifkan** sampai diperintahkan.

---

## 8. Payroll Engine

Logika kalkulasi ditulis di `lib/payroll/` — **tidak mengandung SQL**, hanya pure business logic functions yang dipanggil dari API route.

```
lib/
├── payroll/
│   ├── engine.ts          # orchestrator: calculatePayrollItem()
│   ├── hourly.ts          # kalkulasi hourly (produksi)
│   ├── monthly.ts         # kalkulasi monthly (manajemen/outlet)
│   ├── bpjs.ts            # hitung BPJS Kesehatan & TK
│   ├── pph21.ts           # PPh 21 gross-up
│   ├── overtime.ts        # lembur 1.5x / 2x
│   └── deductions.ts      # potongan telat & absensi
├── utils/
│   ├── attendance.ts      # calcLateMinutes(), calcDistance()
│   ├── currency.ts        # formatIDR(), terbilang()
│   └── date.ts            # workingDaysInMonth(), etc.
└── pdf/
    ├── slip.template.tsx  # @react-pdf/renderer template
    └── slip.generator.ts  # generate PDF + upload ke Vercel Blob
```

> `lib/payroll/`, `lib/utils/`, `lib/pdf/` boleh diimport oleh API route. Tidak boleh diimport oleh komponen FE.

### Flow Generate Payroll (di `app/api/payroll-runs/[runId]/generate/route.ts`)

```
POST /api/payroll-runs/{runId}/generate
  SQL: ambil semua karyawan aktif
  SQL: ambil rekap absensi periode
  SQL: ambil overtime yang diapprove
  SQL: ambil komponen gaji aktif per karyawan
  SQL: ambil late_rules per grade
  → lib/payroll/engine.ts: calculatePayrollItem() per karyawan
  SQL: INSERT payroll_items + payroll_item_details (batch)
  SQL: UPDATE payroll_runs.status = 'calculated'
  return: summary
```

---

## 9. Slip Gaji PDF

```
GET /api/payroll-items/{itemId}/slip-pdf
  SQL: ambil payroll_item + detail + employee + tenant config (tenants id=1)
  → lib/pdf/slip.generator.ts
    → lib/pdf/slip.template.tsx (render dengan @react-pdf/renderer)
    → upload ke Vercel Blob: slips/{year}/{month}/{employeeId}.pdf
  return: redirect ke Blob URL atau stream PDF
```

Branding slip menggunakan data dari `tenants` row id=1:
- `logo_url` → logo di header PDF
- `slip_header_color` → warna header
- `name` → nama perusahaan

---

## 10. Storage: Vercel Blob

| Jenis File | Path Pattern | Max Size |
|---|---|---|
| Avatar karyawan | `avatars/{employeeId}.webp` | 2 MB |
| Logo perusahaan | `logo/logo.{ext}` | 5 MB |
| Foto selfie clock-in | `clockin/{YYYY-MM-DD}/{employeeId}-{ts}.jpg` | 5 MB |
| Slip gaji PDF | `slips/{year}/{month}/{employeeId}.pdf` | 10 MB |
| Export laporan | `exports/{type}-{ts}.xlsx` (TTL 24 jam) | 50 MB |

---

## 11. Absensi Geolokasi

### Flow Clock-In

```
Client:
  1. navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true })
  2. Jika error → tampilkan GpsUnavailableModal
  3. POST /api/attendances/clock-in { lat, lng, accuracy, isMockGps }

Server (route.ts):
  SQL: ambil shift aktif hari ini untuk employee
  SQL: cek sudah clock-in hari ini
  Hitung jarak: lib/utils/attendance.calcDistance(lat, lng, location.lat, location.lng)
  Cek isMockGps → fraud_flag
  SQL: cek COUNT toleransi luar radius bulan ini
  Hitung late_minutes: lib/utils/attendance.calcLateMinutes(...)
  SQL: INSERT attendances
  return: { status, lateMinutes, distanceMeters }

Client:
  'outside_radius'       → OutsideRadiusModal
  'tolerance_exhausted'  → ToleranceExhaustedModal
  'mock_gps_detected'    → toast error
  'success'              → toast sukses
```

---

## 12. Export Laporan

| Format | Library | Route |
|---|---|---|
| `.xlsx` | SheetJS | `GET /api/reports/attendance?format=xlsx` |
| `.csv` | `csv-stringify` | `GET /api/reports/attendance?format=csv` |
| `.pdf` | @react-pdf/renderer | `GET /api/reports/payroll?format=pdf` |

Generate server-side di API route → upload ke Vercel Blob (TTL 24 jam) → redirect ke signed URL.

---

## 13. Performa

| Strategi | Target |
|---|---|
| App config (branding) cache di layout | `unstable_cache` 5 menit |
| Dashboard summary | `revalidate: 60` |
| List API | Pagination default limit 25 |
| DB index (dari ERD) | Query rekap absensi < 50ms |
| Vercel Edge Runtime | Middleware auth saja |

---

## 14. robots.txt

```
User-agent: *
Disallow: /
```

---

## 15. Environment Variables

```bash
DATABASE_URL=postgres://...@neon.../dbname?sslmode=require
JWT_SECRET=<random-256-bit>
NEXTAUTH_SECRET=<random-256-bit>
NEXTAUTH_URL=https://app.hrd.example
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
SLIP_HMAC_SECRET=<random-256-bit>
NEXT_PUBLIC_APP_URL=https://app.hrd.example
```

---

## 16. Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.x",
    "react": "^18.3.x",
    "react-dom": "^18.3.x",
    "@neondatabase/serverless": "^0.9.x",
    "@vercel/blob": "^0.23.x",
    "next-auth": "^4.24.x",
    "@react-pdf/renderer": "^3.4.x",
    "xlsx": "^0.18.x",
    "@dnd-kit/core": "^6.1.x",
    "@dnd-kit/sortable": "^8.0.x",
    "@dnd-kit/utilities": "^3.2.x",
    "recharts": "^2.12.x",
    "@tiptap/react": "^2.4.x",
    "@tiptap/starter-kit": "^2.4.x",
    "lucide-react": "^0.400.x",
    "clsx": "^2.1.x",
    "tailwind-merge": "^2.3.x",
    "qrcode": "^1.5.x",
    "jose": "^5.6.x",
    "csv-stringify": "^6.4.x",
    "date-fns": "^3.6.x",
    "date-fns-tz": "^3.1.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.22.x",
    "drizzle-orm": "^0.31.x",
    "typescript": "^5.5.x",
    "tailwindcss": "^3.4.x",
    "@types/node": "^20.x",
    "@types/react": "^18.x",
    "tsx": "^4.x"
  }
}
```
