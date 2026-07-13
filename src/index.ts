import { Elysia } from "elysia";
import { db } from "./db";
import { users } from "./db/schema";
import { usersRoute } from "./routes/users-route";
import { authRoute } from "./routes/auth-route";

const app = new Elysia()
  .use(usersRoute)
  .use(authRoute)
  .get("/", () => ({
    status: "ok",
    message: "Server is running smoothly",
  }))
  .get("/users", async () => {
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
  })
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
