export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".rtf",
  ".odt",
  ".txt",
  ".csv",
  ".md",
  ".html",
  ".htm",
  ".json",
  ".xml",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pptx",
  ".xlsx",
] as const;

export const SUPPORTED_DOCUMENT_ACCEPT = SUPPORTED_DOCUMENT_EXTENSIONS.join(",");

export function getFileExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  return lastDot >= 0 ? lower.slice(lastDot) : "";
}

export function isSupportedDocument(fileName: string) {
  const ext = getFileExtension(fileName);
  return SUPPORTED_DOCUMENT_EXTENSIONS.includes(ext as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number]);
}

export function getDefaultMimeType(fileName: string) {
  const ext = getFileExtension(fileName);
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".rtf":
      return "text/rtf";
    case ".odt":
      return "application/vnd.oasis.opendocument.text";
    case ".txt":
      return "text/plain";
    case ".csv":
      return "text/csv";
    case ".md":
      return "text/markdown";
    case ".html":
    case ".htm":
      return "text/html";
    case ".json":
      return "application/json";
    case ".xml":
      return "application/xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}
