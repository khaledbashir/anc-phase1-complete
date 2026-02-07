/**
 * Auth config for Edge middleware only. Do not import bcrypt or Prisma here.
 * Full auth (with Credentials + adapter) is in auth.ts for API routes.
 */
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
});
