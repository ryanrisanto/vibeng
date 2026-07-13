import { Elysia, t } from "elysia";
import { registerUser, getCurrentUser } from "../services/users-service";

export const usersRoute = new Elysia()
  .post(
    "/api/users",
    async ({ body, set }) => {
      try {
        const data = await registerUser(body);
        return { data };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message || "Email sudah terdaftar" };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String(),
        password: t.String({ minLength: 1 }),
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
  );
