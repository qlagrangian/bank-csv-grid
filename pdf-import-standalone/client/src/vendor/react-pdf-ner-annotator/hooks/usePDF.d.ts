import { PDFPageProxy } from 'pdfjs-dist';
interface Props {
    url?: string;
    data?: Uint8Array | BufferSource | string;
    httpHeaders?: {
        [key: string]: string;
    };
}
declare const usePDF: ({ url, data, httpHeaders }: Props) => {
    pages: number;
    error: boolean;
    fetchPage: (index: number) => Promise<PDFPageProxy> | null;
};
export default usePDF;
