# CLAUDE.md
## Panduan untuk AI Assistant — Sistem HRD Absensi & Payroll
**Baca file ini sebelum menulis satu baris kode pun.**

---

## Identitas Proyek

Proyek ini adalah **sistem HRD single-tenant berbasis web** untuk manajemen absensi geolokasi dan payroll otomatis. Stack: **Next.js 14 App Router (SSR)**, **Neon PostgreSQL Serverless**, **Vercel**. Single tenant — satu deployment, satu perusahaan — dengan konfigurasi branding yang dinamis dari database.

---

## Aturan Keras (TIDAK BOLEH dilanggar)

### ❌ DILARANG

1. **Jangan menulis SQL di komponen FE** (client component maupun server component page.tsx)
   - Komponen hanya memanggil `fetch('/api/...')` — tidak ada import neon di komponen
2. **Jangan membuat file query terpisah** (`lib/queries/*.ts`)
   - Semua SQL ditulis langsung di `app/api/{model}/route.ts`
3. **Jangan menggunakan Drizzle ORM untuk query runtime**
   - Drizzle hanya untuk `drizzle-kit migrate` / `drizzle-kit push`
   - Zero `db.select()`, `db.insert()`, `db.update()` di kode runtime
4. **Jangan membuat SPA** — tidak ada fetch data utama via `useEffect` di page level
   - Page.tsx bisa server component yang fetch via internal API call
5. **Jangan menambah ORM lain** (Prisma, Kysely, dll.)
6. **Jangan menggunakan `tenant_id` sebagai filter query** — ini single tenant, kolom ada tapi tidak difilter
7. **Jangan membuat halaman tanpa role guard**
8. **Jangan menggunakan ikon selain `lucide-react`** — kecuali checklist: emoji ✅
9. **Jangan mengoverride font** — selalu Cabin (heading) dan Albert Sans (body)
10. **Jangan aktifkan NextAuth** sampai diperintahkan secara eksplisit
11. **Jangan import `lib/payroll/`, `lib/utils/`, `lib/pdf/` di komponen FE** — hanya boleh diimport di API routes

---

## Pola yang HARUS Diikuti

### SQL ditulis di route.ts

```ts
// app/api/employees/route.ts  ← SQL ADA DI SINI
import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const role = await getRoleFromRequest(req)
  requirePermission(role, 'employees:read')

  const page = Number(req.nextUrl.searchParams.get('page') ?? 1)
  const offset = (page - 1) * 25

  const data = await sql`
    SELECT e.id, e.employee_number, e.full_name, e.role, e.is_active,
           p.name AS position_name, d.name AS department_name
    FROM employees e
    JOIN positions p ON p.id = e.position_id
    JOIN departments d ON d.id = p.department_id
    WHERE e.deleted_at IS NULL
    ORDER BY e.full_name ASC
    LIMIT 25 OFFSET ${offset}
  `

  return NextResponse.json({ data })
}
```

### Komponen FE hanya fetch API

```tsx
// components/employees/EmployeeList.tsx  ← TIDAK ADA SQL
'use client'
import { useEffect, useState } from 'react'

export function EmployeeList() {
  const [data, setData] = useState([])

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(({ data }) => setData(data))
  }, [])

  return <div>...</div>
}
```

### Page.tsx server component (fetch via API)

