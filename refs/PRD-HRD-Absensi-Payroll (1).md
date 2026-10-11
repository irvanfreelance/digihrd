# Product Requirements Document
## Sistem HRD — Absensi & Payroll
**Versi:** 1.0  
**Status:** Draft  
**Tanggal:** Oktober 2026

---

## 1. Ringkasan Produk

Sistem HRD Absensi & Payroll adalah platform manajemen sumber daya manusia berbasis web yang menangani pencatatan kehadiran berbasis geolokasi, manajemen jadwal shift, dan penggajian otomatis dengan logika kalkulasi berbeda antara karyawan produksi (berbasis jam kerja aktual) dan karyawan outlet/manajemen (berbasis gaji bulanan tetap). Sistem ini mendukung cetak slip gaji dan pengelolaan penuh oleh admin HR maupun akses mandiri oleh karyawan.

---

## 2. Tujuan & Sasaran

### 2.1 Tujuan Bisnis
- Menggantikan absensi manual/finger print dengan solusi digital berbasis geolokasi yang tidak dapat dipalsukan posisinya.
- Menyatukan manajemen jadwal, kehadiran, dan penggajian dalam satu platform terintegrasi.
- Meminimalkan kesalahan hitung payroll dengan otomasi kalkulasi berdasarkan rules keterlambatan, lembur, dan tipe karyawan.

### 2.2 Sasaran Pengguna
| Pengguna | Kebutuhan Utama |
|---|---|
| Admin HR | Kelola data karyawan, atur lokasi absensi, approval, generate payroll, cetak slip |
| Manager / Supervisor | Pantau kehadiran tim, approve izin/lembur |
| Karyawan | Clock-in/out, lihat jadwal, unduh slip gaji |

---

## 3. Ruang Lingkup

### 3.1 In-Scope
- Absensi geolokasi dengan radius configurable per lokasi
- Multi-kantor / multi-outlet dalam satu tenant
- Manajemen jadwal shift (reguler, rotasi, fleksibel)
- Rules keterlambatan yang berdampak atau tidak berdampak ke payroll (configurable per grade/posisi)
- Kalkulasi payroll berbasis jam (karyawan produksi) dan berbasis bulan (manajemen/outlet)
- Lembur, potongan, tunjangan, BPJS, PPh 21
- Cetak & unduh slip gaji (PDF)
- Notifikasi (push/email)

### 3.2 Out-of-Scope (versi ini)
- Integrasi sistem akuntansi ERP
- Modul rekrutmen & onboarding
- Performance review

---

## 4. Definisi Peran & Hak Akses

### 4.1 Hierarki Peran

```
SUPER_ADMIN (Anthropic/Vendor)
    └── TENANT_ADMIN (Perusahaan)
            ├── HR_ADMIN
            ├── HR_STAFF
            ├── MANAGER
            ├── SUPERVISOR
            └── EMPLOYEE
```

### 4.2 Matriks Akses Lengkap

| Fitur / Modul | HR_ADMIN | HR_STAFF | MANAGER | SUPERVISOR | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|:---:|
| **Manajemen Karyawan** |||||
| Tambah/Edit/Hapus karyawan | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lihat profil semua karyawan | ✅ | ✅ | ✅ (tim) | ✅ (tim) | ❌ |
| Lihat profil sendiri | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Absensi** |||||
| Clock-in / Clock-out | ❌* | ❌* | ✅ | ✅ | ✅ |
| Lihat rekap absensi semua | ✅ | ✅ | ✅ (tim) | ✅ (tim) | ❌ |
| Lihat absensi sendiri | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit / Koreksi absensi | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approval izin/cuti | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Lokasi Absensi** |||||
| Tambah/Edit lokasi & radius | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lihat peta lokasi | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Jadwal Shift** |||||
| Buat/Edit template shift | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign shift ke karyawan | ✅ | ✅ | ✅ | ✅ | ❌ |
| Lihat jadwal sendiri | ✅ | ✅ | ✅ | ✅ | ✅ |
| Swap shift (request) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve swap shift | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Payroll** |||||
| Generate payroll run | ✅ | ❌ | ❌ | ❌ | ❌ |
| Review/Approve payroll | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lihat semua slip gaji | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cetak slip gaji karyawan | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lihat & cetak slip sendiri | ✅ | ✅ | ✅ | ✅ | ✅ |
| Atur komponen gaji | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Laporan** |||||
| Laporan kehadiran (semua) | ✅ | ✅ | ✅ (tim) | ✅ (tim) | ❌ |
| Laporan payroll (semua) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export CSV/Excel | ✅ | ✅ | ✅ (tim) | ❌ | ❌ |
| **Pengaturan Sistem** |||||
| Konfigurasi tenant (logo, warna) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Atur rules keterlambatan | ✅ | ❌ | ❌ | ❌ | ❌ |
| Atur komponen BPJS/Pajak | ✅ | ❌ | ❌ | ❌ | ❌ |

