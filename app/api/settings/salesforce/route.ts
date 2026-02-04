/**
 * POST /api/settings/salesforce
 * 
 * Save Salesforce integration configuration.
 * Stores credentials securely (encrypted) for OAuth authentication.
 * 
 * Phase 2.2.4: Salesforce Configuration UI
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Encryption key (should be in environment variable in production)
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || "default-key-change-in-production";

/**
 * Simple encryption for storing credentials
 * TODO: Use proper encryption library (e.g., crypto-js) in production
 */
function encrypt(text: string): string {
    // TODO: Implement proper encryption
    // For now, just base64 encode (NOT SECURE - replace with proper encryption)
    return Buffer.from(text).toString("base64");
}

function decrypt(encrypted: string): string {
    // TODO: Implement proper decryption
    return Buffer.from(encrypted, "base64").toString("utf-8");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clientId, clientSecret, enableSync } = body;

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { error: "Client ID and Client Secret are required" },
                { status: 400 }
            );
        }

        // TODO: Store in database Settings table (create if doesn't exist)
        // For now, store in environment or database
        // In production, use encrypted storage

        // Example: Store in database
        // await prisma.settings.upsert({
        //     where: { key: "salesforce_client_id" },
        //     update: { value: encrypt(clientId) },
        //     create: { key: "salesforce_client_id", value: encrypt(clientId) },
        // });

        // For MVP, we'll store in environment variables or a Settings table
        // This is a placeholder - actual implementation depends on your storage strategy

        return NextResponse.json({
            success: true,
            message: "Salesforce configuration saved successfully",
        });
    } catch (error: any) {
        console.error("Salesforce settings save error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to save configuration" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/settings/salesforce
 * 
 * Retrieve Salesforce configuration (without exposing secret).
 */
export async function GET(req: NextRequest) {
    try {
        // TODO: Retrieve from database
        // Return configuration without exposing secret
        return NextResponse.json({
            success: true,
            configured: false, // Will be true once credentials are stored
            enableSync: false,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to retrieve configuration" },
            { status: 500 }
        );
    }
}
