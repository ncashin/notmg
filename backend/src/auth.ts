import { eq } from "drizzle-orm";
import { sign, verify } from "jsonwebtoken";
import invariant from "tiny-invariant";
import { users } from "../schema";
import { database } from "./database";
import type { RouteHandler } from "./router";

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
invariant(JWT_SECRET);
invariant(REFRESH_TOKEN_SECRET);

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export const generateAuthToken = (id: string) => {
  return sign({ userId: id }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = (id: string) => {
  return sign({ userId: id }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

export const generateAuthResponse = (
  user: typeof users.$inferSelect,
  message: string,
) => {
  const accessToken = generateAuthToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  const response = new Response(
    JSON.stringify({
      message,
      token: accessToken,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${SEVEN_DAYS_IN_SECONDS}`,
      },
    },
  );
  return response;
};
export const handleRegister: RouteHandler = async (req) => {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return new Response("Username and password are required", {
      status: 400,
    });
  }

  try {
    const hashedPassword = await Bun.password.hash(password);
    const userId = crypto.randomUUID();
    const newUser = await database
      .insert(users)
      .values({
        id: userId,
        username,
        password: hashedPassword,
      })
      .returning()
      .then((rows) => rows[0]);

    if (!newUser) {
      return new Response("Failed to create user", { status: 500 });
    }

    return generateAuthResponse(newUser, "Registration successful");
  } catch (error) {
    console.error("Registration error:", error);
    return new Response("Registration failed", { status: 500 });
  }
};

export const handleLogin: RouteHandler = async (req) => {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return new Response("Username and password are required", {
      status: 400,
    });
  }

  const user = await database
    .select()
    .from(users)
    .where(eq(users.username as any, username))
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

  return generateAuthResponse(user, "Login successful");
};

export const handleRefresh: RouteHandler = async (req) => {
  const refreshToken = req.headers
    .get("cookie")
    ?.split("; ")
    .find((cookie) => cookie.startsWith("refreshToken="))
    ?.split("=")[1];

  if (!refreshToken) {
    return new Response("No refresh token provided", { status: 401 });
  }

  const decoded = verify(refreshToken, REFRESH_TOKEN_SECRET);
  if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
    return new Response("Invalid refresh token", { status: 401 });
  }

  const user = await database
    .select()
    .from(users)
    .where(eq(users.id, decoded.userId as string))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const accessToken = generateAuthToken(user.id);
  return new Response(
    JSON.stringify({
      message: "Refresh successful",
      token: accessToken,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
export const authenticate = async (requestOrToken: Request | string) => {
  const token =
    typeof requestOrToken === "string"
      ? requestOrToken
      : requestOrToken.headers.get("Authorization")?.split(" ")[1];

  if (!token) return;

  try {
    const decoded = verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
      return undefined;
    }

    const user = await database
      .select()
      .from(users)
      .where(eq(users.id as any, decoded.userId as string))
      .limit(1)
      .then((rows) => rows[0]);

    return user;
  } catch (error) {
    return undefined;
  }
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
  "/refresh": {
    POST: handleRefresh,
  },
  "/test": {
    GET: handleTestAuth,
  },
};