> *HR_ADMIN dan HR_STAFF tidak melakukan absensi lapangan, mereka dikecualikan dari kewajiban clock-in/out reguler. Dapat dikonfigurasi per tenant.

---

## 5. Fitur: Absensi Geolokasi

### 5.1 Alur Clock-In

```
Karyawan buka app
    → Sistem deteksi GPS (akurasi ≥ 20m)
    → Bandingkan dengan radius lokasi yang di-assign
    
    [DALAM RADIUS]
        → Clock-in berhasil, catat timestamp + koordinat
    
    [LUAR RADIUS]
        → Tampilkan Modal "Di Luar Area Kerja"
            Opsi A: Batalkan
            Opsi B: Clock-in dengan catatan (jika toleransi diizinkan)
            Opsi C: Ajukan Permintaan Manual ke HR
    
    [GPS TIDAK TERSEDIA]
        → Tampilkan Modal "GPS Tidak Terdeteksi"
            → Wajib clock-in manual via HR
```

### 5.2 Konfigurasi Lokasi Absensi

Setiap lokasi (kantor/outlet/gudang) memiliki:

| Parameter | Deskripsi | Contoh |
|---|---|---|
| `nama_lokasi` | Label lokasi | "Pabrik Cimahi" |
| `latitude` / `longitude` | Koordinat pusat | -6.9344, 107.5421 |
| `radius_meter` | Radius valid absensi | 100 meter |
| `allow_outside_with_reason` | Boleh clock-in luar radius dengan alasan | true/false |
| `max_outside_tolerance_count` | Berapa kali toleransi per bulan | 3x |
| `require_photo` | Selfie saat clock-in wajib | true/false |
| `restrict_mock_location` | Blokir GPS palsu (developer mode) | true |

### 5.3 Jenis Modal yang Muncul

#### Modal 1: Di Luar Radius
```
┌─────────────────────────────────────┐
│  ⚠️  Anda Di Luar Area Absensi      │
│                                     │
│  Jarak Anda: 245 m                  │
│  Radius Diizinkan: 100 m            │
│  Lokasi: Kantor Pusat Jakarta       │
│                                     │
│  Anda memiliki 2 toleransi tersisa  │
│  bulan ini.                         │
│                                     │
│  [Batalkan]  [Absen dengan Catatan] │
└─────────────────────────────────────┘
```

#### Modal 2: Toleransi Habis
```
┌─────────────────────────────────────┐
│  🚫  Toleransi Habis                │
│                                     │
│  Anda telah melebihi batas absensi  │
│  di luar area (3x bulan ini).       │
│                                     │
│  Silakan hubungi HR untuk           │
│  melakukan absensi manual.          │
│                                     │
│  [Tutup]  [Hubungi HR]              │
└─────────────────────────────────────┘
```

#### Modal 3: GPS Tidak Aktif
```
┌─────────────────────────────────────┐
│  📍  Aktifkan GPS Anda              │
│                                     │
│  Sistem membutuhkan lokasi GPS      │
│  untuk memverifikasi kehadiran.     │
│                                     │
│  Izinkan akses lokasi di pengaturan │
│  perangkat Anda.                    │
│                                     │
│  [Coba Lagi]  [Absen Manual ke HR]  │
└─────────────────────────────────────┘
```

### 5.4 Deteksi GPS Palsu (Mock Location)
- Sistem mendeteksi apakah perangkat menggunakan aplikasi pemalsuan GPS (Developer Options - Mock Location).
- Jika terdeteksi: absensi ditolak otomatis + notifikasi ke HR Admin.
- Log disimpan sebagai `fraud_flag = true` pada rekaman absensi.

---

## 6. Fitur: Manajemen Jadwal Shift

### 6.1 Tipe Shift

