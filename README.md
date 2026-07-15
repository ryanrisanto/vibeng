# Vibeng (User Authentication API)

Vibeng adalah layanan *backend* API (RESTful) untuk manajemen autentikasi pengguna (Registrasi, Login, Profil, dan Logout) yang dibangun dengan standar performa tinggi menggunakan ekosistem terbaru **Bun** dan **ElysiaJS**.

## 🛠️ Technology Stack
- **Runtime:** [Bun](https://bun.sh) (v1.3.x)
- **Framework:** [ElysiaJS](https://elysiajs.com/) (Web framework tercepat untuk Bun)
- **Database:** MySQL
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Testing:** Bun Test (Bawaan runtime Bun)
- **Language:** TypeScript

## 🏗️ Arsitektur & Struktur Folder

Aplikasi ini menggunakan pola arsitektur **Controller-Service** sederhana untuk memisahkan antara layer *routing* HTTP dengan layer *business logic* dan interaksi database.

```text
vibeng/
├── src/
│   ├── db/                 # Konfigurasi database & skema Drizzle ORM
│   │   ├── index.ts        # Koneksi adapter ke MySQL
│   │   └── schema.ts       # Definisi tabel (users, sessions)
│   ├── routes/             # (Controllers) Definisi API endpoint Elysia
│   │   ├── auth-route.ts   # Route spesifik login
│   │   └── users-route.ts  # Route registrasi, baca profile, dan logout
│   ├── services/           # (Services) Logika bisnis & eksekusi query
│   │   ├── auth-service.ts
│   │   └── users-service.ts
│   └── index.ts            # Entry point aplikasi (export app & registrasi rute)
├── tests/
│   └── api.test.ts         # Unit test menyeluruh untuk semua endpoint
├── drizzle/                # Otomatisasi riwayat migrasi database
├── .env                    # Variabel environment (Database URL, dll)
├── drizzle.config.ts       # Konfigurasi CLI Drizzle Kit
└── package.json            # Daftar dependencies
```

### Konvensi Penamaan (Naming Convention)
- **Folder:** *Lowercase* jamak (misalnya: `routes`, `services`, `tests`).
- **File TypeScript:** *Kebab-case* dengan sufiks perannya (misalnya: `users-route.ts`, `users-service.ts`, `api.test.ts`).

## 🗄️ Database Schema

Aplikasi ini memiliki 2 entitas tabel utama yang terhubung dengan *Foreign Key*:

1. **`users`**
   - `id` (INT, Primary Key, Auto Increment)
   - `name` (VARCHAR 255)
   - `email` (VARCHAR 255, Unique)
   - `password` (VARCHAR 255, Hashed dengan bcrypt)
   - `created_at` (TIMESTAMP)

2. **`sessions`**
   - `session_token` (VARCHAR 255, Primary Key / Unique Index, format UUID)
   - `user_id` (BIGINT, Foreign Key bertaut ke `users.id`)
   - `expires_at` (TIMESTAMP)
   - `created_at` (TIMESTAMP)

## 🚀 Cara Setup Project

1. **Clone repositori dan masuk ke direktori**
   ```bash
   git clone <repo-url>
   cd vibeng
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Konfigurasi Environment**
   Buat atau sesuaikan file `.env` di *root directory* dan isi dengan kredensial MySQL lokal Anda:
   ```env
   DATABASE_URL="mysql://root:password@localhost:3306/vibeng"
   PORT=3000
   ```

4. **Migrasi Database**
   Dorong skema Drizzle langsung ke *database* untuk membuatkan tabel secara otomatis:
   ```bash
   bunx drizzle-kit push
   ```

## 💻 Cara Menjalankan Aplikasi

Jalankan aplikasi di mode *development* (sudah mengaktifkan *hot-reload*):
```bash
bun run dev
```
Aplikasi akan bersiaga di alamat `http://localhost:3000`.

## 🧪 Cara Menjalankan Unit Test

Aplikasi ini telah dilindungi oleh *test suite* menggunakan kerangka pengujian bawaan Bun (`bun test`). 
Selama pengujian, *test suite* akan **menghapus secara bersih** (truncate/delete) isi tabel `users` dan `sessions` sebelum skenario dijalankan untuk memastikan tidak ada *state leak*.

Jalankan seluruh tes dengan perintah:
```bash
bun test
```

## 📡 Daftar API yang Tersedia

Seluruh _payload_ yang dikirim maupun balasan (response) menggunakan standar format `application/json`.

1. **`GET /`**
   - **Deskripsi:** Health Check untuk melihat apakah server berjalan mulus.
2. **`POST /api/users`**
   - **Deskripsi:** *Register User* / Pendaftaran akun baru. 
   - **Body:** `name`, `email`, dan `password`.
3. **`POST /api/login`**
   - **Deskripsi:** *Login User* / Autentikasi. 
   - **Body:** `email` dan `password`.
   - **Response:** Mengembalikan `session_token` berupa UUID.
4. **`GET /api/users/current`**
   - **Deskripsi:** Menarik profil profil pribadi pengguna.
   - **Headers:** Wajib melampirkan `Authorization: Bearer <session_token>`.
5. **`DELETE /api/users/logout`**
   - **Deskripsi:** Menghapus atau membatalkan masa berlaku *session* di database.
   - **Headers:** Wajib melampirkan `Authorization: Bearer <session_token>`.
6. **`GET /users`**
   - **Deskripsi:** (Utilitas Internal) Mendapatkan *list* dari seluruh baris data *user*.
