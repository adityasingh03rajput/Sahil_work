/**
 * Robust file saving utility with "Save As" support where available.
 * 
 * Uses the modern File System Access API (showSaveFilePicker) to force a 
 * "Save As" dialog in supporting browsers (Chrome/Edge/etc).
 * Falls back to standard download behavior if the API is unsupported.
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Helper to check if file exists
async function fileExists(filename: string): Promise<boolean> {
  try {
    await Filesystem.stat({
      path: filename,
      directory: Directory.Documents,
    });
    return true;
  } catch {
    return false;
  }
}

// Helper to generate unique filename with (2), (3), etc suffix
async function getUniqueFilename(filename: string): Promise<string> {
  if (!(await fileExists(filename))) {
    return filename;
  }

  // File exists, generate unique name
  const parts = filename.split('.');
  const ext = parts.pop() || '';
  const base = parts.join('.');
  
  let counter = 2;
  while (counter <= 100) {
    const newName = `${base} (${counter}).${ext}`;
    if (!(await fileExists(newName))) {
      return newName;
    }
    counter++;
  }
  
  // Fallback: use timestamp
  return `${base} ${Date.now()}.${ext}`;
}

export async function saveBlobWithDialog(
  blob: Blob, 
  filename: string, 
  options: {
    description: string;
    accept: Record<string, string[]>;
  }
): Promise<boolean> {
  // 0. Capacitor Native Support
  try {
    const cap = (window as any).Capacitor;
    if (cap && cap.isNativePlatform()) {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]); // strip "data:...base64,"
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      // Get unique filename to avoid overwriting
      const uniqueFilename = await getUniqueFilename(filename);

      try {
        const savedFile = await Filesystem.writeFile({
          path: uniqueFilename,
          data: base64Data,
          directory: Directory.Documents,
        });

        // Show success message
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.success(`File saved: ${uniqueFilename}`);
        } else {
          alert(`File saved to Documents: ${uniqueFilename}`);
        }
        return true;
      } catch (saveErr) {
        console.error('File save failed', saveErr);
        throw saveErr;
      }
    }
  } catch (err) {
    console.error('Capacitor save failed', err);
    // Don't throw here, fall back to web download
  }

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
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    // Clean up the URL after a short delay to ensure the download starts
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (err) {
    console.error('Standard download failed', err);
    throw new Error('All download methods failed');
  }
}

/**
 * Specifically for PDF files generated via jsPDF
 */
export async function savePdfWithDialog(pdf: any, filename: string): Promise<boolean> {
  try {
    const blob = pdf.output('blob');
    return await saveBlobWithDialog(blob, filename, {
      description: 'PDF Document',
      accept: { 'application/pdf': ['.pdf'] },
    });
  } catch (err) {
    console.error('PDF save failed:', err);
    
    // Last resort: Create a data URL and try to open it
    try {
      const dataUri = pdf.output('datauristring');
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${filename}</title></head>
            <body style="margin:0;padding:20px;font-family:system-ui,sans-serif;">
              <h3>PDF Ready for Download</h3>
              <p>Your PDF "${filename}" is ready. Right-click the link below and select "Save As" or "Download":</p>
              <a href="${dataUri}" download="${filename}" style="display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;">Download ${filename}</a>
              <br><br>
              <iframe src="${dataUri}" style="width:100%;height:600px;border:1px solid #ccc;"></iframe>
            </body>
          </html>
        `);
        newWindow.document.close();
        return true;
      }
    } catch (fallbackErr) {
      console.error('Fallback method also failed:', fallbackErr);
    }
    
    throw err;
  }
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
