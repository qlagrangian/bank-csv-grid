declare module 'pdfjs-dist/build/pdf' {
  import type {
    PDFDocumentProxy,
    PDFPageProxy,
  } from 'pdfjs-dist/types/src/display/api';

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(
    src: string | Uint8Array | { data: Uint8Array } | ArrayBuffer
  ): {
    promise: Promise<PDFDocumentProxy>;
  };

  export type { PDFDocumentProxy, PDFPageProxy };
}
