import { NextRequest, NextResponse } from "next/server";

import chromium from "@sparticuz/chromium";
import { getProposalTemplate } from "@/lib/helpers";
import { ENV, TAILWIND_CDN } from "@/lib/variables";
import { ProposalType } from "@/types";

function safeErrorMessage(err: unknown) {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.replace(/token=[^&\s]+/gi, "token=***");
}

export async function generateProposalPdfServiceV2(req: NextRequest) {
	const body: ProposalType = await req.json();
	let browser: any;
	let page: any;

	try {
		const ReactDOMServer = (await import("react-dom/server")).default;
		let templateId = body.details?.pdfTemplate ?? 2;
		if (templateId === 1) templateId = 2;
		
		const ProposalTemplate = await getProposalTemplate(templateId);

		if (!ProposalTemplate) {
			throw new Error("Failed to load ProposalTemplate2");
		}

		const htmlTemplate = ReactDOMServer.renderToStaticMarkup(
			ProposalTemplate(body)
		);

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
		await page.setContent(htmlTemplate, {
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
				right: "40px",
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
