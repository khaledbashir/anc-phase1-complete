import { NextRequest, NextResponse } from "next/server";

import chromium from "@sparticuz/chromium";
import { getProposalTemplate } from "@/lib/helpers";
import { ENV, TAILWIND_CDN } from "@/lib/variables";
import { ProposalType } from "@/types";
import { sanitizeForClient } from "@/lib/security/sanitizeForClient";
import NataliaMirrorTemplate from "@/app/components/templates/proposal-pdf/NataliaMirrorTemplate";

function safeErrorMessage(err: unknown) {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.replace(/token=[^&\s]+/gi, "token=***");
}

function getRequestOrigin(req: NextRequest): string {
	// Prefer forwarded headers (common on EasyPanel / reverse proxies)
	const xfProto = req.headers.get("x-forwarded-proto");
	const xfHost = req.headers.get("x-forwarded-host");
	const host = xfHost || req.headers.get("host");

	const proto =
		(xfProto || req.nextUrl.protocol.replace(":", "") || "http")
			.split(",")[0]
			.trim() || "http";

	if (host) {
		const cleanHost = host.split(",")[0].trim();
		return `${proto}://${cleanHost}`;
	}

	return req.nextUrl.origin;
}

export async function generateProposalPdfServiceV2(req: NextRequest) {
	const body: ProposalType = await req.json();
	let browser: any;
	let page: any;

	try {
		const ReactDOMServer = (await import("react-dom/server")).default;

		// Bug #1 Fix: Check for mirror mode and use NataliaMirrorTemplate when applicable
		const pricingDocument = (body.details as any)?.pricingDocument;
		const useMirrorMode = pricingDocument?.tables?.length > 0 || (body.details as any)?.mirrorMode === true;

		let ProposalTemplate: any;
		if (useMirrorMode && pricingDocument) {
			// Use mirror template for pricing document data
			ProposalTemplate = NataliaMirrorTemplate;
			console.log("[PDF Generation] Using NataliaMirrorTemplate for mirror mode");
		} else {
			// Fallback to standard templates by ID
			let templateId = body.details?.pdfTemplate ?? 5; // Default to template 5 (ANC Hybrid - Enterprise Standard)
			// REQ-Fix: Templates 1, 2, 4 are deprecated. Map to 5 (Hybrid) which is the enterprise standard.
			const DEPRECATED_TEMPLATES = [1, 2, 3, 4];
			if (DEPRECATED_TEMPLATES.includes(templateId)) templateId = 5;
			ProposalTemplate = await getProposalTemplate(templateId);
		}

		if (!ProposalTemplate) {
			throw new Error("Failed to load ProposalTemplate");
		}

		// PHASE 3: Strip Blue Glow metadata from client-facing PDF
		// Use sanitizeForClient to remove all internal metadata (aiExtractedFields, verifiedFields, etc.)
		// This ensures clean, professional PDF output without AI indicators or internal cost data
		const sanitizedBody = sanitizeForClient<ProposalType>(body);

		const htmlTemplate = ReactDOMServer.renderToStaticMarkup(
			ProposalTemplate(sanitizedBody)
		);

		// IMPORTANT: page.setContent() loads into about:blank.
		// Without a <base href>, absolute-root paths like "/ANC_Logo_2023_blue.png"
		// won't resolve during server-side PDF generation, causing broken logos.
		const origin = getRequestOrigin(req).replace(/\/+$/, "");
		const baseHref = `${origin}/`;
		const html = `<!doctype html><html><head><meta charset="utf-8"/><base href="${baseHref}"/></head><body>${htmlTemplate}</body></html>`;

		const puppeteer = (await import("puppeteer-core")).default;
		const browserlessUrl = process.env.BROWSERLESS_URL;

		console.log("BROWSERLESS_URL configured:", browserlessUrl ? `${browserlessUrl.slice(0, 50)}...` : "NOT SET");

		if (browserlessUrl) {
			try {
				console.log("Attempting Browserless connection...");
				browser = await puppeteer.connect({
					browserWSEndpoint: browserlessUrl,
				});
				console.log("Browserless connected successfully!");
			} catch (e) {
				const errMsg = e instanceof Error ? e.message : String(e);
				console.error("Browserless connect failed:", errMsg);
				console.error("Falling back to local Chromium...");
			}
		}

		if (!browser && ENV === "production") {
			const execPath =
				process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());
			browser = await puppeteer.launch({
				args: [
					...chromium.args,
					"--disable-dev-shm-usage",
					"--ignore-certificate-errors",
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-gpu",
				],
				executablePath: execPath,
				headless: true,
			});
		} else if (!browser) {
			const puppeteerFull = (await import("puppeteer")).default;
			browser = await puppeteerFull.launch({
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
				headless: true,
			});
		}

		if (!browser) {
			throw new Error("Failed to launch browser");
		}

		page = await browser.newPage();
		await page.setViewport({ width: 1200, height: 1697, deviceScaleFactor: 1 });
		try {
			await page.emulateMediaType("screen");
		} catch {
		}
		await page.setContent(html, {
			waitUntil: ["domcontentloaded", "load"],
			timeout: 60000,
		});

		try {
			await page.addStyleTag({ url: TAILWIND_CDN });
		} catch (e) {
			console.error("Failed to load Tailwind CDN CSS, continuing without it");
		}
		try {
			await page.evaluate(async () => {
				if ((document as any).fonts?.ready) {
					await (document as any).fonts.ready;
				}
			});
		} catch {
		}
		try {
			await page.evaluate(async () => {
				const images = Array.from(document.images || []);
				await Promise.all(
					images.map((img) =>
						img.complete
							? Promise.resolve()
							: new Promise<void>((resolve) => {
									img.addEventListener("load", () => resolve(), { once: true });
									img.addEventListener("error", () => resolve(), { once: true });
								})
					)
				);
			});
		} catch {
		}

		const pdf: Uint8Array = await page.pdf({
			format: "a4",
			printBackground: true,
			preferCSSPageSize: true,
			// Disable browser header/footer to prevent timestamps/URLs
			displayHeaderFooter: false,
			// Reduced margins for tighter layout (more content on first page)
			margin: {
				top: "30px",
				bottom: "30px",
				left: "30px",
				right: "30px",
			},
		});

		return new NextResponse(new Blob([pdf as any], { type: "application/pdf" }), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": "attachment; filename=proposal.pdf",
				"Cache-Control": "no-cache",
				Pragma: "no-cache",
			},
			status: 200,
		});
	} catch (error: any) {
		const message = safeErrorMessage(error);
		console.error("PDF Generation Error:", message);
		return new NextResponse(JSON.stringify({ error: "Failed to generate PDF", message }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} finally {
		if (page) {
			try {
				await page.close();
			} catch (e) {
				console.error("Error closing page:", e);
			}
		}
		if (browser) {
			try {
				const pages = await browser.pages();
				await Promise.all(pages.map((p: any) => p.close()));
				await browser.close();
			} catch (e) {
				console.error("Error closing browser:", e);
			}
		}
	}
}
