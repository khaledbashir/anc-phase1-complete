import { NextRequest, NextResponse } from "next/server";

// Chromium (fallback for serverless)
import chromium from "@sparticuz/chromium";

// Helpers
import { getProposalTemplate } from "@/lib/helpers";

// Variables
import { ENV, TAILWIND_CDN } from "@/lib/variables";

// Types
import { ProposalType } from "@/types";

function getRequestOrigin(req: NextRequest): string {
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

/**
 * Generate a PDF document of an proposal based on the provided data.
 *
 * @async
 * @param {NextRequest} req - The Next.js request object.
 * @throws {Error} If there is an error during the PDF generation process.
 * @returns {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the generated PDF.
 */
export async function generateProposalPdfService(req: NextRequest) {
	const body: ProposalType = await req.json();
	let browser;
	let page;

	try {
		const ReactDOMServer = (await import("react-dom/server")).default;
		const pageLayoutMap: Record<string, { width: string; height: string }> = {
			"portrait-letter": { width: "8.5in", height: "11in" },
			"portrait-legal": { width: "8.5in", height: "14in" },
			"portrait-a4": { width: "8.27in", height: "11.69in" },
			"landscape-letter": { width: "11in", height: "8.5in" },
			"landscape-legal": { width: "14in", height: "8.5in" },
			"landscape-a4": { width: "11.69in", height: "8.27in" },
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
			throw new Error("Failed to load ProposalTemplate2");
		}

		const htmlTemplate = ReactDOMServer.renderToStaticMarkup(
			ProposalTemplate(body)
		);
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
				browser = null;
			}
		}
		
		if (!browser && ENV === "production") {
			// Fallback: Try system Chromium (Docker) or @sparticuz/chromium (serverless)
			const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath();
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
			// Development: use full puppeteer
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
		await page.setContent(html, {
			waitUntil: ["networkidle0", "load", "domcontentloaded"],
			timeout: 30000,
		});

		await page.addStyleTag({
			content: `@media print { @page { size: ${layout.width} ${layout.height}; } }`,
		});

		await page.addStyleTag({
			url: TAILWIND_CDN,
		});

		const pdf: Uint8Array = await page.pdf({
			width: layout.width,
			height: layout.height,
			landscape: isLandscapeLayout,
			preferCSSPageSize: false,
			printBackground: true,
			displayHeaderFooter: true,
			footerTemplate: `
                <div style="font-family: 'Open Sans', sans-serif; font-size: 8px; width: 100%; padding: 0 40px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                    <div>ANC Intelligence Core - Confidential Proposal</div>
                    <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
                </div>
            `,
			margin: {
				top: "60px",
				bottom: "70px",
				left: "40px",
				right: "40px"
			}
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
		console.error("PDF Generation Error:", error);
		return new NextResponse(
			JSON.stringify({ error: "Failed to generate PDF" }),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
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
				await Promise.all(pages.map((p) => p.close()));
				await browser.close();
			} catch (e) {
				console.error("Error closing browser:", e);
			}
		}
	}
}
