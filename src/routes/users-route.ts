import { Elysia, t } from "elysia";
import { registerUser, getCurrentUser, logoutUser } from "../services/users-service";

export const usersRoute = new Elysia()
  .post(
    "/api/users",
    async ({ body, set }) => {
      try {
        const data = await registerUser(body);
        return { data };
      } catch (error: any) {
        if (error.message === "Email sudah terdaftar") {
          set.status = 400;
          return { error: error.message };
        }
        set.status = 500;
        return { error: "Terjadi kesalahan internal pada server." };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        email: t.String({ maxLength: 255 }),
        password: t.String({ minLength: 1, maxLength: 255 }),
      }),
    }
  )
  .get(
    "/api/users/current",
    async ({ headers, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const token = authHeader.substring(7);
      try {
        const data = await getCurrentUser(token);
        return { data };
      } catch (error: any) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
    }
  )
  .delete(
    "/api/users/logout",
    async ({ headers, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const token = authHeader.substring(7);
      try {
        const data = await logoutUser(token);
        return { data };
      } catch (error: any) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
    }
  );
