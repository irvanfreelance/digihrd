# AGENTS.md
## Panduan Agen AI — Sistem HRD Absensi & Payroll
**Baca ini bersama `claude.md` dan `trd.md` sebelum memulai task apapun.**

---

## Prinsip Kerja Agen

1. **Baca `claude.md` dulu** — semua aturan di sana adalah hukum, tidak ada pengecualian.
2. **SQL hanya di `route.ts`** — jangan buat file query terpisah.
3. **Komponen FE hanya fetch API** — zero SQL, zero import neon, zero import lib/payroll.
4. **Single tenant** — jangan tambahkan filter `WHERE tenant_id = ?` di query manapun.
5. **Satu task, satu scope** — jangan refactor file yang tidak diminta.
6. **Tanya jika ambigu** — terutama soal business logic payroll dan permission.

---

## Daftar Agen & Tanggung Jawab

---

### 🏗️ AGENT-01: Foundation & Infrastructure

**Tanggung jawab:**
- Setup Next.js 14 App Router
- Tailwind CSS + CSS variables untuk branding dinamis
- Font Cabin & Albert Sans via `next/font/google`
- `@neondatabase/serverless` connection
- Vercel Blob client
- `middleware.ts` JWT validation
- Helper auth & rbac (tanpa SQL)
- `robots.txt`
- Root layout dengan CSS vars injection

**File yang dibuat:**
```
middleware.ts
app/layout.tsx
app/(auth)/login/page.tsx
app/(auth)/layout.tsx
app/(dashboard)/layout.tsx          # inject CSS vars dari tenants WHERE id=1
lib/auth.ts                         # parse JWT, get role — NO SQL
lib/rbac.ts                         # requirePermission() — NO SQL
lib/utils/cn.ts                     # clsx + tailwind-merge
public/robots.txt                   # Disallow: /
tailwind.config.ts
```

**Acceptance:**
- ✅ JWT parse dari Authorization header atau cookie
- ✅ CSS vars `--color-primary`, `--color-secondary`, `--slip-header-color` ter-inject dari row tenants id=1
- ✅ Font Cabin (heading) dan Albert Sans (body) load via next/font
- ✅ `/api/*` return 401 tanpa token, 403 tanpa permission
- ✅ robots.txt → `Disallow: /`

---

### 🗄️ AGENT-02: Database Migration & Seed

**Tanggung jawab:**
- Setup Drizzle Kit (schema untuk migration generator saja — bukan ORM runtime)
- Generate migration dari ERD
- Seed idempotent (INSERT ... ON CONFLICT DO NOTHING)
- PostGIS + pg_trgm extension

**File yang dibuat:**
```
drizzle.config.ts
drizzle/schema/tenants.ts
drizzle/schema/locations.ts
drizzle/schema/departments.ts
drizzle/schema/employment-grades.ts
drizzle/schema/positions.ts
drizzle/schema/employees.ts
drizzle/schema/shift-templates.ts
drizzle/schema/shift-assignments.ts
drizzle/schema/attendances.ts
drizzle/schema/leave-requests.ts
drizzle/schema/overtime-requests.ts
drizzle/schema/salary-components.ts
drizzle/schema/employee-salary-components.ts
drizzle/schema/payroll-runs.ts
drizzle/schema/payroll-items.ts
drizzle/schema/payroll-item-details.ts
drizzle/schema/late-rules.ts
drizzle/schema/audit-logs.ts
drizzle/seed/index.ts
drizzle/seed/tenants.seed.ts        # 1 tenant, id=1
drizzle/seed/locations.seed.ts
drizzle/seed/employees.seed.ts
drizzle/seed/shifts.seed.ts
drizzle/seed/salary-components.seed.ts
drizzle/seed/attendances.seed.ts
drizzle/seed/payroll.seed.ts
```

**Acceptance:**
- ✅ `npm run db:migrate` berhasil
- ✅ `npm run db:seed` idempotent (aman dijalankan 2x)
- ✅ 1 tenant seed (id=1), 10 employee, lokasi, shift, komponen gaji sesuai ERD
- ✅ PostGIS geom column ter-update
- ✅ Drizzle schema file **tidak diimport di kode runtime apapun**

---

### 🔌 AGENT-03: API Routes — CRUD Models

**Tanggung jawab:**
- Semua route CRUD untuk semua model
- SQL ditulis langsung di route.ts
- Setiap route: parse JWT → requirePermission → SQL → return JSON
- Pagination, soft delete, error handling

