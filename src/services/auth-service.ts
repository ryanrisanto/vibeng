import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export interface LoginPayload {
  email: string;
  password: string;
}

export async function loginUser(payload: LoginPayload): Promise<string> {
  // 1. Fetch user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.email))
    .limit(1);

  if (!user) {
    throw new Error("Email atau password salah atau user tidak terdaftar");
  }

  // 2. Verify password with bcrypt hash
  const isPasswordValid = await Bun.password.verify(payload.password, user.password);
  if (!isPasswordValid) {
    throw new Error("Email atau password salah atau user tidak terdaftar");
  }

  // 3. Generate random UUID session token
  const sessionToken = crypto.randomUUID();

  // 4. Calculate expiration date (e.g., 7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 5. Insert new session into the database
  await db.insert(sessions).values({
    userId: user.id,
    sessionToken,
    expiresAt,
  });

  return sessionToken;
}
