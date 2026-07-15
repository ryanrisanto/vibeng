import { describe, test, expect, beforeEach } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("API Test Suite", () => {
  beforeEach(async () => {
    // Clean up the database tables to ensure isolation
    await db.delete(sessions);
    await db.delete(users);
  });

  describe("GET /", () => {
    test("should return server status ok", async () => {
      const response = await app.handle(
        new Request("http://localhost/")
      );
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toEqual({
        status: "ok",
        message: "Server is running smoothly"
      });
    });
  });

  describe("POST /api/users", () => {
    test("should successfully register a new user", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ryan",
            email: "ryan@localhost",
            password: "password123"
          })
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ data: "OK" });

      // Verify user exists in the database
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "ryan@localhost"))
        .limit(1);
      expect(dbUser).toBeDefined();
      expect(dbUser.name).toBe("Ryan");
    });

    test("should fail registration if email already exists", async () => {
      // Register first user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ryan",
            email: "ryan@localhost",
            password: "password123"
          })
        })
      );

      // Attempt to register again with same email
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ryan Dupe",
            email: "ryan@localhost",
            password: "password123"
          })
        })
      );
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({ error: "Email sudah terdaftar" });
    });

    test("should fail registration if input maxLength exceeded", async () => {
      const longName = "A".repeat(300);
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: longName,
            email: "longname@localhost",
            password: "password123"
          })
        })
      );
      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.type).toBe("validation");
      expect(body.property).toBe("/name");
    });

    test("should fail registration if required fields are missing", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "missingname@localhost",
            password: "password123"
          })
        })
      );
      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.type).toBe("validation");
    });
  });

  describe("POST /api/login", () => {
    beforeEach(async () => {
      // Create a test user for login scenarios
      const registerRes = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Login User",
            email: "login@localhost",
            password: "securepassword"
          })
        })
      );
      expect(registerRes.status).toBe(200);
    });

    test("should successfully login and return a token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@localhost",
            password: "securepassword"
          })
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(typeof body.data).toBe("string");

      // Verify session exists in DB
      const [dbSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, body.data))
        .limit(1);
      expect(dbSession).toBeDefined();
    });

    test("should fail login with wrong password", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@localhost",
            password: "wrongpassword"
          })
        })
      );
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Email atau password salah atau user tidak terdaftar");
    });

    test("should fail login with non-existent email", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "doesnotexist@localhost",
            password: "securepassword"
          })
        })
      );
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Email atau password salah atau user tidak terdaftar");
    });
  });

  describe("GET /api/users/current", () => {
    let activeToken: string;
    let registeredUser: any;

    beforeEach(async () => {
      // Register and login to get a valid token
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Current User",
            email: "current@localhost",
            password: "mypassword"
          })
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "current@localhost",
            password: "mypassword"
          })
        })
      );
      const loginBody = await loginRes.json();
      activeToken = loginBody.data;

      [registeredUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "current@localhost"))
        .limit(1);
    });

    test("should successfully return current user profile with valid Bearer token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: { "Authorization": `Bearer ${activeToken}` }
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(registeredUser.id);
      expect(body.data.name).toBe("Current User");
      expect(body.data.email).toBe("current@localhost");
      expect(body.data.created_at).toBeDefined();
    });

    test("should fail if Authorization header is missing", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET"
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("should fail if Authorization header does not use Bearer format", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: { "Authorization": `Token ${activeToken}` }
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("should fail if token is invalid/expired", async () => {
      // Insert an expired session manually into the database
      const expiredToken = crypto.randomUUID();
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // 1 day ago

      await db.insert(sessions).values({
        userId: registeredUser.id,
        sessionToken: expiredToken,
        expiresAt: expiredDate
      });

      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: { "Authorization": `Bearer ${expiredToken}` }
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("DELETE /api/users/logout", () => {
    let activeToken: string;

    beforeEach(async () => {
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Logout User",
            email: "logout@localhost",
            password: "mypassword"
          })
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "logout@localhost",
            password: "mypassword"
          })
        })
      );
      const loginBody = await loginRes.json();
      activeToken = loginBody.data;
    });

    test("should successfully log out and remove session from database", async () => {
      // Verify session exists before logout
      const [beforeSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, activeToken))
        .limit(1);
      expect(beforeSession).toBeDefined();

      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${activeToken}` }
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ data: "OK" });

      // Verify session is removed from DB
      const [afterSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, activeToken))
        .limit(1);
      expect(afterSession).toBeUndefined();
    });

    test("should be idempotent (return OK even if session token does not exist)", async () => {
      // First logout (will succeed and delete the session)
      await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${activeToken}` }
        })
      );

      // Second logout with same token
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${activeToken}` }
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ data: "OK" });
    });

    test("should fail if Authorization header is invalid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: { "Authorization": `InvalidTokenFormat` }
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("GET /users", () => {
    test("should successfully return all users in DB", async () => {
      // Register multiple users
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "User One",
            email: "one@localhost",
            password: "password"
          })
        })
      );

      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "User Two",
            email: "two@localhost",
            password: "password"
          })
        })
      );

      const response = await app.handle(
        new Request("http://localhost/users")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].name).toBe("User One");
      expect(body.data[1].name).toBe("User Two");
    });
  });
});
