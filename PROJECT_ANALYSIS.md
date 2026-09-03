# Aplikasi Audit - Project Analysis

**Tanggal Analisis:** 2026-09-03  
**Nama Project:** aplikasi-audit  
**Versi:** 0.1.0  
**Scope:** Arsitektur aplikasi, database, modul audit, COBIT Design Factor, evidence, approval workflow, CAPA, autentikasi, dan catatan pengembangan.

---

## 1. Executive Summary

Aplikasi Audit adalah platform audit internal PT Genetika Solusi Bisnis untuk mengelola audit ISO, COBIT, dan framework audit lain. Sistem ini dibangun sebagai aplikasi full-stack Next.js dengan PostgreSQL dan Prisma, mencakup manajemen user, perusahaan, tipe audit, pertanyaan audit, pelaksanaan audit, unggah evidence, temuan, approval, CAPA, serta assessment COBIT Design Factor.

Kekuatan utama project:

- Struktur modul sudah jelas antara dashboard, audit, design factor, CAPA, user, company, dan audit type.
- Database cukup matang dengan relasi, enum status, indeks, dan constraint unik.
- Role sudah dibedakan menjadi `ADMIN`, `AUDITOR`, dan `AUDITEE`.
- Evidence upload sudah memiliki validasi ukuran, ekstensi, magic bytes, checksum SHA-256, dan pembatasan konten aktif.
- COBIT memiliki fitur khusus untuk scope objektif, BUMN 24 objectives, dan hasil Design Factor DF01-DF10.
- Approval workflow sudah menyimpan log keputusan untuk audit dan design factor.
- Activity log tersedia untuk audit trail operasional.

Area yang masih bisa diperkuat:

- Belum terlihat middleware proteksi global; proteksi akses masih banyak dilakukan di page/action.
- Belum ada automated test yang eksplisit di `package.json`.
- Session memakai HMAC cookie custom, sudah sederhana dan efektif, tetapi perlu hardening konfigurasi production.
- Validasi form masih banyak manual di server action, belum memakai schema validation terpusat.
- File storage masih lokal di folder `storage/`, sehingga deployment production perlu strategi persistent storage.

---

## 2. Technology Stack

Core stack:

- **Next.js 16.2.9** dengan App Router.
- **React 19.2.1** dan **React DOM 19.2.1**.
- **TypeScript 5.6.3**.
- **PostgreSQL** sebagai database utama.
- **Prisma 6.19.3** sebagai ORM dan migration tool.

Library utama:

- **bcryptjs** untuk password hashing.
- **lucide-react** untuk ikon UI.
- **Node crypto** untuk session signing dan checksum evidence.

Tooling:

- `npm run dev` untuk development server.
- `npm run build` untuk production build.
- `npm run db:migrate`, `db:generate`, `db:seed`, dan `db:studio` untuk workflow Prisma.
- `npm run df:resync` untuk sinkronisasi ulang audit berbasis Design Factor.

---

## 3. Project Architecture

Struktur project memakai pola Next.js App Router:

```text
app/
  login/                    Halaman dan action login
  dashboard/                Area utama setelah login
    audits/                 Audit planning, response, finding, summary
    audit-types/            Master framework dan template pertanyaan
    cobit-audits/           Tampilan khusus audit COBIT
    companies/              Master perusahaan
    users/                  Master user dan role
    design-factors/         COBIT Design Factor assessment dan report
    capa/                   Corrective and preventive action
    logs/                   Activity log
  api/
    evidence/               Download evidence file
    audit-question-template Template pertanyaan
    session-debug/          Debug session

components/                 Shared React components
lib/                        Shared server/client utilities
  cobit/                    Perhitungan dan scope COBIT
prisma/                     Schema, migration, seed
storage/                    Evidence upload lokal
public/                     Logo dan asset publik
```

Pola implementasi utama:

- **Server Components** digunakan untuk fetch data langsung dari Prisma di halaman dashboard.
- **Server Actions** digunakan untuk create/update/delete dan transisi workflow.
- **Prisma Client** dibungkus di `lib/prisma.ts`.
- **Shared shell/layout** dashboard berada di `components/admin-shell.tsx`.
- **Activity logging** dipusatkan di `lib/activity-log.ts`.

---

## 4. Core Modules

### User & Access

User memiliki role `ADMIN`, `AUDITOR`, dan `AUDITEE`. Admin mengelola master data dan approval, auditor menangani audit/review, auditee mengisi response dan evidence. Relasi user juga dipakai untuk assignment audit, Design Factor, CAPA ownership, dan approval log.

### Company Management

Modul company menyimpan nama perusahaan, kode, kontak, industri, NPWP/tax ID, PIC, alamat, status aktif, dan jumlah audit aktif. Nama dan kode perusahaan dibuat unik.

### Audit Type & Question Template

Audit Type mewakili framework atau standar seperti ISO dan COBIT. Setiap audit type memiliki daftar `AuditQuestion` dengan clause, title, requirement, question, dan sort order. Saat audit dibuat, pertanyaan dari template dikopikan menjadi `AuditResponse` awal.