```tsx
// app/(dashboard)/employees/page.tsx
import { cookies } from 'next/headers'

export default async function EmployeesPage() {
  const token = cookies().get('token')?.value
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` }
  })
  const { data } = await res.json()
  return <EmployeeTable initialData={data} />
}
```

### Exception: branding inject di layout

```tsx
// app/(dashboard)/layout.tsx — SATU-SATUNYA tempat SQL boleh di luar route
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export default async function DashboardLayout({ children }) {
  // Boleh karena ini inject CSS vars, bukan data bisnis
  const [cfg] = await sql`SELECT * FROM tenants WHERE id = 1`
  // inject sebagai <style>:root { --color-primary: ${cfg.primary_color} }</style>
}
```

---

## Arsitektur yang Harus Dipahami

### Single Tenant

- Tidak ada filter `WHERE tenant_id = ?` di query runtime
- Kolom `tenant_id` tetap ada di tabel (warisan ERD), nilainya selalu 1
- "Dinamisasi" = config branding (warna, logo, nama) dibaca dari `tenants WHERE id = 1`

### Pemisahan Tanggung Jawab

| Layer | Boleh SQL? | Boleh import lib/payroll? | Boleh import lucide? |
|---|---|---|---|
| `app/api/*/route.ts` | ✅ Ya | ✅ Ya | ❌ Tidak |
| `app/(dashboard)/layout.tsx` | ✅ (CSS inject saja) | ❌ | ❌ |
| `app/(dashboard)/*/page.tsx` | ❌ | ❌ | ✅ Ya |
| `components/**` | ❌ | ❌ | ✅ Ya |
| `lib/payroll/`, `lib/utils/`, `lib/pdf/` | ❌ (dipanggil oleh route) | N/A | ❌ |

### Auth (sementara, sebelum NextAuth)

- JWT dari `POST /api/auth/login`
- Payload: `{ sub: employeeId, role, email }`
- Helper di `lib/auth.ts` (tidak ada SQL)
- Permission check di `lib/rbac.ts` (tidak ada SQL)

### Role Hierarchy

```
super_admin > tenant_admin > hr_admin > hr_staff > manager > supervisor > employee
```

---

## Model Data Kritis

### Kolom Status Penting

```
attendances.status          : 'present' | 'late' | 'absent' | 'leave' | 'holiday'
attendances.clock_in_status : 'valid' | 'outside_radius' | 'mock_gps' | 'manual' | 'system'
employees.role              : 'super_admin' | 'tenant_admin' | 'hr_admin' | 'hr_staff'
                              | 'manager' | 'supervisor' | 'employee'
positions.payroll_type      : 'hourly' | 'monthly'
payroll_runs.status         : 'draft' | 'calculated' | 'reviewed' | 'approved' | 'paid'
late_rules.deduction_method : 'none' | 'per_minute' | 'per_hour' | 'flat_cut'
salary_components.component_type : 'earning_fixed' | 'earning_variable'
                                   | 'bpjs' | 'tax' | 'deduction_variable'
```

### Soft Delete

```sql
-- SELALU tambahkan di semua query tabel utama
WHERE deleted_at IS NULL
```

---

## Payroll Logic

### Hourly (produksi)

```
Gaji = (effective_work_minutes / 60) × hourly_rate
Lembur = (overtime_minutes / 60) × hourly_rate × overtime_rate_multiplier
Telat = sesuai deduction_method dari late_rules
```

### Monthly (manajemen/outlet)

```
Gaji Pokok = base_salary
Pot. Absensi = (base_salary / working_days) × absent_days_unpaid
Pot. Telat = sesuai late_rules (jika late_affects_payroll = true)
```

### BPJS

```
Kesehatan: karyawan 1%, perusahaan 4% (dari gaji dasar, maks 12 juta)
JHT:       karyawan 2%, perusahaan 3.7%
JP:        karyawan 1%, perusahaan 2%
JKK:       perusahaan 0.24%
JKM:       perusahaan 0.3%
```

---

## Komponen UI

- Semua ikon dari `lucide-react` — kecuali checklist: emoji ✅
- Warna via CSS vars: `var(--color-primary)`, `var(--color-secondary)`
- Font via CSS vars: `var(--font-heading)`, `var(--font-body)`
- Helper class: `cn()` dari `clsx` + `tailwind-merge`
- Tidak ada inline style kecuali inject CSS vars di layout

### Sidebar

```
≥ 1280px : expanded (dengan label teks)
≥ 768px  : collapsed (icon-only, hover tooltip)
< 768px  : hidden, toggle via Drawer overlay
Persist  : localStorage key 'sidebar-state'
Active   : background var(--color-primary)
Nav items: di-filter berdasarkan role dari JWT
```

---

## Checklist Sebelum Commit

- ☑️ Tidak ada SQL di komponen FE
- ☑️ Tidak ada SQL di page.tsx (kecuali layout.tsx untuk CSS inject)
- ☑️ SQL hanya di `app/api/*/route.ts`
- ☑️ Semua API endpoint ada `requirePermission()` check
- ☑️ Tidak ada filter `tenant_id` di query
- ☑️ Tidak ada hardcode warna hex (gunakan CSS vars)
- ☑️ Font tidak dioverride
- ☑️ Icon dari lucide-react (kecuali ✅)
- ☑️ Pagination di semua list endpoint
- ☑️ `deleted_at IS NULL` di semua query tabel soft-delete
- ☑️ NextAuth tidak diaktifkan
- ☑️ `lib/payroll/` tidak diimport di komponen FE

---

## Referensi File

| File | Isi |
|---|---|
| `app/api/*/route.ts` | Raw SQL + handler logic |
| `lib/auth.ts` | Parse JWT, get role/employeeId — no SQL |
| `lib/rbac.ts` | requirePermission(), ROLE_PERMISSIONS — no SQL |
| `lib/payroll/engine.ts` | calculatePayrollItem() — no SQL, dipanggil dari route |
| `lib/utils/attendance.ts` | calcLateMinutes(), calcDistance() — pure functions |
| `lib/utils/currency.ts` | formatIDR(), terbilang() |
| `lib/pdf/slip.template.tsx` | React-PDF template |
| `lib/pdf/slip.generator.ts` | Generate + upload ke Vercel Blob |
| `components/ui/` | Primitif reusable |
| `components/layout/Sidebar.tsx` | Collapsible sidebar |
| `drizzle/schema/` | Schema untuk migration saja |
| `drizzle/seed/` | Idempotent seed |
