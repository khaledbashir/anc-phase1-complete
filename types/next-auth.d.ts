import { DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      authRole: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: UserRole;
    authRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    authRole: string;
  }
}
