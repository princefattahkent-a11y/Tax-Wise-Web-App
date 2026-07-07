import {
  getDefaultMimeType,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from "@/lib/documentTypes";

export {
  getDefaultMimeType,
  isSupportedDocument,
  MAX_DOCUMENT_SIZE_BYTES,
  SUPPORTED_DOCUMENT_ACCEPT,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from "@/lib/documentTypes";

export interface GeminiFilePayload {
  mimeType: string;
  data: string;
}

export interface DocumentExtractionResult {
  extractedText: string;
  geminiFile?: GeminiFilePayload;
  sourceLabel: string;
}

export async function extractDocumentText(
  buffer: Buffer,
  fileName: string,
  mimeType = ""
): Promise<DocumentExtractionResult> {
  const fileNameLower = fileName.toLowerCase();
  const resolvedMimeType = (mimeType || getDefaultMimeType(fileName)).toLowerCase();

  if (fileNameLower.endsWith(".pdf") || resolvedMimeType === "application/pdf") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const parsedPdf = await pdfParse(buffer);
      const extracted = parsedPdf.text?.trim() || "";

      if (extracted.length > 100) {
        return {
          extractedText: extracted,
          sourceLabel: `Extracted from uploaded PDF: ${fileName}`,
        };
      }

      return {
        extractedText: "",
        geminiFile: {
          mimeType: "application/pdf",
          data: buffer.toString("base64"),
        },
        sourceLabel: `Scanned PDF sent to Gemini for OCR: ${fileName}`,
      };
    } catch (pdfError) {
      console.warn("PDF text extraction error, falling back to Gemini:", pdfError);
      return {
        extractedText: "",
        geminiFile: {
          mimeType: "application/pdf",
          data: buffer.toString("base64"),
        },
        sourceLabel: `PDF sent to Gemini after extraction failure: ${fileName}`,
      };
    }
  }

  if (
    fileNameLower.endsWith(".docx") ||
    resolvedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = result.value?.trim() || "";

      if (extractedText.length > 50) {
        return {
          extractedText,
          sourceLabel: `Extracted from Word document: ${fileName}`,
        };
      }

      return {
        extractedText: "",
        geminiFile: {
          mimeType: resolvedMimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          data: buffer.toString("base64"),
        },
        sourceLabel: `Word document sent to Gemini: ${fileName}`,
      };
    } catch (docxErr) {
      console.error("DOCX extraction error:", docxErr);
      return {
        extractedText: "",
        geminiFile: {
          mimeType: resolvedMimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          data: buffer.toString("base64"),
        },
        sourceLabel: `Word document sent to Gemini after extraction failure: ${fileName}`,
      };
    }
  }

  if (fileNameLower.endsWith(".doc") || resolvedMimeType === "application/msword") {
    return {
      extractedText: "",
      geminiFile: {
        mimeType: resolvedMimeType || "application/msword",
        data: buffer.toString("base64"),
      },
      sourceLabel: `Legacy Word document sent to Gemini: ${fileName}`,
    };
  }

  if (
    fileNameLower.endsWith(".rtf") ||
    fileNameLower.endsWith(".odt") ||
    resolvedMimeType === "text/rtf" ||
    resolvedMimeType === "application/vnd.oasis.opendocument.text"
  ) {
    return {
      extractedText: "",
      geminiFile: {
        mimeType: resolvedMimeType || getDefaultMimeType(fileName),
        data: buffer.toString("base64"),
      },
      sourceLabel: `Document sent to Gemini: ${fileName}`,
    };
  }

  if (
    fileNameLower.endsWith(".txt") ||
    fileNameLower.endsWith(".csv") ||
    fileNameLower.endsWith(".md") ||
    fileNameLower.endsWith(".html") ||
    fileNameLower.endsWith(".htm") ||
    fileNameLower.endsWith(".json") ||
    fileNameLower.endsWith(".xml") ||
    resolvedMimeType.startsWith("text/") ||
    resolvedMimeType === "application/json" ||
    resolvedMimeType === "application/xml"
  ) {
    return {
      extractedText: buffer.toString("utf-8"),
      sourceLabel: `Extracted from text-based document: ${fileName}`,
    };
  }

  if (
    fileNameLower.endsWith(".png") ||
    fileNameLower.endsWith(".jpg") ||
    fileNameLower.endsWith(".jpeg") ||
    fileNameLower.endsWith(".webp") ||
    resolvedMimeType.startsWith("image/")
  ) {
    let imageMimeType = resolvedMimeType || "image/jpeg";
    if (fileNameLower.endsWith(".png")) imageMimeType = "image/png";
    else if (fileNameLower.endsWith(".webp")) imageMimeType = "image/webp";

    return {
      extractedText: "",
      geminiFile: {
        mimeType: imageMimeType,
        data: buffer.toString("base64"),
      },
      sourceLabel: `Image sent to Gemini for OCR: ${fileName}`,
    };
  }

  if (
    fileNameLower.endsWith(".pptx") ||
    resolvedMimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return {
      extractedText: "",
      geminiFile: {
        mimeType: resolvedMimeType || "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        data: buffer.toString("base64"),
      },
      sourceLabel: `Presentation sent to Gemini: ${fileName}`,
    };
  }

  if (
    fileNameLower.endsWith(".xlsx") ||
    resolvedMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return {
      extractedText: "",
      geminiFile: {
        mimeType: resolvedMimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        data: buffer.toString("base64"),
      },
      sourceLabel: `Spreadsheet sent to Gemini: ${fileName}`,
    };
  }

  throw new Error(
    `Unsupported file type. Supported extensions include: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}`
  );
}
