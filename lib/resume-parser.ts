// @ts-ignore
// 1. Define the polyfill FIRST before any imports/requires
if (typeof global.DOMMatrix === 'undefined') {
  // @ts-ignore
  global.DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

// 2. Use require to prevent 'hoisting' (loading before the polyfill)
const pdf = require("pdf-parse");

export type ParsedResumePdf = {
  fileName: string;
  text: string;
};

const MAX_TEXT_CHARS = 45000;

const normalizeWhitespace = (value: string) =>
  value
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

export const extractTextFromPdfFile = async (file: File): Promise<ParsedResumePdf> => {
  if (!file) {
    throw new Error("Resume file is required");
  }

  const fileName = file.name || "resume.pdf";
  const arrayBuffer = await file.arrayBuffer();
  
  // 3. Vercel/Node.js handles Buffers more reliably for file parsing
  const buffer = Buffer.from(arrayBuffer);

  try {
    // 4. Standard pdf-parse functional call
    const data = await pdf(buffer);
    const normalizedText = normalizeWhitespace(data.text ?? "");

    if (!normalizedText) {
      throw new Error("Could not extract readable text from the uploaded PDF");
    }

    return {
      fileName,
      text: normalizedText.slice(0, MAX_TEXT_CHARS),
    };
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to parse PDF content");
  }
};