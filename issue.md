# Implementasi Fitur Get Current User

## 🎯 Tujuan
Tugas ini bertujuan untuk membangun backend API guna mendapatkan data profil pengguna yang sedang login saat ini. Fokus utama mencakup pembuatan endpoint `GET /api/users/current`, ekstraksi token dari _header_ `Authorization`, dan validasi token tersebut ke dalam tabel `sessions` sebelum mengembalikan data dari tabel `users`.

---

## 1. 🌐 Spesifikasi API Endpoint

- **URL:** `/api/users/current`
- **Method:** `GET`

### Headers (Wajib)
Endpoint ini dilindungi dan membutuhkan token _session_ (UUID) yang disisipkan di *header* `Authorization` menggunakan format *Bearer*.
```json
{
    "Authorization": "Bearer <token_uuid_dari_proses_login>"
}
```

### Response Body - Berhasil (200 OK)
Jika token valid, tidak kedaluwarsa, dan pengguna ditemukan di database, maka data pengguna akan dikembalikan (tanpa mengembalikan kata sandi).
```json
{
    "data": {
        "id": 1,
        "name": "ryan",
        "email": "ryan@localhost",
        "created_at": "2026-07-13T12:17:41.000Z"
    }
}
```

### Response Body - Gagal (401 Unauthorized)
Jika token tidak disertakan, format salah, token tidak ditemukan di tabel `sessions`, atau token sudah kedaluwarsa (berdasarkan `expires_at`). Demi keamanan, pesan *error* harus diseragamkan.
```json
{
    "error": "Unauthorized"
}
```

---

## 2. 📂 Struktur Folder dan Penamaan File
Sesuai standar yang digunakan:
1. **Routing Layer (`src/routes/`):**
   - **Saran Penamaan:** Tambahkan pada `users-route.ts` (karena URL-nya `/api/users/current`) atau `auth-route.ts`.
   - **Tanggung Jawab:** Mengekstrak *header* `Authorization`, memisahkan string "Bearer " dan nilai token, melempar _error_ jika header kosong, memanggil fungsi dari _service_, dan memformat pengembalian respons API.
2. **Service Layer (`src/services/`):**
   - **Saran Penamaan:** Tambahkan pada `users-service.ts` atau `auth-service.ts`.
   - **Tanggung Jawab:** Melakukan validasi database. Mencari token di tabel `sessions`, memverifikasi bahwa token belum kedaluwarsa, melakukan _join_ atau _query_ lanjutan ke tabel `users` untuk mengambil informasi pengguna (`id`, `name`, `email`, dan `createdAt`), lalu mengembalikannya ke layer _route_.

---

## 3. 🛠️ Tahapan Implementasi Detail (Step-by-Step)

Ikuti langkah-langkah di bawah ini untuk mempermudah implementasi fitur:

### Step 1: Implementasi Service Layer
- Buka file _service_ yang relevan (misal `src/services/users-service.ts`).
- Buat dan ekspor fungsi asinkron bernama `getCurrentUser(token: string)`.
- **Logika di dalam fungsi `getCurrentUser`:**
  1. Lakukan *query* ke database untuk mencari sesi di tabel `sessions` berdasarkan kolom `session_token` yang nilainya sama dengan argumen `token`.
  2. Jika data sesi tidak ditemukan, segera lempar _error_ dengan pesan `Unauthorized`.
  3. Lakukan **Validasi Waktu (Expiration):** Cek apakah waktu saat ini (`new Date()`) sudah melewati nilai waktu pada kolom `expires_at` dari sesi tersebut. Jika iya, lempar _error_ `Unauthorized`. *(Opsional: Sesi yang kedaluwarsa dapat dihapus juga).*
  4. Jika sesi valid, ambil nilai `user_id` dari sesi tersebut dan lakukan *query* _select_ ke tabel `users` untuk menemukan data lengkap dari _user_.
  5. Jika *user* valid, kembalikan objek data yang memuat `id`, `name`, `email`, dan `createdAt`. **PENTING:** Pastikan kolom `password` sama sekali tidak diikutkan ke dalam balasan pengembalian (_return_).

### Step 2: Implementasi Route Layer
- Buka file _route_ yang relevan (misal `src/routes/users-route.ts`).
- Definisikan *endpoint* baru: `.get('/api/users/current', ...)`
- **Di dalam *handler* tersebut:**
  1. Dapatkan nilai _header_ `Authorization`. (Pada Elysia, Anda dapat memanfaatkan destructuring `headers` pada parameter *handler*).
  2. Lakukan pengecekan: Jika _header_ tersebut *undefined*, kosong, atau tidak diawali dengan string "Bearer ", ubah HTTP status (`set.status = 401`) dan langsung _return_ `{"error": "Unauthorized"}`.
  3. Jika terdeteksi, ekstrak token asli dengan membuang prefix "Bearer ".
  4. Bungkus pemanggilan *service* dalam blok `try...catch`. Di dalam `try`, panggil `await getCurrentUser(token)` yang dibuat di Step 1.
  5. Jika sukses, kembalikan objek data berformat `{"data": hasil_data_user}`.
  6. Di dalam `catch (error)`, set HTTP Status ke `401` dan pastikan membalas respons konstan `{"error": "Unauthorized"}`.

### Step 3: Pengujian (Testing)
1. **Persiapan:** Pastikan server berjalan dan jalankan API `/api/login` (POST) terlebih dahulu untuk menerima string UUID _session token_ baru yang berstatus aktif.
2. **Uji Kasus Berhasil:** Gunakan `curl` atau _tools_ semacam Postman. Buat HTTP GET request ke `/api/users/current`, dan sertakan *header* di pengaturan request: `Authorization: Bearer <TOKEN_UUID>`. 
   - _Ekspektasi:_ Server membalas (200 OK) berisi objek properti identitas dari *user*.
3. **Uji Kasus Gagal 1 (Tanpa Header):** Lakukan pemanggilan *request* tanpa mencantumkan header `Authorization` sama sekali.
   - _Ekspektasi:_ `{"error": "Unauthorized"}` dengan HTTP Status 401.
4. **Uji Kasus Gagal 2 (Token Invalid):** Lakukan *request* dengan menyisipkan header `Authorization: Bearer nilai_token_sembarang_yang_tidak_ada`.
   - _Ekspektasi:_ `{"error": "Unauthorized"}` dengan HTTP Status 401.
