/**
 * Test route to verify Sentry is receiving errors.
 * GET or POST /api/debug-sentry → throws; error should appear in Sentry within ~30s.
 */
export async function GET() {
    throw new Error("Sentry Test Error");
}

export async function POST() {
    throw new Error("Sentry Test Error");
}