**File yang dibuat:**
```
app/api/employees/route.ts                      # GET (list+search), POST
app/api/employees/[id]/route.ts                 # GET, PATCH, DELETE (soft)
app/api/locations/route.ts
app/api/locations/[id]/route.ts
app/api/departments/route.ts
app/api/positions/route.ts
app/api/employment-grades/route.ts
app/api/salary-components/route.ts
app/api/shifts/route.ts
app/api/shifts/[id]/route.ts
app/api/shift-assignments/route.ts
app/api/shift-assignments/[id]/route.ts
app/api/leave-requests/route.ts
app/api/leave-requests/[id]/route.ts
app/api/leave-requests/[id]/approve/route.ts
app/api/overtime-requests/route.ts
app/api/overtime-requests/[id]/route.ts
app/api/overtime-requests/[id]/approve/route.ts
app/api/late-rules/route.ts
app/api/app-config/route.ts                     # GET & PATCH tenants WHERE id=1
app/api/upload/route.ts                         # upload ke Vercel Blob
app/api/auth/login/route.ts
app/api/verify/slip/[token]/route.ts
```

**Pola wajib setiap route:**
```ts
import { neon } from '@neondatabase/serverless'
import { getRoleFromRequest } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const role = await getRoleFromRequest(req)
  requirePermission(role, '{model}:read')
  // SQL di sini
  const data = await sql`SELECT ...`
  return NextResponse.json({ data })
}
```

**Acceptance:**
- ✅ Tidak ada SQL di luar route.ts
- ✅ Semua endpoint ada permission check
- ✅ Tidak ada filter `WHERE tenant_id = ?`
- ✅ Soft delete: `UPDATE SET deleted_at = NOW()` bukan `DELETE`
- ✅ Search karyawan via pg_trgm (`full_name % ${q}`)
- ✅ Pagination default limit 25 di semua list

---

### 📍 AGENT-04: API Routes — Absensi (Clock-In/Out)

**Tanggung jawab:**
- Clock-in: validasi GPS, jarak, mock GPS, toleransi, kalkulasi late_minutes
- Clock-out: hitung durasi kerja efektif
- Koreksi absensi (HR only)

**File yang dibuat:**
```
app/api/attendances/route.ts
app/api/attendances/[id]/route.ts
app/api/attendances/clock-in/route.ts
app/api/attendances/clock-out/route.ts
lib/utils/attendance.ts             # calcLateMinutes(), calcDistance() — NO SQL
```

**Clock-in route logic:**
```
1. SQL: ambil shift aktif hari ini untuk employeeId
2. SQL: cek apakah sudah clock-in hari ini
3. calcDistance(req.lat, req.lng, location.lat, location.lng)
4. Jika isMockGps → fraud_flag = true, return 'mock_gps_detected'
5. Jika distance > radius:
   SQL: COUNT outside-radius bulan ini
   Jika > max_outside_tolerance_count → return 'tolerance_exhausted'
   Jika ≤ → status = 'outside_radius', boleh lanjut dengan catatan
6. calcLateMinutes(clockInAt, shift.start_time, late_rule.tolerance_minutes)
7. SQL: INSERT attendances
8. return { status: 'success', lateMinutes, distanceMeters }
```

**Acceptance:**
- ✅ calcDistance menggunakan Haversine formula (di lib/utils/attendance.ts)
- ✅ calcLateMinutes di lib/utils/attendance.ts, dipanggil dari route
- ✅ Fraud flag tersimpan di DB
- ✅ Response status: 'success' | 'outside_radius' | 'tolerance_exhausted' | 'mock_gps_detected'

---

### 💰 AGENT-05: Payroll Engine (Business Logic)

**Tanggung jawab:**
- Pure business logic functions — NO SQL
- Dipanggil oleh API route generate payroll
- Unit testable

**File yang dibuat:**
```
lib/payroll/engine.ts           # orchestrator, dipanggil dari route
lib/payroll/hourly.ts
lib/payroll/monthly.ts
lib/payroll/bpjs.ts
lib/payroll/pph21.ts
lib/payroll/overtime.ts
lib/payroll/deductions.ts
lib/utils/currency.ts           # formatIDR(), terbilang()
lib/utils/date.ts               # workingDaysInMonth(), etc.
```

**Interface engine:**
```ts
// lib/payroll/engine.ts
export function calculatePayrollItem(params: {
  employee: EmployeeData
  attendanceSummary: AttendanceSummary
  approvedOvertimes: OvertimeData[]
  salaryComponents: SalaryComponentData[]
  lateRule: LateRuleData
  periodYear: number
  periodMonth: number
}): PayrollItemResult
// Returns: earnings, deductions, bpjs, pph21, netSalary, details[]
// NO SQL — semua data sudah disiapkan oleh route sebelum memanggil ini
```