| Tipe | Deskripsi | Cocok Untuk |
|---|---|---|
| **Fixed** | Jam masuk-keluar tetap setiap hari | Manajemen, admin |
| **Rotating** | Rotasi shift A/B/C dalam siklus tertentu | Produksi, pabrik |
| **Flexible** | Target jam kerja per hari, tidak terikat waktu masuk | Tim kreatif, sales |
| **Split** | Dua sesi kerja terpisah dalam satu hari | Outlet F&B, ritel |

### 6.2 Template Shift

Setiap template shift mendefinisikan:
- Nama shift (contoh: "Shift Pagi A")
- Jam mulai & jam selesai
- Durasi istirahat (menit)
- Toleransi keterlambatan (menit) — batas sebelum dihitung terlambat
- Hari kerja berlaku (Senin–Minggu, bisa multi-hari)
- Apakah shift ini melintas tengah malam (overnight shift)

### 6.3 Assign Shift

- HR dapat assign shift ke:
  - Karyawan individual
  - Departemen/tim
  - Lokasi/outlet tertentu
- Berlaku mulai tanggal tertentu (effective_date)
- Bisa dijadwalkan berulang (weekly, bi-weekly, monthly cycle)

### 6.4 Swap Shift

1. Karyawan A mengajukan swap dengan Karyawan B
2. Karyawan B menyetujui
3. Supervisor/Manager menyetujui
4. Sistem otomatis memperbarui jadwal kedua karyawan

---

## 7. Fitur: Rules Keterlambatan

### 7.1 Konfigurasi Rules per Grade / Posisi

Rules keterlambatan dikonfigurasi di level **employment_grade** atau **posisi**, sehingga fleksibel per kelompok karyawan:

| Parameter | Deskripsi |
|---|---|
| `tolerance_minutes` | Menit terlambat yang masih dimaafkan (tidak dicatat/tidak mempengaruhi) |
| `late_affects_payroll` | Boolean — apakah keterlambatan mengurangi gaji |
| `deduction_method` | `per_minute`, `per_hour`, `flat_cut`, atau `none` |
| `deduction_amount` | Nilai potongan jika method = flat_cut |
| `deduction_rate` | Rate potongan jika method = per_minute/per_hour |
| `max_late_count_per_month` | Jumlah keterlambatan sebelum tindakan disiplin |
| `late_count_triggers_warning` | Jumlah keterlambatan pemicu surat peringatan |

### 7.2 Contoh Skenario Rules

**Karyawan Produksi (jam-an):**
- Toleransi: 0 menit
- Terlambat 1 menit = dipotong dari total jam kerja → mempengaruhi upah
- `late_affects_payroll = true`, `deduction_method = per_minute`

**Karyawan Outlet (gaji bulanan):**
- Toleransi: 15 menit
- Terlambat 1–15 menit = dicatat tapi tidak dipotong
- Terlambat > 15 menit = dicatat, potongan flat Rp 25.000 per kejadian
- `late_affects_payroll = true`, `deduction_method = flat_cut`

**Karyawan Manajemen:**
- Toleransi: 30 menit
- Keterlambatan dicatat untuk evaluasi tapi tidak mempengaruhi gaji
- `late_affects_payroll = false`

---

## 8. Fitur: Payroll

### 8.1 Tipe Kalkulasi Payroll

#### Tipe A: Berbasis Jam (Hourly) — Karyawan Produksi
- Gaji = Total Jam Kerja Efektif × Tarif Upah Per Jam
- Total Jam Kerja = Clock-out − Clock-in − Istirahat
- Jika terlambat: jam efektif dikurangi menit keterlambatan
- Lembur = Jam di luar shift standar × Tarif Lembur (1.5x / 2x)
- Absen tidak hadir = tidak dibayar hari tersebut

#### Tipe B: Berbasis Bulan (Monthly) — Manajemen & Outlet
- Gaji Pokok = Fixed per bulan
- Potongan Absensi = (Gaji Pokok / Hari Kerja Bulan Ini) × Jumlah Hari Tidak Masuk Tanpa Izin
- Potongan Keterlambatan = flat cut sesuai rules
- Lembur = Dihitung jika ada input lembur yang diapprove

### 8.2 Komponen Payroll