### Audit Execution

Audit memiliki mode:

- `GAP_ASSESSMENT`
- `AUDIT`

Status audit:

- `DRAFT`
- `IN_PROGRESS`
- `COMPLETED`
- `REVIEWED`
- `APPROVED`

Audit dibuat dengan perusahaan, audit type, auditor, auditee, tanggal mulai, dan description. Untuk audit COBIT, sistem dapat membatasi pertanyaan berdasarkan scope objektif COBIT.

### Audit Response & Evidence

Auditee mengisi response per pertanyaan dengan compliance:

- `COMPLY`
- `NOT_COMPLY`
- `NA`

Evidence disimpan sebagai file lokal dan metadata database. Sistem membatasi maksimal 5 file per pertanyaan, 10 MB per file, total 50 MB, serta hanya menerima format PDF, gambar, Word, Excel, CSV, dan TXT.

### Finding & CAPA

Audit finding memakai level:

- `MAJOR`
- `MINOR`
- `OFI`
- `PASS`

Untuk audit ISO mode `AUDIT`, temuan `MAJOR` dan `MINOR` yang sudah submitted dapat otomatis dibuatkan CAPA. CAPA memiliki status `OPEN`, `IN_PROGRESS`, `VERIFICATION`, `CLOSED`, dan `REJECTED`.

### Approval Workflow

Audit dan Design Factor memakai approval log bersama melalui `AuditApprovalLog`. Keputusan yang didukung:

- `REVIEW`
- `APPROVE`
- `REJECT`
- `REOPEN`

Audit dapat berpindah dari `IN_PROGRESS` atau `COMPLETED` ke `REVIEWED`, lalu ke `APPROVED`. Jika ditolak, status kembali ke `IN_PROGRESS` dan beberapa field review/approval direset.

### COBIT Design Factor

Design Factor Assessment mengelola DF01 sampai DF10, termasuk input auditee/auditor, saved state, report content, objective result, dan status submission per faktor. Perhitungan COBIT berada di `lib/cobit/designFactorMatrix.ts`, sedangkan pemilihan scope audit COBIT berada di `lib/cobit/auditScope.ts`.

Scope COBIT yang didukung:

- `ALL_40`: seluruh 40 objektif COBIT.
- `BUMN_24`: subset 24 objektif COBIT untuk konteks BUMN.
- `DESIGN_FACTOR`: objektif yang diadopsi dari hasil Design Factor.

---

## 5. Database Overview

Model inti:

- `User`: akun, role, status aktif, companyName, assigned audit count.
- `Company`: data organisasi yang diaudit.
- `AuditType`: master framework/standar audit.
- `AuditQuestion`: template pertanyaan per audit type.
- `Audit`: program audit dan status workflow.
- `AuditAssignment`: relasi audit dengan auditor dan auditee.
- `AuditResponse`: jawaban auditee per pertanyaan.
- `EvidenceFile`: metadata file evidence, checksum, versi, path download.
- `AuditFinding`: temuan audit dan rekomendasi.
- `CapaAction`: tindakan korektif/preventif untuk finding.
- `AuditApprovalLog`: riwayat review, approve, reject, reopen.
- `ActivityLog`: audit trail aktivitas user.
- `DesignFactorAssessment`: assessment COBIT Design Factor.
- `DesignFactorDf01Input` sampai `DesignFactorDf10Input`: input per faktor.
- `DesignFactorObjectiveResult`: hasil prioritas dan capability per objektif COBIT.

Catatan desain database:

- Banyak tabel memakai `cuid()` untuk primary key.
- Nama tabel database menggunakan snake_case via `@@map`.
- Field aplikasi menggunakan camelCase dan dipetakan dengan `@map`.
- Relasi penting sudah diberi indeks, misalnya audit status, company name, assigned user, evidence checksum, dan objective.
- Constraint unik dipakai untuk mencegah duplikasi assignment, response per pertanyaan, dan result per objective.

---

## 6. Security & Authentication

Autentikasi menggunakan email dan password hash bcrypt. Setelah login, sistem membuat session cookie `audit_admin_session` berisi token custom dengan format versi, user ID, dan signature HMAC SHA-256.

Karakteristik keamanan yang sudah ada:

- Password disimpan sebagai `passwordHash`, bukan plaintext.
- Session cookie `httpOnly`, `sameSite: lax`, path root, dan max age 8 jam.
- Secure cookie aktif jika `AUTH_COOKIE_SECURE=true` atau `APP_URL` memakai HTTPS.
- Signature diverifikasi dengan `timingSafeEqual`.
- User nonaktif tidak bisa login atau mengakses session aktif.
- Banyak server action mengecek role sebelum menjalankan mutasi.
- Evidence upload memvalidasi ekstensi, MIME, magic bytes, checksum, ukuran, dan konten aktif.

Hal yang perlu diperhatikan:

- Fallback `development-session-secret` sebaiknya tidak pernah dipakai di production.
- Proteksi route akan lebih kuat bila ada middleware global untuk area dashboard.
- Role-based access control sudah ada, tetapi aturan akses masih tersebar di beberapa page/action.
- API download evidence perlu dipastikan hanya bisa diakses oleh user yang berhak terhadap audit terkait.

---

## 7. Main Workflows

### Audit ISO / Framework Umum

1. Admin membuat company, user auditor/auditee, audit type, dan pertanyaan.
2. Admin membuat audit dan memilih auditor serta auditee.
3. Sistem membuat assignment dan response awal untuk setiap pertanyaan.
4. Auditee mengisi compliance, deskripsi, catatan, dan evidence.
5. Auditor/Admin mengisi finding dan rekomendasi.
6. Audit direview dan diapprove oleh Admin.
7. Untuk temuan major/minor pada audit ISO, sistem dapat membuat CAPA.
8. CAPA dikerjakan, diverifikasi, lalu ditutup.

### Audit COBIT

1. Admin membuat audit type COBIT dan pertanyaan dengan clause objektif seperti `APO12`.
2. Saat membuat audit, Admin memilih scope `ALL_40`, `BUMN_24`, atau `DESIGN_FACTOR`.
3. Sistem memfilter pertanyaan berdasarkan objektif COBIT yang relevan.
4. Response dan finding berjalan seperti audit biasa.
5. Summary/report menampilkan konteks capability COBIT.

### COBIT Design Factor

1. Admin membuat Design Factor Assessment untuk perusahaan, auditor, dan auditee.
2. Auditee dan auditor mengisi DF01-DF10.
3. Sistem menghitung priority score dan suggested capability untuk objektif COBIT.
4. Assessment disubmit, direview, dan diapprove.
5. Hasilnya dapat dipakai sebagai scope audit COBIT berbasis Design Factor.

---

## 8. Reporting

Project memiliki utilitas PDF report di `lib/report-pdf.ts`. Report menghasilkan ringkasan eksekutif, statistik, distribusi hasil, tabel detail, rekomendasi auditor, serta layout berbeda untuk audit COBIT dan non-COBIT.

Design Factor juga memiliki halaman report khusus di:

```text
app/dashboard/design-factors/[id]/report/
```

Konten narasi report Design Factor disimpan dalam field JSON `reportContent`, termasuk narasi metodologi, profil, implikasi, roadmap, executive summary, dan logo perusahaan.

---

## 9. Coding Style & Conventions

Konvensi yang terlihat:

- Bahasa UI mayoritas Indonesia.
- Server actions memakai return state sederhana berisi toast success/error.
- Validasi input dilakukan di server action sebelum operasi Prisma.
- Setelah mutasi, halaman terkait direfresh dengan `revalidatePath`.
- Activity log ditulis setelah aksi penting.
- Enum Prisma dipakai untuk status dan role.
- Field database memakai snake_case, sedangkan TypeScript memakai camelCase.
- Modul COBIT dipisah dari modul audit umum agar logic perhitungan tidak tercampur dengan UI.

---

## 10. Development Recommendations

Prioritas tinggi:

- Tambahkan middleware proteksi `/dashboard` dan API sensitif.
- Pastikan `AUTH_SECRET` wajib di production dan tidak fallback ke secret development.
- Tambahkan test minimal untuk login/session, audit creation, evidence validation, approval transition, dan Design Factor calculation.
- Audit ulang authorization untuk evidence download dan setiap server action yang mengubah data.

Prioritas menengah:

- Pusatkan validasi form dengan schema agar aturan input konsisten.
- Tambahkan storage adapter untuk production, misalnya S3-compatible object storage.
- Tambahkan pagination/filter yang konsisten untuk audit log, CAPA, dan daftar audit besar.
- Buat seed data demo yang mencakup ISO, COBIT, auditor, auditee, response, finding, dan CAPA.

Prioritas rendah:

- Tambahkan dokumentasi arsitektur singkat untuk onboarding developer.
- Buat changelog migration penting.
- Tambahkan export Excel/CSV untuk audit result dan CAPA tracking.
- Tambahkan notifikasi deadline audit/CAPA.

---

## 11. Quick Setup

```bash
npm install
createdb aplikasi_audit
npm run db:migrate
npm run db:seed
npm run dev
```

Environment minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/aplikasi_audit?schema=public"
AUTH_SECRET="isi-dengan-secret-panjang"
ADMIN_NAME="Administrator GSB"
ADMIN_EMAIL="admin@genetika.co.id"
ADMIN_PASSWORD="admin123"
```

Default akses dari README:

- URL: `http://localhost:3000`
- Email: `admin@genetika.co.id`
- Password: `admin123`

---

## 12. Kesimpulan

Project ini sudah berada pada fondasi yang kuat untuk aplikasi audit internal: model data lengkap, workflow audit jelas, evidence handling cukup aman, dan modul COBIT Design Factor sudah spesifik terhadap kebutuhan domain. Fokus pengembangan berikutnya sebaiknya diarahkan ke hardening security, automated tests, konsolidasi authorization, dan kesiapan deployment production.
