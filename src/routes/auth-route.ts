import { Elysia, t } from "elysia";
import { loginUser } from "../services/auth-service";

export const authRoute = new Elysia().post(
  "/api/login",
  async ({ body, set }) => {
    try {
      const token = await loginUser(body);
      return { data: token };
    } catch (error: any) {
      set.status = 400;
      return { error: error.message || "Email atau password salah atau user tidak terdaftar" };
    }
  },
  {
    body: t.Object({
      email: t.String({ minLength: 1 }),
      password: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ["Auth"],
      summary: "Login User",
      description: "Authenticate user with email and password to retrieve a session token.",
    },
  }
);
