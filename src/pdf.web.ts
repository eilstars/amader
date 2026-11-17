/**
 * In the browser, the summary opens in the print window, where "Save as PDF" is one of the printers.
 * It prints from a hidden frame so only the summary is printed, not the app around it.
 */
export async function sharePdf(html: string, _title: string): Promise<'shared' | 'printed'> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.srcdoc = html;
  document.body.appendChild(frame);
  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    setTimeout(resolve, 1500);
  });
  // Give photos a moment to load before printing.
  await new Promise((r) => setTimeout(r, 300));
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 60_000);
  return 'printed';
}
