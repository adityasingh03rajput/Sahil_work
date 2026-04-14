import React from 'react';
import type { PdfTemplateProps } from '../types';
import {
  Hr,
  KeyValue,
  KeyValueOptional,
  Money,
  TemplateFrame,
  amountInWordsINR,
  displaySubtotal,
  docTitleFromType,
  formatInlineAddress,
  formatStateDisplay,
  safeText,
  useScale,
  s,
} from './TemplateFrame';

/**
 * Ledger Template — Accountant-style, clean black & white with ruled table lines.
 * Maximizes data density. Ideal for printing on plain paper.
 */
export function LedgerTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const cgst = Number(doc.totalCgst || 0);
  const sgst = Number(doc.totalSgst || 0);
  const igst = Number(doc.totalIgst || 0);
  const taxes = cgst + sgst + igst;
  const grandTotal = Number(doc.grandTotal || 0);
  const businessStateCode = String(profile.gstin || '').trim().slice(0, 2);

  const lineComputed = (it: any) => {
    const qty = Number(it?.quantity || 0);
    const rate = Number(it?.rate || 0);
    const discountPct = Number(it?.discount || 0);
    const gross = qty * rate;
    const taxable = gross - (gross * discountPct) / 100;
    const cgstPct = Number(it?.cgst || 0);
    const sgstPct = Number(it?.sgst || 0);
    const igstPct = Number(it?.igst || 0);
    const taxPct = cgstPct + sgstPct + igstPct;
    const taxAmount = (taxable * taxPct) / 100;
    const total = Number.isFinite(Number(it?.total)) ? Number(it.total) : taxable + taxAmount;
    return { qty, rate, taxable, taxPct, taxAmount, total };
  };

  const taxRows: Array<{ kind: string; rate: number; taxable: number; tax: number }> = [];
  (doc.items || []).forEach((it: any) => {
    const qty = Number(it?.quantity || 0);
    const rate = Number(it?.rate || 0);
    const discountPct = Number(it?.discount || 0);
    const gross = qty * rate;
    const taxable = gross - (gross * discountPct) / 100;
    const addRow = (kind: string, pct: number) => {
      if (!pct) return;
      const tax = (taxable * pct) / 100;
      const ex = taxRows.find((r) => r.kind === kind && r.rate === pct);
      if (ex) { ex.taxable += taxable; ex.tax += tax; }
      else taxRows.push({ kind, rate: pct, taxable, tax });
    };
    addRow('CGST', Number(it?.cgst || 0));
    addRow('SGST', Number(it?.sgst || 0));
    addRow('IGST', Number(it?.igst || 0));
  });

  const Cell = ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ padding: '7px 8px', fontSize: 11, color: '#111827', ...style }}>{children}</div>
  );

  const HeadCell = ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ padding: '8px 8px', fontSize: 10, fontWeight: 900, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.4, ...style }}>{children}</div>
  );

  return (
    <TemplateFrame itemCount={doc.items?.length ?? 0}>
      {/* HEADER: two-column ruled box */}
      <div style={{ border: '2px solid #111827', borderRadius: 0 }}>
        {/* Top title bar */}
        <div style={{ background: '#111827', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>{profile.businessName}</div>
          <div style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>{docTitleFromType(doc.type)}</div>
        </div>

        {/* Business info row */}
        <div style={{ display: 'flex', borderTop: '1px solid #111827' }}>
          <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #111827' }}>
            {!!profile.billingAddress && <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.5 }}>{formatInlineAddress(profile.billingAddress)}</div>}
            <div style={{ display: 'flex', gap: 20, marginTop: 6, flexWrap: 'wrap' }}>
              {!!profile.phone && <span style={{ fontSize: 10, color: '#374151' }}>Ph: {profile.phone}</span>}
              {!!profile.email && <span style={{ fontSize: 10, color: '#374151' }}>Email: {profile.email}</span>}
            </div>
            {!!profile.gstin && <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4 }}>GSTIN: {profile.gstin}</div>}
            {!!businessStateCode && (
              <div style={{ fontSize: 10, color: '#374151' }}>State: {businessStateCode} - {profile.gstin ? profile.gstin.slice(0, 2) : ''}</div>
            )}
          </div>
          <div style={{ width: 220, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #E5E7EB', fontSize: 11 }}>
              <span style={{ color: '#6B7280', fontWeight: 600 }}>Invoice No.</span>
              <span style={{ fontWeight: 900 }}>{safeText(doc.invoiceNo) || safeText(doc.documentNumber)}</span>
            </div>
            {!!doc.date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #E5E7EB', fontSize: 11 }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Date</span>
                <span style={{ fontWeight: 700 }}>{doc.date}</span>
              </div>
            )}
            {!!doc.dueDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #E5E7EB', fontSize: 11 }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Due Date</span>
                <span style={{ fontWeight: 700 }}>{doc.dueDate}</span>
              </div>
            )}
            <KeyValueOptional label="Ref No." value={doc.referenceNo} />
            <KeyValueOptional label="Challan No." value={doc.challanNo} />
            <KeyValueOptional label="Order No" value={doc.orderNumber} />
            <KeyValueOptional label="Revision No" value={doc.revisionNumber} />
            <KeyValueOptional label="PO No" value={doc.purchaseOrderNo} />
            <KeyValueOptional label="PO Date" value={doc.poDate} />
            {!!doc.placeOfSupply && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #E5E7EB', fontSize: 11 }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Place of Supply</span>
                <span style={{ fontWeight: 700 }}>{doc.placeOfSupply}</span>
              </div>
            )}
            {!!doc.ewayBillNo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11 }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>E-way Bill</span>
                <span style={{ fontWeight: 700 }}>{doc.ewayBillNo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bill To row */}
        <div style={{ display: 'flex', borderTop: '1px solid #111827' }}>
          <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #111827' }}>
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#6B7280', marginBottom: 5 }}>Bill To</div>
            <div style={{ fontSize: 13, fontWeight: 900 }}>{safeText(doc.customerName) || '—'}</div>
            {!!doc.customerAddress && <div style={{ fontSize: 10, color: '#374151', marginTop: 4 }}>{formatInlineAddress(doc.customerAddress)}</div>}
            {!!doc.customerGstin && <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4 }}>GSTIN: {doc.customerGstin}</div>}
            {!!doc.customerMobile && <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>Ph: {doc.customerMobile}</div>}
            {!!doc.customerEmail && <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>Email: {doc.customerEmail}</div>}
            {!!doc.customerContactPerson && <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>Contact: {doc.customerContactPerson}</div>}
            {(!!doc.customerStateCode || !!doc.placeOfSupply) && (
              <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>State: {formatStateDisplay(doc.customerStateCode || null, doc.placeOfSupply || null)}</div>
            )}
          </div>
          {!!doc.deliveryAddress && (
            <div style={{ flex: 1, padding: '10px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#6B7280', marginBottom: 5 }}>Ship To</div>
              <div style={{ fontSize: 11, color: '#374151' }}>{formatInlineAddress(doc.deliveryAddress)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={{ border: '1px solid #111827', borderTop: 'none', marginTop: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderBottom: '2px solid #111827' }}>
          <HeadCell style={{ width: 32, borderRight: '1px solid #D1D5DB' }}>#</HeadCell>
          <HeadCell style={{ flex: 2, borderRight: '1px solid #D1D5DB' }}>Item / Description</HeadCell>
          <HeadCell style={{ width: 70, textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>HSN/SAC</HeadCell>
          <HeadCell style={{ width: 52, textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>Qty</HeadCell>
          <HeadCell style={{ width: 52, textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>Unit</HeadCell>
          <HeadCell style={{ width: 84, textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>Rate</HeadCell>
          <HeadCell style={{ width: 60, textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>Disc%</HeadCell>
          <HeadCell style={{ width: 84, textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>Taxable</HeadCell>
          <HeadCell style={{ width: 56, textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>GST%</HeadCell>
          <HeadCell style={{ width: 90, textAlign: 'right' }}>Total</HeadCell>
        </div>

        {(doc.items || []).map((it, idx) => {
          const c = lineComputed(it);
          return (
            <div key={idx} style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB', alignItems: 'flex-start' }}>
              <Cell style={{ width: 32, borderRight: '1px solid #E5E7EB', color: '#6B7280' }}>{idx + 1}</Cell>
              <Cell style={{ flex: 2, borderRight: '1px solid #E5E7EB' }}>
                <div style={{ fontWeight: 800 }}>{safeText(it?.name)}</div>
                {!!it?.description && <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2, whiteSpace: 'pre-line' }}>{it.description}</div>}
                {!!it?.sku && <div style={{ fontSize: 9, color: '#6B7280' }}>SKU: {it.sku}</div>}
              </Cell>
              <Cell style={{ width: 70, textAlign: 'right', borderRight: '1px solid #E5E7EB', color: '#6B7280' }}>{safeText(it?.hsnSac) || '—'}</Cell>
              <Cell style={{ width: 52, textAlign: 'right', borderRight: '1px solid #E5E7EB' }}>{c.qty}</Cell>
              <Cell style={{ width: 52, textAlign: 'right', borderRight: '1px solid #E5E7EB', color: '#6B7280' }}>{safeText(it?.unit) || '—'}</Cell>
              <Cell style={{ width: 84, textAlign: 'right', borderRight: '1px solid #E5E7EB' }}><Money value={c.rate} /></Cell>
              <Cell style={{ width: 60, textAlign: 'right', borderRight: '1px solid #E5E7EB', color: '#6B7280' }}>{Number(it?.discount || 0) > 0 ? `${it.discount}%` : '—'}</Cell>
              <Cell style={{ width: 84, textAlign: 'right', borderRight: '1px solid #E5E7EB' }}><Money value={c.taxable} /></Cell>
              <Cell style={{ width: 56, textAlign: 'right', borderRight: '1px solid #E5E7EB', color: '#6B7280' }}>{c.taxPct > 0 ? `${c.taxPct}%` : '—'}</Cell>
              <Cell style={{ width: 90, textAlign: 'right', fontWeight: 900 }}><Money value={c.total} /></Cell>
            </div>
          );
        })}
      </div>

      {/* TAX TABLE + TOTALS */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid #111827', borderTop: 'none' }}>
        {/* Tax breakdown */}
        <div style={{ flex: 1.4, borderRight: '1px solid #111827', padding: '12px 14px' }}>
          {taxRows.length > 0 && (
            <>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#6B7280', marginBottom: 8 }}>Tax Summary</div>
              <div style={{ border: '1px solid #D1D5DB' }}>
                <div style={{ display: 'flex', background: '#F3F4F6', borderBottom: '1px solid #D1D5DB', fontSize: 9, fontWeight: 900 }}>
                  <div style={{ flex: 1, padding: '5px 8px' }}>Tax Type</div>
                  <div style={{ width: 50, padding: '5px 8px', textAlign: 'right' }}>Rate</div>
                  <div style={{ width: 80, padding: '5px 8px', textAlign: 'right' }}>Taxable Amt</div>
                  <div style={{ width: 80, padding: '5px 8px', textAlign: 'right' }}>Tax Amt</div>
                </div>
                {taxRows.map((r, i) => (
                  <div key={i} style={{ display: 'flex', borderBottom: i < taxRows.length - 1 ? '1px solid #E5E7EB' : 'none', fontSize: 10 }}>
                    <div style={{ flex: 1, padding: '5px 8px', fontWeight: 700 }}>{r.kind}</div>
                    <div style={{ width: 50, padding: '5px 8px', textAlign: 'right', color: '#6B7280' }}>{r.rate}%</div>
                    <div style={{ width: 80, padding: '5px 8px', textAlign: 'right' }}><Money value={r.taxable} /></div>
                    <div style={{ width: 80, padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}><Money value={r.tax} /></div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 12, fontSize: 10, fontStyle: 'italic', color: '#374151', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700 }}>Amount in Words: </span>{amountInWordsINR(grandTotal)}
          </div>
        </div>

        {/* Totals column */}
        <div style={{ width: 220, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#6B7280', marginBottom: 8 }}>Summary</div>
          {[
            { label: 'Subtotal', value: displaySubtotal(doc) },
            { label: 'CGST', value: cgst, hide: cgst === 0 },
            { label: 'SGST', value: sgst, hide: sgst === 0 },
            { label: 'IGST', value: igst, hide: igst === 0 },
            { label: 'Transport', value: Number(doc.transportCharges || 0), hide: !doc.transportCharges },
            { label: 'Additional', value: Number(doc.additionalCharges || 0), hide: !doc.additionalCharges },
            { label: 'Packing', value: Number(doc.packingHandlingCharges || 0), hide: !doc.packingHandlingCharges },
            { label: 'TCS', value: Number(doc.tcs || 0), hide: !doc.tcs },
            { label: 'Round Off', value: Number(doc.roundOff || 0), hide: !doc.roundOff },
          ].filter((r) => !r.hide).map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E5E7EB', fontSize: 11 }}>
              <span style={{ color: '#6B7280' }}>{r.label}</span>
              <span style={{ fontWeight: 700 }}><Money value={r.value} /></span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #111827', marginTop: 4, fontSize: 14, fontWeight: 900 }}>
            <span>Grand Total</span>
            <span><Money value={grandTotal} /></span>
          </div>
        </div>
      </div>

      {/* BANK + TERMS + SIGNATURE */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid #111827', borderTop: 'none' }}>
        <div style={{ flex: 1, padding: '12px 14px', borderRight: '1px solid #111827' }}>
          {(profile.bankName || (profile as any).accountNumber || doc.bankName || doc.bankAccountNumber) && (
            <>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#6B7280', marginBottom: 6 }}>Bank Details</div>
              <KeyValueOptional label="Bank" value={doc.bankName || profile.bankName} />
              <KeyValueOptional label="Account Holder" value={(doc as any).bankAccountHolderName || profile.businessName} />
              <KeyValueOptional label="Account No." value={doc.bankAccountNumber || (profile as any).accountNumber} />
              <KeyValueOptional label="IFSC" value={doc.bankIfsc || (profile as any).ifscCode} />
            </>
          )}
          {(profile.upiId || doc.upiId) && (
            <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
              {!!doc.upiQrText && (
                <img src={String(doc.upiQrText)} alt="UPI QR" style={{ width: 60, height: 60, border: '1px solid #D1D5DB', padding: 3, background: '#fff' }} />
              )}
              <div style={{ fontSize: 10 }}>UPI: <strong>{safeText(doc.upiId || profile.upiId)}</strong></div>
            </div>
          )}
          {!!doc.termsConditions && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#6B7280', marginBottom: 4 }}>Terms & Conditions</div>
              <div style={{ fontSize: 10, color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{doc.termsConditions}</div>
            </div>
          )}
        </div>
        <div style={{ width: 220, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>For {profile.businessName}</div>
          <div>
            <div style={{ height: 40 }} />
            <div style={{ fontSize: 10, color: '#6B7280', borderTop: '1px solid #111827', paddingTop: 4 }}>Authorized Signatory</div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, color: '#9CA3AF' }}>Generated by BillVyapar</div>
        <div style={{ fontSize: 9, color: '#9CA3AF' }}>Thank you for your business!</div>
      </div>
    </TemplateFrame>
  );
}
