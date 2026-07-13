# Implementasi Fitur Login User & Manajemen Sesi

## 🎯 Tujuan
Tugas ini bertujuan untuk membangun backend API fitur login pengguna. Fokus utama mencakup pembuatan tabel `sessions` di database untuk menyimpan sesi aktif, pembuatan _service layer_ untuk memverifikasi kredensial pengguna (email & password), pembuatan token _session_ (UUID), serta pembuatan endpoint API `/api/login` menggunakan framework **ElysiaJS**.

---

## 1. 🗄️ Skema Database (Drizzle ORM)
Kita membutuhkan tabel baru bernama `sessions` untuk melacak status login pengguna. Berdasarkan konfigurasi proyek yang menggunakan **Drizzle ORM**, berikut spesifikasi tabelnya:

**Nama Tabel:** `sessions`

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `user_id` | `integer` | Not Null, Foreign Key | Merujuk (FK) ke kolom `id` di tabel `users`. |
| `session_token` | `varchar(255)` | Not Null, Unique | Menyimpan UUID unik sebagai penanda sesi pengguna yang aktif. |
| `expires_at` | `timestamp` | Not Null | Waktu kedaluwarsa sesi tersebut (misal: waktu saat login ditambah beberapa hari). |
| `created_at` | `timestamp` | Default: `now()` | Waktu saat sesi pertama kali dibuat (waktu login). |

**Tugas di langkah ini:**
1. Buka file skema database (misal: `src/db/schema.ts`).
2. Definisikan tabel `sessions` menggunakan syntax Drizzle (pastikan untuk menyertakan referensi _foreign key_ ke tabel `users`).
3. Jalankan perintah Drizzle (misal: `bunx drizzle-kit push`) untuk melakukan sinkronisasi tabel baru tersebut ke dalam database MySQL.

---

## 2. 🌐 Spesifikasi API Endpoint
Endpoint ini bertugas menerima input kredensial, memvalidasinya, dan jika sukses, mengembalikan token sesi (berupa UUID).

- **URL:** `/api/login`
- **Method:** `POST`
- **Content-Type:** `application/json`

### Request Body (Payload)
Gunakan validasi bawaan ElysiaJS (TypeBox melalui `t.Object`) untuk memastikan *body request* memiliki struktur yang tepat.

```json
{
    "email": "ryan@localhost",
    "password": "rahasia"
}
```
*Syarat Validasi Elysia:* Kedua _field_ (`email` dan `password`) bertipe String dan wajib disertakan.

### Response Body - Berhasil (200 OK)
Dikembalikan jika email yang diinput terdaftar di sistem dan password cocok dengan hash yang tersimpan di database.
```json
{
    "data": "123e4567-e89b-12d3-a456-426614174000"
}
```
*(Catatan: Nilai pada properti `data` adalah *string* dari UUID unik yang baru saja di-generate)*

### Response Body - Gagal (400 Bad Request / 401 Unauthorized)
Dikembalikan jika kredensial salah. Demi alasan keamanan, pesan kesalahan tidak boleh memberi tahu *client* secara spesifik apakah email-nya yang tidak ada atau password-nya yang salah.
```json
{
    "error": "Email atau password salah atau user tidak terdaftar"
}
```

---

## 3. 📂 Struktur Folder dan Penamaan File
Lanjutkan pendekatan arsitektur yang sudah ada dengan pemisahan antara *Route* dan *Service* di direktori `src`:

1. **Routing Layer (`src/routes/`):**
   - **Saran Penamaan File:** `auth-route.ts` atau buat _group_ rute baru bernama `login-route.ts`.
   - **Tanggung Jawab:** Menerima _HTTP request_, melakukan validasi data masuk (payload login), memanggil fungsi di _service layer_, menangani _error handling_, serta memformat dan mengembalikan _HTTP response_.

