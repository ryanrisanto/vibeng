import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

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

export async function logoutUser(token: string): Promise<string> {
  await db.delete(sessions).where(eq(sessions.sessionToken, token));
  return "OK";
}
