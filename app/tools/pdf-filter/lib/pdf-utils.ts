import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface ExtractionProgress {
  current: number;
  total: number;
  phase: "loading" | "extracting" | "done";
}

export async function extractPageTexts(
  fileBuffer: ArrayBuffer,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<{ pageTexts: string[]; pdfDoc: pdfjsLib.PDFDocumentProxy }> {
  onProgress?.({ current: 0, total: 0, phase: "loading" });

  const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  const totalPages = pdfDoc.numPages;
  const pageTexts: string[] = [];

  const BATCH_SIZE = 50;

  for (let i = 0; i < totalPages; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, totalPages);
    const batchPromises: Promise<string>[] = [];

    for (let j = i; j < batchEnd; j++) {
      batchPromises.push(
        pdfDoc.getPage(j + 1).then(async (page) => {
          const textContent = await page.getTextContent();
          return textContent.items
            .map((item: any) => item.str || "")
            .join(" ");
        })
      );
    }

    const batchResults = await Promise.all(batchPromises);
    pageTexts.push(...batchResults);

    onProgress?.({ current: pageTexts.length, total: totalPages, phase: "extracting" });
  }

  onProgress?.({ current: totalPages, total: totalPages, phase: "done" });

  return { pageTexts, pdfDoc };
}

export async function renderPageThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  width: number = 150
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const scale = width / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;

  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}

export async function renderPageFull(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  maxWidth: number = 800
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / viewport.width, 2);
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;

  const dataUrl = canvas.toDataURL("image/png");

  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}

export async function buildFilteredPdf(
  originalBuffer: ArrayBuffer,
  keepPageIndices: number[]
): Promise<Uint8Array> {
  const sorted = [...keepPageIndices].sort((a, b) => a - b);

  const srcDoc = await PDFDocument.load(originalBuffer);
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(srcDoc, sorted);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return newDoc.save();
}

export function downloadPdf(data: Uint8Array, filename: string): void {
  const blob = new Blob([data as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