```
PENGHASILAN:
  + Gaji Pokok
  + Tunjangan Tetap (transport, makan, jabatan, dll.)
  + Tunjangan Tidak Tetap (lembur, insentif, bonus)
  
POTONGAN:
  - Potongan Keterlambatan
  - Potongan Absensi
  - BPJS Kesehatan (karyawan: 1%, perusahaan: 4%)
  - BPJS Ketenagakerjaan (karyawan: 3%, perusahaan: 3.7%)
  - PPh 21 (per perhitungan PTKP/PKP)
  - Potongan lain (cicilan koperasi, dll.)
  
TAKE HOME PAY = Total Penghasilan - Total Potongan
```

### 8.3 Alur Proses Payroll

```
1. HR Admin memulai "Payroll Run" → pilih periode (misal: Okt 2026)
2. Sistem mengumpulkan data:
   - Rekap kehadiran + keterlambatan
   - Lembur yang sudah diapprove
   - Izin/cuti berbayar/tidak berbayar
3. Sistem kalkulasi otomatis per karyawan
4. HR Staff review hasil kalkulasi
5. HR Admin final approval
6. Status: DRAFT → REVIEWED → APPROVED → PAID
7. Generate slip gaji per karyawan
8. Karyawan notifikasi + bisa unduh slip
```

### 8.4 Komponen Dinamis per Karyawan
- Setiap karyawan bisa punya komponen tunjangan berbeda (misal: tunjangan jabatan untuk level tertentu).
- Komponen bersifat aktif/nonaktif dengan tanggal efektif.
- Perubahan komponen tidak retroaktif — berlaku mulai periode berikutnya.

---

## 9. Fitur: Cetak Slip Gaji

### 9.1 Isi Slip Gaji

```
┌──────────────────────────────────────────────────────┐
│  [LOGO PERUSAHAAN]          SLIP GAJI                │
│  PT. Nama Perusahaan        Periode: Oktober 2026    │
├──────────────────────────────────────────────────────┤
│  Nama       : Budi Santoso                           │
│  NIK        : EMP-2024-0042                          │
│  Jabatan    : Operator Produksi                      │
│  Departemen : Produksi - Line A                      │
│  Bank       : BCA — 1234567890                       │
├────────────────────────┬─────────────────────────────┤
│  PENGHASILAN           │  POTONGAN                   │
│  Gaji Pokok 3.200.000  │  BPJS Kes.     32.000       │
│  T. Makan    600.000   │  BPJS TK       96.000       │
│  Lembur      240.000   │  Pot. Terlambat 50.000      │
│                        │  PPh 21         0           │
│  Total     4.040.000   │  Total         178.000      │
├────────────────────────┴─────────────────────────────┤
│  TAKE HOME PAY                          Rp 3.862.000 │
│  Terbilang: Tiga Juta Delapan Ratus Enam Puluh Dua  │
│             Ribu Rupiah                              │
├──────────────────────────────────────────────────────┤
│  Rekap Kehadiran:                                    │
│  Hadir: 22 hari | Terlambat: 2x | Izin: 0           │
│  Total Jam Kerja: 175.5 jam                         │
├──────────────────────────────────────────────────────┤
│  *Slip ini diterbitkan secara digital dan sah tanpa  │
│  tanda tangan basah.          [QR Verifikasi]        │
└──────────────────────────────────────────────────────┘
```

### 9.2 Format & Akses
- Format: PDF (via browser print / unduh langsung)
- Logo, warna header, dan nama perusahaan mengikuti konfigurasi tenant (dinamis)
- QR Code verifikasi keaslian slip (scan → cek ke sistem)
- Karyawan dapat mengunduh slip 3 bulan terakhir secara mandiri
- HR dapat cetak batch (semua karyawan sekaligus) atau per individu

---

## 10. Konfigurasi Tenant (Branding Dinamis)

Setiap perusahaan (tenant) dapat mengkustomisasi:

| Setting | Tipe | Deskripsi |
|---|---|---|
| `company_name` | string | Nama perusahaan |
| `company_logo_url` | url | Upload logo (PNG/SVG) |
| `primary_color` | hex | Warna utama (navbar, tombol primer) |
| `secondary_color` | hex | Warna aksen |
| `font_heading` | enum | Cabin (default) |
| `font_body` | enum | Albert Sans (default) |
| `slip_header_color` | hex | Warna header slip gaji |
| `app_favicon_url` | url | Favicon aplikasi |
| `timezone` | string | WIB / WITA / WIT |
| `currency` | string | IDR |

---

## 11. Notifikasi

