# Aplikasi Audit

Platform audit internal PT Genetika Solusi Bisnis untuk pengelolaan audit ISO,
COBIT, dan framework audit lainnya.

## Setup PostgreSQL + Prisma

Install dependency:

```bash
npm install
```

Buat database PostgreSQL lokal:

```bash
createdb aplikasi_audit
```

Buat file `.env` dari `.env.example`, lalu sesuaikan `DATABASE_URL`.

Contoh tanpa password lokal:

```env
DATABASE_URL="postgresql://genesis@localhost:5432/aplikasi_audit?schema=public"
```

Contoh dengan username/password:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aplikasi_audit?schema=public"
```

Isi admin awal:

```env
ADMIN_NAME="Administrator GSB"
ADMIN_EMAIL=admin@genetika.co.id
ADMIN_PASSWORD=admin123
AUTH_SECRET=ganti-dengan-secret-yang-panjang
```

Jalankan migration dan seed:

```bash
npm run db:migrate -- --name init
npm run db:seed
```

Jalankan aplikasi:

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Login Awal

Default seed admin:

- Email: `admin@genetika.co.id`
- Password: `admin123`

Login sekarang membaca user dari tabel `users` PostgreSQL melalui Prisma.
