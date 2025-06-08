import { eq } from "drizzle-orm";
import { sign, verify } from "jsonwebtoken";
import type { RouteHandler } from "..";
import { users } from "../schema";
import { database } from "./database";

const JWT_SECRET = process.env.JWT_SECRET;
export const generateAuthToken = (id: string) => {
  return sign({ userId: id }, JWT_SECRET, {
    expiresIn: "24h",
  });
};

export const handleRegister: RouteHandler = async (req) => {
  return req.json().then(async (body) => {
    const { username, password } = body;

    if (!username || !password) {
      return new Response("Name and password are required", {
        status: 400,
      });
    }

    try {
      const hashedPassword = await Bun.password.hash(password);
      const newUser = await database
        .insert(users)
        .values({
          username,
          password: hashedPassword,
        })
        .returning()
        .then((rows) => rows[0]);

      if (!newUser) {
        return new Response("Failed to create user", { status: 500 });
      }

      return new Response(
        JSON.stringify({
          message: "Registration successful",
          token: generateAuthToken(newUser.id),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Registration error:", error);
      return new Response("Registration failed", { status: 500 });
    }
  });
};

export const handleLogin: RouteHandler = async (req) => {
  return req.json().then(async (body) => {
    const { username, password } = body;

    if (!username || !password) {
      return new Response("Username and password are required", {
        status: 400,
      });
    }

    try {
      const user = await database
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
        .then((rows) => rows[0]);

      if (!user) {
        return new Response("Invalid username or password", {
          status: 401,
        });
      }

      const isValid = await Bun.password.verify(password, user.password);
      if (!isValid) {
        return new Response("Invalid username or password", {
          status: 401,
        });
      }

      return new Response(
        JSON.stringify({
          message: "Login successful",
          token: generateAuthToken(user.id),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.error("Login error:", error);
      return new Response("Login failed", { status: 500 });
    }
  });
};

export const authenticate = async (requestOrToken: Request | string) => {
  const token =
    typeof requestOrToken === "string"
      ? requestOrToken
      : requestOrToken.headers.get("Authorization")?.split(" ")[1];

  if (!token) return;

  const decoded = verify(token, JWT_SECRET);
  if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) return;

  const user = await database
    .select()
    .from(users)
    .where(eq(users.id, decoded.userId as string))
    .limit(1)
    .then((rows) => rows[0]);

  return user;
};

const handleTestAuth: RouteHandler = async (req) => {
  const user = authenticate(req);
  if (!user) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        message: "User not found",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response("Auth success", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const authRoutes = {
  "/register": {
    POST: handleRegister,
  },
  "/login": {
    POST: handleLogin,
  },
  "/test": {
    GET: handleTestAuth,
  },
};
