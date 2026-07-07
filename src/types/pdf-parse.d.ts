declare module "pdf-parse" {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
    text: string;
  }

  function pdfParse(data: Buffer | Uint8Array, options?: unknown): Promise<PDFParseResult>;

  export = pdfParse;
}
