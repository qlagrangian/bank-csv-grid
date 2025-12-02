import * as pdfjsLib from 'pdfjs-dist/build/pdf';

export const getTextMap = async (
  pdfData: ArrayBuffer,
  pageNumbers: number[]
): Promise<string[]> => {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
  const pdf = await loadingTask.promise;
  const textContents: string[] = [];

  for (const pageNumber of pageNumbers) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item: any) => item.str);
    textContents.push(strings.join(' '));
  }

  return textContents;
};