**Acceptance:**
- ✅ Kalkulasi hourly: jam efektif × tarif per jam
- ✅ Kalkulasi monthly: gaji pokok − potongan absensi − potongan telat
- ✅ BPJS sesuai persentase (Kesehatan, JHT, JP, JKK, JKM)
- ✅ PPh 21 gross-up berdasarkan PTKP status
- ✅ Deduction method: none / per_minute / per_hour / flat_cut
- ✅ Zero selisih antara kalkulasi manual vs engine

---

### 💳 AGENT-06: API Routes — Payroll Run & Slip

**Tanggung jawab:**
- Generate payroll run (SQL + engine)
- Approval flow
- Generate slip PDF
- QR verifikasi

**File yang dibuat:**
```
app/api/payroll-runs/route.ts
app/api/payroll-runs/[runId]/route.ts
app/api/payroll-runs/[runId]/generate/route.ts
app/api/payroll-items/[itemId]/route.ts
app/api/payroll-items/[itemId]/slip-pdf/route.ts
lib/pdf/slip.template.tsx           # @react-pdf/renderer template — NO SQL
lib/pdf/slip.generator.ts           # generate + upload Vercel Blob — NO SQL
```

**Generate route logic (route.ts):**
```
POST /api/payroll-runs/{runId}/generate
  SQL: ambil payroll_run (validasi status = 'draft')
  SQL: ambil semua employee aktif
  Per employee:
    SQL: rekap attendances periode
    SQL: overtime yang diapprove
    SQL: employee_salary_components aktif
    SQL: late_rules sesuai grade
    → lib/payroll/engine.calculatePayrollItem(data)
    SQL: INSERT payroll_items + payroll_item_details
  SQL: UPDATE payroll_runs SET status = 'calculated'
  return summary
```

**Acceptance:**
- ✅ Lifecycle: draft → calculated → reviewed → approved → paid
- ✅ Slip PDF generate ≤ 3 detik
- ✅ Slip branding dari tenants id=1 (logo_url, slip_header_color, name)
- ✅ QR token: HMAC-SHA256(itemId+employeeId+period, SLIP_HMAC_SECRET)
- ✅ Batch: semua slip 1 payroll run bisa di-generate sekaligus

---

### 📊 AGENT-07: API Routes — Laporan & Export

**Tanggung jawab:**
- Query laporan (rekap kehadiran, keterlambatan, lembur, payroll)
- Export XLSX via SheetJS
- Export CSV
- Export PDF laporan

**File yang dibuat:**
```
app/api/reports/attendance/route.ts
app/api/reports/late/route.ts
app/api/reports/overtime/route.ts
app/api/reports/payroll/route.ts
```

**Pola export di route:**
```ts
// format=xlsx → generate SheetJS → upload Vercel Blob → redirect signed URL
// format=csv  → csv-stringify → stream response
// format=json → return JSON biasa
```

**Acceptance:**
- ✅ Filter: periode (date range), departemen, lokasi, status
- ✅ XLSX: kolom sesuai laporan, format angka IDR, header bold
- ✅ CSV: UTF-8 BOM (Excel-compatible)
- ✅ Export file TTL 24 jam di Vercel Blob

---

### 🎨 AGENT-08: UI Component Library

**Tanggung jawab:**
- Semua primitif di `components/ui/`
- Layout (Sidebar, Topbar)
- Semua icon dari lucide-react
- CSS variables untuk warna (tidak hardcode)
- Sidebar responsif dengan toggle

**File yang dibuat:**
```
components/ui/Button.tsx
components/ui/Input.tsx
components/ui/Select.tsx
components/ui/Badge.tsx
components/ui/Modal.tsx
components/ui/Drawer.tsx
components/ui/Tabs.tsx
components/ui/Table.tsx
components/ui/DataTable.tsx
components/ui/Avatar.tsx
components/ui/Skeleton.tsx
components/ui/Toast.tsx
components/ui/Card.tsx
components/ui/Pagination.tsx
components/ui/SearchInput.tsx
components/ui/DateRangePicker.tsx
components/layout/Sidebar.tsx
components/layout/SidebarToggle.tsx
components/layout/Topbar.tsx
components/layout/PageHeader.tsx
components/layout/BreadcrumbNav.tsx
```

