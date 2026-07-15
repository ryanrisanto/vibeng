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
      response: {
        200: t.Object({
          data: t.String({ description: "Success response value" }),
        }),
        400: t.Object({
          error: t.String({ description: "Email already registered" }),
        }),
        500: t.Object({
          error: t.String({ description: "Internal server error" }),
        }),
      },
      detail: {
        tags: ["Users"],
        summary: "Register User",
        description: "Registers a new user account with input length checks.",
      },
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
    },
    {
      response: {
        200: t.Object({
          data: t.Object({
            id: t.Numeric({ description: "User ID" }),
            name: t.String({ description: "User full name" }),
            email: t.String({ description: "User email address" }),
            created_at: t.Any({ description: "User creation date" }),
          }),
        }),
        401: t.Object({
          error: t.String({ description: "Unauthorized access" }),
        }),
      },
      detail: {
        tags: ["Users"],
        summary: "Get Current User Profile",
        description: "Retrieves detail profile info of the currently logged-in user.",
        security: [{ BearerAuth: [] }],
      },
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
    },
    {
      response: {
        200: t.Object({
          data: t.String({ description: "Success response value" }),
        }),
        401: t.Object({
          error: t.String({ description: "Unauthorized access" }),
        }),
      },
      detail: {
        tags: ["Users"],
        summary: "Logout User",
        description: "Logs out the user and invalidates their session token in the database.",
        security: [{ BearerAuth: [] }],
      },
    }
  );
