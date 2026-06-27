import { PDFDocument } from "pdf-lib";

/**
 * Merge several PDFs (as ArrayBuffers) into a single PDF, preserving page
 * order. Used to combine the commissioning checklist + warranty with the
 * acknowledgement receipt into one document for the Client Master List.
 */
export async function mergePdfs(parts: ArrayBuffer[]): Promise<Blob> {
  const out = await PDFDocument.create();
  for (const part of parts) {
    const src = await PDFDocument.load(part);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  const bytes = await out.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
