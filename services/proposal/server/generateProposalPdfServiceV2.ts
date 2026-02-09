import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import chromium from "@sparticuz/chromium";
import { getProposalTemplate } from "@/lib/helpers";
import { ENV, TAILWIND_CDN } from "@/lib/variables";
import { ProposalType } from "@/types";
import { sanitizeForClient } from "@/lib/security/sanitizeForClient";

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

		// Map pageLayout to Puppeteer PDF dimensions
		const pageLayoutMap: Record<string, { width: string; height: string }> = {
			"portrait-letter": { width: "8.5in", height: "11in" },
			"portrait-legal": { width: "8.5in", height: "14in" },
			"landscape-letter": { width: "11in", height: "8.5in" },
			"landscape-legal": { width: "14in", height: "8.5in" },
		};
		const requestedLayout = (body.details as any)?.pageLayout;
		const pageLayout = pageLayoutMap[requestedLayout] ? requestedLayout : "portrait-letter";
		const layout = pageLayoutMap[pageLayout];
		const isLandscapeLayout = pageLayout.startsWith("landscape");

		// Always use ProposalTemplate5 (Hybrid) — handles both Mirror Mode and Intelligence Mode
		let templateId = body.details?.pdfTemplate ?? 5;
		const DEPRECATED_TEMPLATES = [1, 2, 3, 4];
		if (DEPRECATED_TEMPLATES.includes(templateId)) {
			console.info(`[PDF] Remapping deprecated template ${templateId} → 5 (Hybrid)`);
			templateId = 5;
		}
		const ProposalTemplate = await getProposalTemplate(templateId);

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
		const internalUrl = process.env.BROWSERLESS_INTERNAL_URL || "ws://basheer_browserless:3000";
		const externalUrl = process.env.BROWSERLESS_URL;

		// Try internal Docker network first (faster, no auth overhead)
		try {
			console.log(`Attempting internal Browserless: ${internalUrl.slice(0, 50)}...`);
			browser = await puppeteer.connect({ browserWSEndpoint: internalUrl });
			console.log("Browserless connected via internal network!");
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			console.log(`Internal Browserless unavailable: ${errMsg}`);
		}

		// Fall back to external Browserless URL
		if (!browser && externalUrl) {
			try {
				console.log(`Attempting external Browserless: ${externalUrl.slice(0, 50)}...`);
				browser = await puppeteer.connect({ browserWSEndpoint: externalUrl });
				console.log("Browserless connected via external URL!");
			} catch (e) {
				const errMsg = e instanceof Error ? e.message : String(e);
				console.error("External Browserless connect failed:", errMsg);
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
		const viewportWidth = isLandscapeLayout ? 1122 : 794;
		await page.setViewport({ width: viewportWidth, height: 1122, deviceScaleFactor: 1 });
		try {
			await page.emulateMediaType("screen");
		} catch {
		}
		await page.setContent(html, {
			waitUntil: ["domcontentloaded", "load"],
			timeout: 60000,
		});

		// Keep CSS print page size synchronized with the selected PDF layout.
		await page.addStyleTag({
			content: `@media print { @page { size: ${layout.width} ${layout.height}; } }`,
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
			width: layout.width,
			height: layout.height,
			landscape: isLandscapeLayout,
			preferCSSPageSize: false,
			printBackground: true,
			displayHeaderFooter: true,
			// Empty header (1px font hides default browser header)
			headerTemplate: '<div style="font-size:1px;"></div>',
			// Professional repeating footer: page numbers + contact info
			footerTemplate: `
				<div style="font-family: 'Helvetica Neue', Arial, sans-serif; width: 100%; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 6px; box-sizing: border-box;">
					<div style="font-size: 7px; color: #94a3b8;">ANC Sports Enterprises, LLC &middot; 2 Manhattanville Road, Suite 402 &middot; Purchase, NY 10577</div>
					<div style="display: flex; align-items: center; gap: 12px;">
						<div style="text-align: right;">
							<div style="font-size: 7.5px; font-weight: 700; color: #0A52EF; letter-spacing: 0.3px;">www.anc.com/contact</div>
							<div style="font-size: 6px; color: #6b7280; letter-spacing: 0.5px;">NY 914.696.2100 &nbsp; TX 940.464.2320</div>
						</div>
						<div style="font-size: 7px; color: #94a3b8;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
					</div>
				</div>
			`,
			margin: {
				top: "30px",
				bottom: "60px",
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
		Sentry.captureException(error, { tags: { area: "pdf-generation" } });
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
