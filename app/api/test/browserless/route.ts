import { NextResponse } from "next/server";

/**
 * GET /api/test/browserless
 * Quick connectivity check to Browserless (used by PDF generation).
 * Does not generate a PDF; only connects and disconnects.
 */
export async function GET() {
	const browserlessUrl = process.env.BROWSERLESS_URL;
	if (!browserlessUrl) {
		return NextResponse.json({
			ok: false,
			error: "BROWSERLESS_URL not set",
		}, { status: 500 });
	}

	try {
		const puppeteer = (await import("puppeteer-core")).default;
		const browser = await puppeteer.connect({
			browserWSEndpoint: browserlessUrl,
		});
		await browser.disconnect();
		return NextResponse.json({ ok: true, message: "Browserless connected" });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("Browserless test failed:", message);
		return NextResponse.json({
			ok: false,
			error: message,
		}, { status: 502 });
	}
}
