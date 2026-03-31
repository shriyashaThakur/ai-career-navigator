// @ts-ignore
// 1. Polyfill for DOMMatrix (Needed for Vercel)
if (typeof global.DOMMatrix === 'undefined') {
  // @ts-ignore
  global.DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

/**
 * 2. LOAD MODULE
 * Based on your log, require("pdf-parse") returns an object 
 * containing a 'PDFParse' class.
 */
const pdfModule = require("pdf-parse");

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
    // 3. Use the PDFParse class found in your logs
    const PDFParse = pdfModule.PDFParse;
    
    if (!PDFParse) {
      throw new Error("PDF library failed to load. Try running: npm install pdf-parse");
    }

    // 4. Initialize the parser as a class instance (based on your log structure)
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    
    const cleanText = (data.text ?? "")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    // Cleanup
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