import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

/**
 * Mendaftarkan pengguna (user) baru ke dalam sistem.
 * 
 * Fungsi ini melakukan beberapa tahapan esensial:
 * 1. Menjalankan query ke database untuk memastikan alamat email belum terdaftar.
 * 2. Jika email sudah ada, fungsi akan menggagalkan proses dengan melempar error.
 * 3. Jika email tersedia, fungsi akan mengenkripsi (hash) password pengguna
 *    menggunakan algoritma bcrypt bawaan dari runtime Bun (dengan parameter cost 10).
 * 4. Menyimpan data nama, email, dan hash password secara permanen ke tabel `users`.
 *
 * @param payload - Objek berisi informasi registrasi (nama, email, dan password raw).
 * @returns {Promise<string>} Mengembalikan string "OK" apabila proses penyimpanan sukses.
 * @throws {Error} Akan melempar error "Email sudah terdaftar" apabila validasi duplikasi gagal.
 */
export async function registerUser(payload: RegisterPayload): Promise<string> {
  // 1. Check if email is already registered
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.email))
    .limit(1);

  if (existingUser) {
    throw new Error("Email sudah terdaftar");
  }

  // 2. Hash the password using Bun's native bcrypt hashing
  const hashedPassword = await Bun.password.hash(payload.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // 3. Insert user into database
  await db.insert(users).values({
    name: payload.name,
    email: payload.email,
    password: hashedPassword,
  });

  return "OK";
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: Date | null;
}

/**
 * Mengambil detail profil pengguna yang sedang login berdasarkan sesi aktifnya.
 * 
 * Fungsi ini melakukan operasi JOIN antara tabel `sessions` dan `users`
 * untuk memvalidasi keberadaan token serta langsung menarik data profil yang terkait.
 * Selain mengecek apakah token ada di database, fungsi ini juga memastikan
 * bahwa kolom `expiresAt` dari token tersebut belum terlewati (belum kedaluwarsa).
 *
 * @param token - String token sesi otentikasi (berupa UUID) yang didapat saat login.
 * @returns {Promise<UserProfile>} Objek berisi ID, nama, email, dan tanggal bergabung pengguna.
 * @throws {Error} Akan melempar error "Unauthorized" jika token tidak valid,
 *                 tidak ada di database, atau jika sesi telah melewati masa berlaku.
 */
export async function getCurrentUser(token: string): Promise<UserProfile> {
  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.sessionToken, token))
    .limit(1);

  if (!result) {
    throw new Error("Unauthorized");
  }

  // Check if session has expired
  if (result.expiresAt < new Date()) {
    throw new Error("Unauthorized");
  }

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    created_at: result.createdAt,
  };
}

/**
 * Mengakhiri sesi pengguna saat ini dengan cara memusnahkan token dari database.
 * 
 * Fungsi ini menginstruksikan database untuk menghapus baris pada tabel `sessions` 
 * yang cocok dengan token yang diberikan. Endpoint ini direkayasa agar bersifat 
 * idempotent; ini berarti proses penghapusan akan diamankan dan selalu mereturn sukses 
 * bahkan apabila token tersebut sudah tidak eksis sebelumnya. Hal ini mencegah error
 * ganda saat proses pembersihan garbage / sesi.
 *
 * @param token - String token sesi otentikasi (UUID) yang hendak dicabut hak aksesnya.
 * @returns {Promise<string>} Mengembalikan string "OK" untuk menandakan sesi berhasil diputus.
 */
export async function logoutUser(token: string): Promise<string> {
  await db.delete(sessions).where(eq(sessions.sessionToken, token));
  return "OK";
}
