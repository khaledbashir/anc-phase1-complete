export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function getVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function GET() {
  const version = getVersion();
  const uptimeSeconds = Math.floor(process.uptime());
  const memory = process.memoryUsage();

  let database: "connected" | "disconnected" = "disconnected";
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    database = "connected";
  } catch {
    database = "disconnected";
  }

  const healthy = database === "connected";
  const body = {
    status: healthy ? "healthy" : "degraded",
    liveness: "ok",
    readiness: healthy ? "ready" : "degraded",
    database,
    version,
    uptime: uptimeSeconds,
    uptimeHours: Math.round((uptimeSeconds / 3600) * 100) / 100,
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024 * 100) / 100,
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100,
    },
  };

  // Liveness must stay 200 so reverse proxies keep routing traffic even when
  // a dependency (DB) is degraded. Dependency state is still surfaced in body.
  return NextResponse.json(body, { status: 200 });
}