| Trigger | Penerima | Channel |
|---|---|---|
| Jam clock-in hampir tiba (15 menit) | Karyawan | Push / WhatsApp |
| Berhasil clock-in | Karyawan | Push |
| Lupa clock-out (lewat jam shift) | Karyawan + Supervisor | Push + Email |
| Izin/cuti disetujui | Karyawan | Push + Email |
| Payroll run selesai | HR Admin | Email |
| Slip gaji tersedia | Karyawan | Push + Email |
| Karyawan absen tanpa izin | Supervisor | Push |
| GPS palsu terdeteksi | HR Admin | Email + Flag di dashboard |

---

## 12. Laporan & Dashboard

### 12.1 Dashboard HR Admin
- Ringkasan kehadiran hari ini (real-time): sudah hadir / belum / terlambat
- Grafik ketidakhadiran mingguan
- Status payroll run bulan berjalan
- Alert: karyawan dengan pelanggaran berulang

### 12.2 Laporan yang Tersedia
- **Laporan Rekap Kehadiran** — per karyawan / departemen / periode
- **Laporan Keterlambatan** — ranking karyawan, frekuensi, total menit
- **Laporan Lembur** — per karyawan, per departemen
- **Laporan Payroll** — summary & detail per karyawan
- **Laporan Potongan** — breakdown BPJS, pajak, potongan lain
- **Laporan Absensi Luar Radius** — karyawan yang sering di luar area

### 12.3 Export
- Format: CSV, Excel (.xlsx), PDF
- Filter: periode, departemen, lokasi, status karyawan

---

## 13. User Stories Utama

### Karyawan

| ID | Story |
|---|---|
| US-01 | Sebagai karyawan, saya ingin clock-in via GPS agar kehadiran tercatat otomatis tanpa antre mesin. |
| US-02 | Sebagai karyawan, saya ingin melihat jadwal shift saya minggu depan agar bisa merencanakan waktu. |
| US-03 | Sebagai karyawan, saya ingin mengunduh slip gaji bulan lalu tanpa harus ke HR. |
| US-04 | Sebagai karyawan, saya ingin tahu alasan potongan gaji saya bulan ini secara transparan. |
| US-05 | Sebagai karyawan, saya ingin mengajukan izin/cuti dari aplikasi dan tahu statusnya. |

### HR Admin

| ID | Story |
|---|---|
| US-10 | Sebagai HR Admin, saya ingin mengatur radius absensi per lokasi agar karyawan tidak bisa absen dari luar gedung. |
| US-11 | Sebagai HR Admin, saya ingin mengkonfigurasi rules keterlambatan per grade agar berbeda antara produksi dan manajemen. |
| US-12 | Sebagai HR Admin, saya ingin generate payroll satu klik dan sistem otomatis kalkulasi semua komponen. |
| US-13 | Sebagai HR Admin, saya ingin mencetak slip gaji batch untuk semua karyawan sekaligus. |
| US-14 | Sebagai HR Admin, saya ingin mendapat notifikasi jika ada karyawan yang terdeteksi menggunakan GPS palsu. |

---

## 14. Acceptance Criteria Utama

| Fitur | Kriteria Diterima |
|---|---|
| Clock-in geolokasi | GPS akurasi ≥ 20m; timestamp dicatat UTC; koordinat tersimpan; status VALID/OUTSIDE/MOCK_GPS |
| Modal luar radius | Muncul dalam < 1 detik setelah posisi terdeteksi di luar radius; tampilkan jarak aktual |
| Payroll kalkulasi | Selisih kalkulasi manual vs sistem ≤ Rp 0 (zero error); unit test coverage ≥ 95% |
| Slip gaji PDF | Generate ≤ 3 detik per slip; data akurat sesuai payroll run yang diapprove |
| Branding dinamis | Perubahan warna & logo live tanpa deploy ulang; berlaku di seluruh halaman termasuk PDF |
| Role access | Tidak ada endpoint yang bisa diakses tanpa token + role check; uji penetrasi dasar |

---

## 15. Asumsi & Keterbatasan

- Sistem ini berbasis web-first; mobile melalui browser (PWA-ready).
- Akurasi GPS perangkat adalah tanggung jawab perangkat karyawan; sistem mencatat akurasi yang dilaporkan.
- Kalkulasi PPh 21 menggunakan metode gross-up standar; skema pajak terupdate sesuai regulasi berlaku.
- Multi-tenancy dengan isolasi data penuh antar tenant.
- Timezone default WIB; dapat dikonfigurasi per tenant.
