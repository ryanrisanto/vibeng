import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { db } from "./db";
import { users } from "./db/schema";
import { usersRoute } from "./routes/users-route";
import { authRoute } from "./routes/auth-route";

export const app = new Elysia()
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Vibeng Authentication API",
          version: "1.0.0",
          description: "API Documentation for User Management and Authentication",
        },
        tags: [
          { name: "Auth", description: "Authentication endpoints" },
          { name: "Users", description: "User management endpoints" },
          { name: "General", description: "General utility endpoints" },
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "Enter your session token",
            },
          },
        },
      },
    })
  )
  .use(usersRoute)
  .use(authRoute)
  .get(
    "/",
    () => ({
      status: "ok",
      message: "Server is running smoothly",
    }),
    {
      response: {
        200: t.Object({
          status: t.String({ description: "Operational status" }),
          message: t.String({ description: "Success message info" }),
        }),
      },
      detail: {
        tags: ["General"],
        summary: "Server Health Check",
        description: "Returns the operational status of the server.",
      },
    }
  )
  .get(
    "/users",
    async () => {
      try {
        const allUsers = await db.select().from(users);
        return {
          success: true,
          data: allUsers,
        };
      } catch (error: any) {
        return {
          success: false,
          message: "Failed to fetch users from database. Please check your database connection in .env",
          error: error.message || String(error),
        };
      }
    },
    {
      response: {
        200: t.Object({
          success: t.Boolean({ description: "Success state" }),
          data: t.Array(
            t.Object({
              id: t.Numeric({ description: "User ID" }),
              name: t.String({ description: "User full name" }),
              email: t.String({ description: "User email address" }),
              password: t.String({ description: "Hashed password" }),
              createdAt: t.Any({ description: "User creation date" }),
            })
          ),
        }),
        500: t.Object({
          success: t.Boolean({ description: "Success state" }),
          message: t.String({ description: "Failure description" }),
          error: t.String({ description: "Error stack or details" }),
        }),
      },
      detail: {
        tags: ["Users"],
        summary: "Get All Users (Internal)",
        description: "Fetches all users from the database. Used as an internal utility.",
      },
    }
  )
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
