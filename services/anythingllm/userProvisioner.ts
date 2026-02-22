/**
 * AnythingLLM User Provisioner
 *
 * Syncs ANC app users → AnythingLLM users via the admin API.
 * When an ANC user logs in, we auto-create a matching AnythingLLM
 * account (if it doesn't exist) so workspaces are scoped per-user.
 */

import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlmUser {
  id: number;
  username: string;
  role: string; // "admin" | "default" | "manager"
}

// ---------------------------------------------------------------------------
// Core: ensure user exists in AnythingLLM
// ---------------------------------------------------------------------------

/**
 * Given an ANC user (id + email), ensure they have an AnythingLLM account.
 * Returns the AnythingLLM user ID, or null if provisioning is unavailable.
 *
 * Flow:
 *  1. Check if user already has `anythingLlmUserId` in our DB → done
 *  2. Search AnythingLLM users list for matching username (email)
 *  3. If not found → create via admin API
 *  4. Store the AnythingLLM user ID back to our DB
 */
export async function ensureAnythingLlmUser(ancUserId: string, email: string): Promise<number | null> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) return null;

  try {
    // 1. Already provisioned?
    const user = await prisma.user.findUnique({
      where: { id: ancUserId },
      select: { anythingLlmUserId: true },
    });

    if (user?.anythingLlmUserId) {
      return user.anythingLlmUserId;
    }

    // 2. Search existing AnythingLLM users
    const existingId = await findAlmUserByUsername(email);
    if (existingId) {
      await prisma.user.update({
        where: { id: ancUserId },
        data: { anythingLlmUserId: existingId },
      });
      return existingId;
    }

    // 3. Create new AnythingLLM user
    const newId = await createAlmUser(email);
    if (!newId) return null;

    // 4. Store back
    await prisma.user.update({
      where: { id: ancUserId },
      data: { anythingLlmUserId: newId },
    });

    console.log(`[ALM User] Provisioned: ${email} → ALM user ${newId}`);
    return newId;
  } catch (err: any) {
    console.error(`[ALM User] Failed for ${email}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Assign workspace to user
// ---------------------------------------------------------------------------

/**
 * Assign an AnythingLLM workspace to a specific user.
 * Called after RFP workspace provisioning so the user owns it.
 */
export async function assignWorkspaceToUser(
  workspaceSlug: string,
  almUserId: number,
): Promise<boolean> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) return false;

  try {
    const res = await fetch(
      `${ANYTHING_LLM_BASE_URL}/admin/workspaces/${workspaceSlug}/update-users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
        },
        body: JSON.stringify({ userIds: [almUserId] }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[ALM User] Assign workspace ${workspaceSlug} to user ${almUserId} failed: ${err.slice(0, 200)}`);
      return false;
    }

    console.log(`[ALM User] Assigned workspace ${workspaceSlug} → user ${almUserId}`);
    return true;
  } catch (err: any) {
    console.error(`[ALM User] Assign failed:`, err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function findAlmUserByUsername(email: string): Promise<number | null> {
  try {
    const res = await fetch(`${ANYTHING_LLM_BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const users: AlmUser[] = data?.users || [];
    const match = users.find(
      (u) => u.username.toLowerCase() === email.toLowerCase(),
    );

    return match?.id ?? null;
  } catch {
    return null;
  }
}

async function createAlmUser(email: string): Promise<number | null> {
  try {
    // Generate a strong random password — users won't type this,
    // it's only for the AnythingLLM internal auth.
    const password = crypto.randomBytes(24).toString("base64url");

    const res = await fetch(`${ANYTHING_LLM_BASE_URL}/admin/users/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
      },
      body: JSON.stringify({
        username: email,
        password,
        role: "default",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[ALM User] Create failed for ${email}: ${err.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    return data?.user?.id ?? null;
  } catch (err: any) {
    console.error(`[ALM User] Create error:`, err.message);
    return null;
  }
}
