/**
 * Seed script: creates initial admin user for NextAuth (Credentials).
 * Run: npx prisma db seed  OR  npx tsx prisma/seed.ts
 *
 * Default admin: admin@ancexample.com
 * Default password: set SEED_ADMIN_PASSWORD in .env, or uses "AdminChangeMe1!"
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@ancexample.com";
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "AdminChangeMe1!";

async function main() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (existing) {
    console.log("Admin user already exists:", ADMIN_EMAIL);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Admin",
      passwordHash: hash,
      authRole: "admin",
      role: "ADMIN",
    },
  });
  console.log("Created admin user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
