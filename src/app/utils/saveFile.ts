/**
 * Robust file saving utility with "Save As" support where available.
 * 
 * Uses the modern File System Access API (showSaveFilePicker) to force a 
 * "Save As" dialog in supporting browsers (Chrome/Edge/etc).
 * Falls back to standard download behavior if the API is unsupported.
 */

export async function saveBlobWithDialog(
  blob: Blob, 
  filename: string, 
  options: {
    description: string;
    accept: Record<string, string[]>;
  }
): Promise<boolean> {
  // 1. Try modern File System Access API (forces Save As dialog)
  try {
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: options.description,
          accept: options.accept,
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }
  } catch (err: any) {
    // AbortError is natural when user cancels the dialog
    if (err.name === 'AbortError') return false;
    console.warn('showSaveFilePicker failed or was not available', err);
  }

  // 2. Fallback to standard download behavior (browser default download folder)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  
  // Clean up the URL after a short delay to ensure the download starts
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
  
  return true;
}

/**
 * Specifically for PDF files generated via jsPDF
 */
export async function savePdfWithDialog(pdf: any, filename: string): Promise<boolean> {
  const blob = pdf.output('blob');
  return saveBlobWithDialog(blob, filename, {
    description: 'PDF Document',
    accept: { 'application/pdf': ['.pdf'] },
  });
}

/**
 * Specifically for CSV files (Excel compatible)
 */
export async function saveCsvWithDialog(csvContent: string, filename: string): Promise<boolean> {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return saveBlobWithDialog(blob, filename, {
    description: 'CSV File (Excel)',
    accept: { 'text/csv': ['.csv'] },
  });
}
