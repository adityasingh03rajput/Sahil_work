import React from 'react';
import type { PdfTemplateProps } from '../types';

export function TemplateFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 794,
        minHeight: 1123,
        padding: 32,
        color: '#111827',
        background: '#ffffff',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      {children}
    </div>
  );
}

export function Money({ value }: { value: number }) {
  const v = Number.isFinite(value) ? value : 0;
  return <>{v.toFixed(2)}</>;
}

export function safeText(value: any) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function wordsBelow20(n: number) {
  const a = [
    'Zero',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  return a[n] || '';
}

function tensWord(n: number) {
  const a = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
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

  const crore = Math.floor(v / 10000000);
  v = v % 10000000;
  const lakh = Math.floor(v / 100000);
  v = v % 100000;
  const thousand = Math.floor(v / 1000);
  v = v % 1000;
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
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 0.2,
        color: '#6B7280',
        fontWeight: 600,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

export function SmallText({ children, style, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      style={{
        fontSize: 12,
        color: '#374151',
        ...(style as any),
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function Muted({ children, style, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      style={{
        fontSize: 11,
        color: '#6B7280',
        ...(style as any),
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function Box({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: 14,
        background: '#FFFFFF',
      }}
    >
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
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0' }}>
      <div style={{ fontSize: 12, color: '#6B7280' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#111827', fontWeight: 600, textAlign: 'right' }}>{value}</div>
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
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.15 }}>{profile.businessName}</div>
        <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>{profile.ownerName}</div>
        {!!profile.billingAddress && (
          <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'pre-line', marginTop: 10 }}>
            {profile.billingAddress}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 10 }}>
          {!!profile.gstin && <div>GSTIN: {profile.gstin}</div>}
          {!!profile.phone && <div>Phone: {profile.phone}</div>}
          {!!profile.email && <div>Email: {profile.email}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, letterSpacing: 1.4, fontWeight: 800, color: '#111827' }}>
          {docTitleFromType(doc.type)}
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 10 }}>Doc No: {doc.documentNumber}</div>
        {!!doc.date && <div style={{ fontSize: 11, color: '#6B7280' }}>Date: {doc.date}</div>}
        {!!doc.dueDate && <div style={{ fontSize: 11, color: '#6B7280' }}>Due: {doc.dueDate}</div>}
      </div>
    </div>
  );
}
