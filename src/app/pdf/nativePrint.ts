/**
 * NativePrint — High-fidelity vector PDF generation for Mobile APK.
 * Uses the system's native print-to-pdf engine.
 */

export async function printElement(element: HTMLElement, title: string) {
  // 1. Create a portal iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  // 2. Clone fonts and styles
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
  let stylesHtml = '';
  styles.forEach(s => {
    stylesHtml += s.outerHTML;
  });

  // 3. Prepare the content
  // We need to ensure the element is visible and correctly scaled for the iframe
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.width = '100%';
  clone.style.height = 'auto';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${stylesHtml}
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        </style>
      </head>
      <body>
        <div id="print-root"></div>
      </body>
    </html>
  `);
  doc.close();

  const root = doc.getElementById('print-root');
  if (root) root.appendChild(clone);

  // 4. Wait for assets and trigger print
  // Giving it a bit of time for images and fonts to load in the iframe
  await new Promise(resolve => setTimeout(resolve, 500));

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  // 5. Cleanup
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}
