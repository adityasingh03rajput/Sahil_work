import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { savePdfWithDialog } from '../utils/saveFile';

const smartSave = async (pdf: jsPDF, filename: string): Promise<boolean> => {
  return await savePdfWithDialog(pdf, filename);
};

// Interventional Color Sanitization: Converts oklch/oklab to HEX strings for html2canvas compatibility.
const safeColor = (doc: Document, value: string) => {
  const v = String(value || '').trim();
  if (!v || !v.includes('okl')) return v;

  const tmp = doc.createElement('span');
  tmp.style.color = v;
  doc.body.appendChild(tmp);
  const rgb = doc.defaultView?.getComputedStyle(tmp).color || v;
  tmp.remove();

  // Convert rgb(r, g, b) or rgba(r, g, b, a) to Hex
  if (rgb.startsWith('rgb')) {
    const parts = rgb.match(/\d+(\.\d+)?/g);
    if (parts && parts.length >= 3) {
      const r = parseInt(parts[0]).toString(16).padStart(2, '0');
      const g = parseInt(parts[1]).toString(16).padStart(2, '0');
      const b = parseInt(parts[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  return rgb;
};

const normalizeElementColors = (doc: Document, el: HTMLElement) => {
  const win = doc.defaultView;
  if (!win) return;

  const cs = win.getComputedStyle(el);
  const props = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'] as const;

  for (const p of props) {
    const v = (el.style as any)[p] || cs[p as any];
    if (typeof v === 'string' && v.includes('okl')) {
      (el.style as any)[p] = safeColor(doc, v);
    }
  }

  // Deeply strip shadows and filters that use oklab/oklch to prevent parser crashes
  const complexProps = ['boxShadow', 'filter', 'textShadow'] as const;
  for (const p of complexProps) {
    const v = cs[p as any];
    if (typeof v === 'string' && v.includes('okl')) {
      (el.style as any)[p] = 'none';
    }
  }
};

export async function exportElementToPdf(params: {
  element: HTMLElement;
  filename: string;
  scale?: number;
}): Promise<boolean> {
  const { element, filename } = params;
  const scale = 2; // Optimized 2x Resolution (Faster on mobile, still good quality)

  // Check if element contains multiple pages (for paginated templates)
  // Look for divs with data-page-number attribute - must have more than 1 page
  const pageElements = element.querySelectorAll<HTMLElement>('[data-page-number]');
  
  // Only use multi-page export if we actually have multiple pages
  if (pageElements.length > 1) {
    // Multi-page document - export each page separately
    const pages = Array.from(pageElements);
    return await exportHtmlPagesToPdf({ pages, filename });
  }

  // Single page document - use standard export
  // For single-page templates, capture the entire content
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    onclone: (clonedDoc) => {
      // Find the main content element
      const target = clonedDoc.getElementById('pdf-capture-node') || element;
      if (target instanceof HTMLElement) {
        target.style.transform = 'none';
        target.style.transformOrigin = 'unset';
        target.style.margin = '0';
        target.style.padding = '0';

        const nodes = target.querySelectorAll<HTMLElement>('*');
        normalizeElementColors(clonedDoc, target);
        nodes.forEach((n) => normalizeElementColors(clonedDoc, n));
      }
    }
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  
  // Calculate dimensions to fit content on A4
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  return await smartSave(pdf, filename);
}

export async function exportElementToPdfBlobUrl(params: {
  element: HTMLElement;
  filename?: string;
}) {
  const { element, filename } = params;
  const scale = 3; // Optimized 3x Resolution

  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    width: 794,
    height: 1123,
    onclone: (clonedDoc) => {
      const target = clonedDoc.getElementById('pdf-capture-node') || clonedDoc.body;
      if (target instanceof HTMLElement) {
        target.style.transform = 'none';
        target.style.transformOrigin = 'unset';
        target.style.margin = '0';
        target.style.position = 'absolute';
        target.style.top = '0';
        target.style.left = '0';
        target.style.width = '210mm';
        target.style.height = '297mm';

        const nodes = target.querySelectorAll<HTMLElement>('*');
        normalizeElementColors(clonedDoc, target);
        nodes.forEach((n) => normalizeElementColors(clonedDoc, n));
      }
    }
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  if (filename) {
    try { (window as any).__billvyapar_last_pdf_filename = filename; } catch {}
  }
  return url;
}

export async function exportHtmlPagesToPdf(params: {
  pages: HTMLElement[];
  filename: string;
}): Promise<boolean> {
  const { pages, filename } = params;
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  for (let i = 0; i < pages.length; i += 1) {
    const el = pages[i];
    const canvas = await html2canvas(el, { 
      scale: 2, // Reduced from 3 for faster rendering
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: 794, 
      height: 1123,
      onclone: (clonedDoc) => {
        // Find the cloned page element
        const clonedPages = clonedDoc.querySelectorAll<HTMLElement>('[data-page-number]');
        const target = clonedPages[i] || clonedDoc.body;
        
        if (target instanceof HTMLElement) {
          target.style.transform = 'none';
          target.style.transformOrigin = 'unset';
          target.style.margin = '0';
          target.style.position = 'absolute';
          target.style.top = '0';
          target.style.left = '0';
          target.style.width = '210mm';
          target.style.height = '297mm';
          target.style.overflow = 'hidden';

          const nodes = target.querySelectorAll<HTMLElement>('*');
          normalizeElementColors(clonedDoc, target);
          nodes.forEach((n) => normalizeElementColors(clonedDoc, n));
        }
      }
    });
    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  }

  return await smartSave(pdf, filename);
}