2. **Service Layer (`src/services/`):**
   - **Saran Penamaan File:** `auth-service.ts` atau `login-service.ts`.
   - **Tanggung Jawab:** Memproses murni logika bisnis (tidak tahu-menahu tentang urusan HTTP). Hal yang dilakukan antara lain: mencari data _user_, membandingkan (_verify_) kecocokan *password*, membuat UUID untuk token, menghitung waktu _expired_, dan menyimpannya ke tabel `sessions`.

---

## 4. 🛠️ Tahapan Implementasi Detail (Step-by-Step)

Untuk mempermudah pelaksanaan, jalankan implementasi dengan urutan berikut ini:

### Step 1: Pembaruan Skema Database & Migrasi
- Buka `src/db/schema.ts` dan tambahkan definisi untuk tabel `sessions`. 
- Gunakan fitur _Foreign Key_ Drizzle (misal: `.references(() => users.id)`) untuk menghubungkan kolom `user_id` ke tabel `users`.
- Eksekusi *push/migrate* skema database agar tabel baru langsung terbuat secara fisik di MySQL.

### Step 2: Implementasi Service Layer
- Buat file service baru (misalnya `src/services/auth-service.ts`).
- Buat dan *export* fungsi `loginUser(payload)` dengan tahapan:
  1. Cari keberadaan user di tabel `users` berdasarkan input `payload.email`.
  2. Jika fungsi ORM mengembalikan nilai _null_ (user tidak ditemukan), *throw error* dengan pesan "Email atau password salah atau user tidak terdaftar".
  3. Lakukan pengecekan *password* menggunakan library pengecek hash bawaan (contoh di Bun: `await Bun.password.verify(payload.password, user.password)`).
  4. Jika hasil pengecekan password me-return `false`, lempar _error_ persis seperti pada poin ke-2.
  5. Jika pengecekan sukses, *generate* token acak menggunakan metode bawaan runtime (misal `crypto.randomUUID()`).
  6. Kalkulasi waktu kedaluwarsa token (`expires_at`), contoh: waktu saat login + 7 hari.
  7. Lakukan proses *insert* data ( `user_id`, `session_token`, `expires_at` ) ke dalam tabel `sessions`.
  8. Kembalikan *string* `session_token` tersebut.

### Step 3: Implementasi Route Layer
- Buat file *route* (misalnya `src/routes/auth-route.ts`).
- Buat rute baru dengan Elysia: `.post('/api/login', ...)`
- Pasang validasi _body request_ menggunakan `t.Object({ email: t.String(), password: t.String() })`.
- Dalam *handler* API tersebut, jalankan fungsi `loginUser()` dari _service_.
- Jika menemui *error* (pada blok _catch_), ubah HTTP Status Code menjadi `400` atau `401`, dan kirimkan respons `{"error": "Pesan dari service..."}`.
- Jika berhasil (tanpa error), kirimkan respons JSON berformat `{"data": "token_string_uuid"}`.

### Step 4: Menghubungkan Rute ke Aplikasi Utama
- Buka file *entry point* (misal `src/index.ts`).
- Import *route* login yang baru dibuat.
- Sambungkan _route_ tersebut menggunakan *method* `.use()` pada *instance* utama aplikasi ElysiaJS.

### Step 5: Tahap Pengujian (Testing)
1. Pastikan server lokal berjalan (`bun run dev`).
2. **Uji Kasus Berhasil:** Gunakan REST Client/Postman/curl untuk me-Request `/api/login` menggunakan email & password akun yang sudah terdaftar. 
   - *Verifikasi:* Cek apakah _response_ berisi properti `data` (token UUID). Periksa ke database (tabel `sessions`) apakah _row_ baru benar-benar tersimpan dengan nilai yang sesuai.
3. **Uji Kasus Gagal (1):** Tembak endpoint dengan **email sembarang** yang belum ada di tabel `users`.
   - *Verifikasi:* Harus memunculkan *error* sesuai standar dan Status `400/401`.
4. **Uji Kasus Gagal (2):** Tembak endpoint dengan email yang terdaftar namun berikan **password yang salah**.
   - *Verifikasi:* Harus memunculkan respon *error* yang persis sama dengan kasus gagal (1) untuk menghindari *user enumeration attacks*.
