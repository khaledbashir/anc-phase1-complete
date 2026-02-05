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
		let templateId = body.details?.pdfTemplate ?? 5; // Default to template 5 (ANC Hybrid - Enterprise Standard)
		// REQ-Fix: Templates 1, 2, 4 are deprecated. Map to 5 (Hybrid) which is the enterprise standard.
		const DEPRECATED_TEMPLATES = [1, 2, 4];
		if (DEPRECATED_TEMPLATES.includes(templateId)) templateId = 5;
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

		// Check for external Browserless service first (recommended for production)
		const browserlessUrl = process.env.BROWSERLESS_URL;
		console.log("BROWSERLESS_URL configured:", browserlessUrl ? `${browserlessUrl.slice(0, 50)}...` : "NOT SET");

		if (browserlessUrl) {
			try {
				// Connect to external Browserless service
				console.log("Attempting Browserless connection...");
				browser = await puppeteer.connect({
					browserWSEndpoint: browserlessUrl,
				});
				console.log("Browserless connected successfully!");
			} catch (e) {
				const errMsg = e instanceof Error ? e.message : String(e);
				console.error("Browserless connect failed:", errMsg);
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
		await page.setContent(html, {
			waitUntil: ["networkidle0", "load", "domcontentloaded"],
			timeout: 30000,
		});

		await page.addStyleTag({
			url: TAILWIND_CDN,
		});

		const pdf: Uint8Array = await page.pdf({
			format: "a4",
			printBackground: true,
			preferCSSPageSize: true,
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
