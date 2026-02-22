/**
 * PDF → JPEG conversion using pdftoppm (poppler-utils)
 *
 * Converts individual PDF pages to JPEG images.
 * One page at a time — no memory issues, no matter the PDF size.
 */

import { execFile } from "child_process";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Convert a single PDF page to a JPEG image.
 *
 * @param pdfPath   - Path to the PDF on disk
 * @param pageNumber - 1-based page number
 * @param outputDir  - Directory to write the JPEG
 * @returns Path to the output JPEG file
 */
export async function convertPageToImage(
  pdfPath: string,
  pageNumber: number,
  outputDir: string,
): Promise<string> {
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const outputPrefix = path.join(outputDir, `page`);

  // pdftoppm -f N -l N -jpeg -r 200 input.pdf output-prefix
  // -f = first page, -l = last page (same = single page)
  // -jpeg = JPEG output
  // -r 200 = 200 DPI (good balance of quality vs file size)
  await execFileAsync("pdftoppm", [
    "-f", String(pageNumber),
    "-l", String(pageNumber),
    "-jpeg",
    "-r", "200",
    pdfPath,
    outputPrefix,
  ], {
    timeout: 30_000, // 30s per page max
  });

  // pdftoppm names output as: {prefix}-{pagenum padded}.jpg
  // e.g. page-01.jpg, page-001.jpg, page-0001.jpg depending on total pages
  // Find the actual file
  const { readdir } = await import("fs/promises");
  const files = await readdir(outputDir);
  const match = files.find((f) => f.startsWith("page-") && f.endsWith(".jpg"));

  if (!match) {
    throw new Error(`pdftoppm produced no output for page ${pageNumber}`);
  }

  const finalPath = path.join(outputDir, `page-${pageNumber}.jpg`);

  // Rename to our convention if different
  const srcPath = path.join(outputDir, match);
  if (srcPath !== finalPath) {
    const { rename } = await import("fs/promises");
    await rename(srcPath, finalPath);
  }

  return finalPath;
}

/**
 * Convert multiple PDF pages to JPEG images, one at a time.
 *
 * @param pdfPath     - Path to the PDF on disk
 * @param pageNumbers - Array of 1-based page numbers to convert
 * @param outputDir   - Directory to write the JPEGs
 * @param onProgress  - Optional progress callback
 * @returns Map of pageNumber → JPEG file path
 */
export async function convertPagesToImages(
  pdfPath: string,
  pageNumbers: number[],
  outputDir: string,
  onProgress?: (current: number, total: number, pageNumber: number) => void,
): Promise<Map<number, string>> {
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const results = new Map<number, string>();

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    onProgress?.(i + 1, pageNumbers.length, pageNum);

    try {
      // Each page gets its own sub-dir to avoid pdftoppm naming collisions
      const pageDir = path.join(outputDir, `p${pageNum}`);
      const imagePath = await convertPageToImage(pdfPath, pageNum, pageDir);
      results.set(pageNum, imagePath);
    } catch (err: any) {
      console.error(`[pdfToImages] Failed to convert page ${pageNum}:`, err.message);
      // Skip failed pages, don't stop the whole thing
    }
  }

  return results;
}
