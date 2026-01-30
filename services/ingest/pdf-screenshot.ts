import fs from 'fs';
import path from 'path';
import os from 'os';
import chromium from "@sparticuz/chromium";
import { ENV } from "@/lib/variables";

/**
 * Service to capture screenshots of specific PDF pages using Puppeteer.
 * This enables "Visual RAG" by converting technical drawings into images for the Vision API.
 */
export async function screenshotPdfPage(pdfBuffer: Buffer, pageNumber: number): Promise<Buffer | null> {
    let browser = null;
    let tempPdfPath = "";

    try {
        // 1. Write PDF to temp file (Puppeteer handles file:// better than data URIs for PDFs)
        const tempDir = os.tmpdir();
        tempPdfPath = path.join(tempDir, `rfp-drawing-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
        await fs.promises.writeFile(tempPdfPath, pdfBuffer);

        // 2. Launch Puppeteer (reuse existing config from generateProposalPdfService)
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

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
        
        // 3. Open PDF
        // Note: Chrome's PDF viewer URL syntax: file:///path/to.pdf#page=N
        const fileUrl = `file://${tempPdfPath}#page=${pageNumber}`;
        console.log(`[PdfScreenshot] Opening ${fileUrl}`);
        
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

        // Wait for PDF viewer to render (it's inside an <embed> usually)
        // We might need a small delay as 'networkidle0' can fire before PDF rendering completes
        try {
            await page.waitForSelector("embed, iframe", { timeout: 10_000 });
        } catch { }
        await new Promise(r => setTimeout(r, 1200));

        // 5. Screenshot
        // We screenshot the viewport, assuming the PDF viewer fills it
        const screenshot = await page.screenshot({ type: 'png' });

        return screenshot as Buffer;

    } catch (error) {
        console.error(`[PdfScreenshot] Error capturing page ${pageNumber}:`, error);
        return null;
    } finally {
        if (browser) await browser.close();
        // Cleanup temp file
        if (tempPdfPath && fs.existsSync(tempPdfPath)) {
            try {
                await fs.promises.unlink(tempPdfPath);
            } catch (e) { /* ignore */ }
        }
    }
}
