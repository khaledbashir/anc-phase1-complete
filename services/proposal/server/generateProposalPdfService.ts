import { NextRequest, NextResponse } from "next/server";

// Chromium
import chromium from "@sparticuz/chromium";

// Helpers
import { getProposalTemplate } from "@/lib/helpers";

// Variables
import { ENV, TAILWIND_CDN } from "@/lib/variables";

// Types
import { ProposalType } from "@/types";

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
		const templateId = body.details.pdfTemplate;
		const ProposalTemplate = await getProposalTemplate(templateId);
		const htmlTemplate = ReactDOMServer.renderToStaticMarkup(
			ProposalTemplate(body)
		);

		if (ENV === "production") {
			const puppeteer = (await import("puppeteer-core")).default;
			browser = await puppeteer.launch({
				args: [...chromium.args, "--disable-dev-shm-usage", "--ignore-certificate-errors"],
				executablePath: await chromium.executablePath(),
				headless: true,
			});
		} else {
			const puppeteer = (await import("puppeteer")).default;
			browser = await puppeteer.launch({
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
				headless: true,
			});
		}

		if (!browser) {
			throw new Error("Failed to launch browser");
		}

		page = await browser.newPage();
		await page.setContent(await htmlTemplate, {
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

		return new NextResponse(new Blob([pdf], { type: "application/pdf" }), {
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