**Acceptance:**
- ✅ Sidebar: expanded ↔ icon-only di desktop, Drawer di mobile
- ✅ Sidebar state persist di localStorage `'sidebar-state'`
- ✅ Active nav item: `background: var(--color-primary)`
- ✅ Nav items difilter berdasarkan `role` prop
- ✅ Tidak ada hardcode warna hex (semua via `var(--color-primary)`)
- ✅ Semua icon dari `lucide-react` (checklist → emoji ✅)
- ✅ Font via CSS vars (tidak ada `font-family: 'Cabin'` hardcode di komponen)

---

### 📍 AGENT-09: Modul Absensi (FE)

**Tanggung jawab:**
- Halaman clock-in/out (employee)
- Modal system
- Rekap absensi (HR view + self view)
- Koreksi absensi dengan Tiptap

**File yang dibuat:**
```
app/(dashboard)/attendance/clock/page.tsx
app/(dashboard)/attendance/page.tsx
app/(dashboard)/attendance/[id]/page.tsx
components/attendance/ClockInButton.tsx         # GPS detection + POST /api/attendances/clock-in
components/attendance/OutsideRadiusModal.tsx
components/attendance/ToleranceExhaustedModal.tsx
components/attendance/GpsUnavailableModal.tsx
components/attendance/AttendanceStatusBadge.tsx
components/attendance/AttendanceSummaryCard.tsx
components/attendance/AttendanceCorrectionForm.tsx  # Tiptap untuk catatan
components/attendance/AttendanceTable.tsx
```

**ClockInButton logic (CLIENT COMPONENT — zero SQL):**
```
onClick:
  1. navigator.geolocation.getCurrentPosition(...)
  2. Error → setModal('gps_unavailable')
  3. Success:
     const res = await fetch('/api/attendances/clock-in', { method: 'POST', body: { lat, lng, accuracy, isMockGps } })
     const { status } = await res.json()
     if status === 'outside_radius'      → setModal('outside_radius', res.data)
     if status === 'tolerance_exhausted' → setModal('tolerance_exhausted')
     if status === 'mock_gps_detected'   → toast.error(...)
     if status === 'success'             → toast.success(...) + refetch
```

**Acceptance:**
- ✅ Modal tampil < 1 detik setelah GPS response
- ✅ Modal luar radius: tampilkan jarak aktual + toleransi tersisa
- ✅ Photo selfie conditional (muncul jika location.require_photo = true)
- ✅ Rekap filter: periode, departemen, status

---

### 📅 AGENT-10: Modul Shift (FE)

**Tanggung jawab:**
- CRUD template shift
- Kalender drag-drop (dnd-kit)
- Shift swap

**File yang dibuat:**
```
app/(dashboard)/shifts/templates/page.tsx
app/(dashboard)/shifts/schedule/page.tsx
app/(dashboard)/shifts/swap/page.tsx
components/shifts/ShiftCalendar.tsx         # dnd-kit — zero SQL
components/shifts/ShiftCard.tsx
components/shifts/ShiftAssignModal.tsx
components/shifts/ShiftBadge.tsx
components/shifts/ShiftTemplateForm.tsx
components/shifts/SwapRequestCard.tsx
```

**Acceptance:**
- ✅ Drag-drop berfungsi di desktop dan touch
- ✅ Color coding dari `shift_templates.color_hex`
- ✅ Drop ke slot → `POST /api/shift-assignments`
- ✅ Swap: employee request → supervisor/HR approve via `/api/shift-assignments/{id}/approve`

---

### 💰 AGENT-11: Modul Payroll (FE)

**Tanggung jawab:**
- Payroll run list & detail
- Approval flow UI
- Slip preview & download

**File yang dibuat:**
```
app/(dashboard)/payroll/page.tsx
app/(dashboard)/payroll/run/[runId]/page.tsx
app/(dashboard)/payroll/slip/[itemId]/page.tsx
components/payroll/PayrollRunCard.tsx
components/payroll/PayrollStatusBadge.tsx
components/payroll/PayrollItemRow.tsx
components/payroll/SlipPreview.tsx
components/payroll/PayrollApprovalFlow.tsx
```

**Acceptance:**
- ✅ "Generate Payroll" button → `POST /api/payroll-runs/{runId}/generate`
- ✅ Approval buttons sesuai lifecycle: Review → Approve → Mark Paid
- ✅ Download slip → `GET /api/payroll-items/{itemId}/slip-pdf` → redirect ke PDF
- ✅ Karyawan hanya bisa lihat slip sendiri (role guard dari JWT)

