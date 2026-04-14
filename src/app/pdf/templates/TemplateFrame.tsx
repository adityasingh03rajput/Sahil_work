import React from 'react';
import type { PdfTemplateProps } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SCALE CONTEXT
// Templates consume this to get a density-aware scale factor (0.65 – 1.0).
// The scale is derived from item count so content always fits on one page.
// ─────────────────────────────────────────────────────────────────────────────
export const ScaleContext = React.createContext<number>(1);

/**
 * Compute a scale factor from item count.
 *   ≤ 8  items → 1.00  (full size)
 *   9-14 items → 0.88
 *  15-20 items → 0.78
 *  21-28 items → 0.70
 *   > 28 items → 0.63  (minimum readable)
 */
export function computeScale(itemCount: number): number {
  if (itemCount <= 8)  return 1.00;
  if (itemCount <= 14) return 0.88;
  if (itemCount <= 20) return 0.78;
  if (itemCount <= 28) return 0.70;
  return 0.63;
}

/** Multiply a px value by the current scale. Use inside templates via useScale(). */
export function useScale() {
  return React.useContext(ScaleContext);
}

/** Scale a numeric pixel value */
export function s(base: number, scale: number): number {
  return Math.round(base * scale);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE FRAME — wraps every template, injects scale context
// ─────────────────────────────────────────────────────────────────────────────
export function TemplateFrame({
  children,
  itemCount,
}: {
  children: React.ReactNode;
  itemCount?: number;
}) {
  const scale = computeScale(itemCount ?? 0);
  return (
    <ScaleContext.Provider value={scale}>
      <div
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: `${s(10, scale)}mm`,
          color: '#111827',
          background: '#ffffff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </ScaleContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS — all scale-aware
// ─────────────────────────────────────────────────────────────────────────────

export function Money({ value }: { value: number }) {
  const v = Number.isFinite(value) ? value : 0;
  return <>{v.toFixed(2)}</>;
}

export function safeText(value: any) {
  if (value === null || value === undefined) return '';
  return String(value);
}

const STATE_CODE_TO_NAME: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
};

export function formatStateDisplay(stateCode?: string | null, stateName?: string | null) {
  const code = String(stateCode || '').trim();
  const normCode = code.length === 1 ? `0${code}` : code;
  const name = String(stateName || '').trim() || (normCode ? STATE_CODE_TO_NAME[normCode] : '');
  if (normCode && name) return `${normCode} - ${name}`;
  if (normCode) return normCode;
  return name;
}

export function formatInlineAddress(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parts = raw
    .replace(/\r/g, '')
    .split(/\n|,/g)
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1];
  const prev = parts.length >= 2 ? parts[parts.length - 2] : '';
  const isPin = /^\d{6}$/.test(last);
  if (isPin && prev && !prev.includes('-')) {
    const head = parts.slice(0, -2);
    const tail = `${prev} - ${last}`;
    return [...head, tail].join(', ').replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim();
  }
  return parts.join(', ').replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim();
}

function wordsBelow20(n: number) {
  const a = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  return a[n] || '';
}
function tensWord(n: number) {
  const a = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  return a[n] || '';
}
function twoDigitsToWords(n: number) {
  const v = Math.floor(Math.abs(n));
  if (v < 20) return wordsBelow20(v);
  const t = Math.floor(v / 10);
  const r = v % 10;
  return r ? `${tensWord(t)} ${wordsBelow20(r)}`.trim() : tensWord(t);
}
function threeDigitsToWords(n: number) {
  const v = Math.floor(Math.abs(n));
  const h = Math.floor(v / 100);
  const rest = v % 100;
  const parts: string[] = [];
  if (h) parts.push(`${wordsBelow20(h)} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(' ').trim();
}
function numberToWordsIndian(n: number) {
  let v = Math.floor(Math.abs(n));
  if (!Number.isFinite(v)) return '';
  if (v === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(v / 10000000); v = v % 10000000;
  const lakh = Math.floor(v / 100000); v = v % 100000;
  const thousand = Math.floor(v / 1000); v = v % 1000;
  const hundredBlock = v;
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundredBlock) parts.push(threeDigitsToWords(hundredBlock));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function amountInWordsINR(value: number) {
  const v = Number(value || 0);
  const sign = v < 0 ? 'Minus ' : '';
  const abs = Math.abs(v);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);
  const r = numberToWordsIndian(rupees);
  const p = paise ? twoDigitsToWords(paise) : '';
  const tail = paise ? ` and ${p} Paise` : '';
  return `${sign}${r} Rupees${tail} Only`;
}

export function displaySubtotal(doc: any): number {
  const stored   = Number(doc.subtotal   || 0);
  const grand    = Number(doc.grandTotal || 0);
  const taxes    = Number(doc.totalCgst  || 0) + Number(doc.totalSgst || 0) + Number(doc.totalIgst || 0);
  const roundOff = Number(doc.roundOff   || 0);
  const expectedPreTax = parseFloat((grand - taxes - roundOff).toFixed(2));
  if (Math.abs(stored - expectedPreTax) < 0.05) return stored;
  if (Math.abs(stored - grand) < 0.05) return expectedPreTax;
  return stored;
}

export function docTitleFromType(type: string) {
  const t = String(type || '').toLowerCase();
  if (t === 'invoice') return 'TAX INVOICE';
  if (t === 'purchase') return 'PURCHASE INVOICE';
  if (t === 'quotation') return 'QUOTATION';
  if (t === 'proforma') return 'PROFORMA INVOICE';
  if (t === 'order') return 'SALES ORDER';
  if (t === 'challan') return 'DELIVERY CHALLAN';
  if (t === 'invoice_cancellation') return 'INVOICE CANCELLATION';
  return type ? String(type).toUpperCase() : 'DOCUMENT';
}

export function Hr({ color = '#E5E7EB' }: { color?: string }) {
  return <div style={{ height: 1, background: color, width: '100%' }} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  const sc = useScale();
  return (
    <div style={{ fontSize: s(11, sc), letterSpacing: 0.2, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

export function SmallText({ children, style, ...props }: React.ComponentProps<'div'>) {
  const sc = useScale();
  return (
    <div style={{ fontSize: s(12, sc), color: '#374151', ...(style as any) }} {...props}>
      {children}
    </div>
  );
}

export function Muted({ children, style, ...props }: React.ComponentProps<'div'>) {
  const sc = useScale();
  return (
    <div style={{ fontSize: s(11, sc), color: '#6B7280', ...(style as any) }} {...props}>
      {children}
    </div>
  );
}

export function Box({ children }: { children: React.ReactNode }) {
  const sc = useScale();
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: s(10, sc), padding: s(14, sc), background: '#FFFFFF' }}>
      {children}
    </div>
  );
}

export function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ width: 280, minWidth: 280 }}>{right}</div>
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  const sc = useScale();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: `${s(4, sc)}px 0` }}>
      <div style={{ fontSize: s(11, sc), color: '#6B7280' }}>{label}</div>
      <div style={{ fontSize: s(11, sc), color: '#111827', fontWeight: 600, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

export function KeyValueOptional({ label, value }: { label: string; value: any }) {
  const v = typeof value === 'string' ? value.trim() : value;
  const empty = v === null || v === undefined || v === '';
  if (empty) return null;
  return <KeyValue label={label} value={String(v)} />;
}

export function TemplateCommonHeader({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: s(20, sc), fontWeight: 800, lineHeight: 1.15 }}>{profile.businessName}</div>
        {!!profile.billingAddress && (
          <div style={{ fontSize: s(11, sc), color: '#6B7280', whiteSpace: 'pre-line', marginTop: s(10, sc) }}>
            {profile.billingAddress}
          </div>
        )}
        <div style={{ fontSize: s(11, sc), color: '#6B7280', marginTop: s(10, sc) }}>
          {!!profile.gstin && <div>GSTIN: {profile.gstin}</div>}
          {!!profile.phone && <div>Phone: {profile.phone}</div>}
          {!!profile.email && <div>Email: {profile.email}</div>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: s(12, sc), letterSpacing: 1.4, fontWeight: 800, color: '#111827' }}>
          {docTitleFromType(doc.type)}
        </div>
        <div style={{ fontSize: s(11, sc), color: '#6B7280', marginTop: s(10, sc) }}>Doc No: {safeText(doc.invoiceNo) || doc.documentNumber}</div>
        {!!doc.date && <div style={{ fontSize: s(11, sc), color: '#6B7280' }}>Date: {doc.date}</div>}
        {!!doc.dueDate && <div style={{ fontSize: s(11, sc), color: '#6B7280' }}>Due: {doc.dueDate}</div>}
      </div>
    </div>
  );
}
