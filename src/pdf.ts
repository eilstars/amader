import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Makes a PDF from the page and opens the share sheet, so the person can send it or save it. */
export async function sharePdf(html: string, title: string): Promise<'shared' | 'printed'> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
    return 'shared';
  }
  await Print.printAsync({ uri });
  return 'printed';
}