---

### 📊 AGENT-12: Dashboard & Laporan (FE)

**Tanggung jawab:**
- Dashboard HR Admin
- Semua halaman laporan
- Export buttons

**File yang dibuat:**
```
app/(dashboard)/page.tsx
app/(dashboard)/reports/attendance/page.tsx
app/(dashboard)/reports/late/page.tsx
app/(dashboard)/reports/overtime/page.tsx
app/(dashboard)/reports/payroll/page.tsx
components/reports/ReportFilterBar.tsx
components/reports/AttendanceChart.tsx      # Recharts BarChart
components/reports/PayrollSummaryChart.tsx  # Recharts
components/reports/ExportButton.tsx
```

**Dashboard wajib tampilkan:**
- Kehadiran hari ini: hadir / belum / terlambat (angka + ring chart)
- Grafik ketidakhadiran 7 hari (Recharts BarChart)
- Status payroll run bulan berjalan (badge)
- Alert: fraud_flag = true minggu ini
- Top 5 karyawan terlambat bulan ini

**Acceptance:**
- ✅ Dashboard data fetch via `/api/reports/attendance?type=today`
- ✅ Cache 60 detik (`revalidate: 60` di server component)
- ✅ Export button: pilih format (xlsx/csv) → `GET /api/reports/{type}?format=xlsx`

---

### ⚙️ AGENT-13: Settings & Manajemen Karyawan (FE)

**Tanggung jawab:**
- Branding settings (warna, logo)
- Manajemen lokasi
- Rules keterlambatan
- CRUD karyawan + komponen gaji
- Izin/cuti + lembur

**File yang dibuat:**
```
app/(dashboard)/settings/app/page.tsx
app/(dashboard)/settings/locations/page.tsx
app/(dashboard)/settings/late-rules/page.tsx
app/(dashboard)/settings/salary-components/page.tsx
app/(dashboard)/employees/page.tsx
app/(dashboard)/employees/[id]/page.tsx
app/(dashboard)/employees/[id]/salary/page.tsx
app/(dashboard)/employees/new/page.tsx
app/(dashboard)/leave/page.tsx
app/(dashboard)/leave/request/page.tsx
app/(dashboard)/overtime/page.tsx
app/(dashboard)/overtime/request/page.tsx
components/settings/BrandingForm.tsx        # ColorPicker + LogoUploader
components/settings/ColorPicker.tsx
components/settings/LogoUploader.tsx        # upload ke /api/upload → Vercel Blob
components/settings/LocationForm.tsx
components/settings/LateRuleForm.tsx
components/settings/SalaryComponentForm.tsx
components/employees/EmployeeTable.tsx
components/employees/EmployeeForm.tsx
components/employees/SalaryComponentEditor.tsx
components/leave/LeaveRequestForm.tsx
components/overtime/OvertimeRequestForm.tsx
```

**BrandingForm spec:**
- Color picker live preview menggunakan CSS vars
- Simpan → `PATCH /api/app-config` → layout re-fetch pada navigasi berikutnya
- Logo upload: `POST /api/upload` → simpan URL ke tenants.logo_url

**Acceptance:**
- ✅ Perubahan warna live preview di form sebelum save
- ✅ Setelah save, warna berubah di seluruh app (CSS vars update)
- ✅ Search karyawan: debounce 300ms → `GET /api/employees?q=...`
- ✅ Komponen gaji karyawan: add/edit dengan effective_from date

---

## Urutan Pengerjaan

```
AGENT-01 (Foundation)
    ↓
AGENT-02 (Database)
    ↓
AGENT-03 (API CRUD)  ──── AGENT-08 (UI Components)
AGENT-04 (API Absensi)
AGENT-05 (Payroll Engine)
    ↓
AGENT-06 (API Payroll)   ──── AGENT-09 (FE Absensi)
AGENT-07 (API Reports)   ──── AGENT-10 (FE Shift)
                         ──── AGENT-11 (FE Payroll)
                              AGENT-12 (FE Dashboard)
                              AGENT-13 (FE Settings & Karyawan)
```

---

## Environment Wajib Ada Sebelum Development

```
DATABASE_URL=          # Neon PostgreSQL
JWT_SECRET=            # min 32 chars
BLOB_READ_WRITE_TOKEN= # Vercel Blob
SLIP_HMAC_SECRET=      # min 32 chars
NEXT_PUBLIC_APP_URL=   # https://localhost:3000 untuk dev
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
