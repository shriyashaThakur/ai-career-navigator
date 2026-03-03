import { PDFParse } from "pdf-parse";

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
  const pdfData = new Uint8Array(arrayBuffer);

  const parser = new PDFParse({ data: pdfData });
  try {
    const textResult = await parser.getText();
    const normalizedText = normalizeWhitespace(textResult.text ?? "");

    if (!normalizedText) {
      throw new Error("Could not extract readable text from the uploaded PDF");
    }

    return {
      fileName,
      text: normalizedText.slice(0, MAX_TEXT_CHARS),
    };
  } finally {
    await parser.destroy();
  }
};

