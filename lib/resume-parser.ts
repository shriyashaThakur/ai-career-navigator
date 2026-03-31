// @ts-ignore
// 1. Polyfill for DOMMatrix (Needed for PDF.js on Vercel)
if (typeof global.DOMMatrix === 'undefined') {
  // @ts-ignore
  global.DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

/** * 2. LOAD WORKER & MODULE
 * We import 'getData' to manually provide the worker code to the parser.
 * This prevents Vercel from failing to find the .mjs worker file.
 */
const { getData } = require("pdf-parse/worker");
const pdfModule = require("pdf-parse");

// Next.js 16/Turbopack handles imports as a Module object
const PDFParse = pdfModule.PDFParse || (pdfModule.default && pdfModule.default.PDFParse);

// 3. Register the worker code manually for Vercel
if (PDFParse && typeof PDFParse.setWorker === 'function') {
  PDFParse.setWorker(getData());
}

export type ParsedResumePdf = {
  fileName: string;
  text: string;
};

export const extractTextFromPdfFile = async (file: File): Promise<ParsedResumePdf> => {
  if (!file) throw new Error("Resume file is required");

  const fileName = file.name || "resume.pdf";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    if (!PDFParse) {
      throw new Error("PDF parser library failed to load correctly. Please check your installations.");
    }

    // 4. Use the PDFParse class to extract text
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    
    const cleanText = (result.text ?? "")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    // Clean up the parser instance
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }

    return {
      fileName,
      text: cleanText.slice(0, 45000),
    };
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to parse PDF content");
  }
};