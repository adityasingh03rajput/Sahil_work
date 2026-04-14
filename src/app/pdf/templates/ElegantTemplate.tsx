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
 * Elegant Template — Warm off-white background, forest green accents, serif-inspired layout.
 * Clean two-column header, full-width table with alternating rows, premium feel.
 */
export function ElegantTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const cgst = Number(doc.totalCgst || 0);
  const sgst = Number(doc.totalSgst || 0);
  const igst = Number(doc.totalIgst || 0);
  const taxes = cgst + sgst + igst;
  const grandTotal = Number(doc.grandTotal || 0);
  const businessStateCode = String(profile.gstin || '').trim().slice(0, 2);
  const partyLogo = String((doc as any)?.partyLogoDataUrl || '').trim();

  const green = '#1B4332';
  const greenMid = '#2D6A4F';
  const greenLight = '#D8F3DC';
  const cream = '#FAFAF7';
  const border = '#D4D4AA';
  const muted = '#6B7280';

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

  return (
    <TemplateFrame itemCount={doc.items?.length ?? 0}>
      <div style={{ background: cream, minHeight: '100%', fontFamily: 'Georgia, "Times New Roman", serif' }}>

        {/* TOP DECORATIVE BAR */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${green} 0%, ${greenMid} 50%, ${green} 100%)`, borderRadius: '4px 4px 0 0' }} />
        <div style={{ height: 2, background: border }} />

        {/* HEADER */}
        <div style={{ padding: '24px 30px 20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
          {/* Business info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {partyLogo ? (
                <img src={partyLogo} alt="Logo" style={{ width: 52, height: 52, borderRadius: 6, border: `2px solid ${border}`, objectFit: 'cover', background: '#fff' }} />
              ) : null}
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: green, letterSpacing: -0.5, lineHeight: 1.1 }}>{profile.businessName}</div>
                {!!profile.billingAddress && (
                  <div style={{ fontSize: 10, color: muted, marginTop: 5, lineHeight: 1.5 }}>{formatInlineAddress(profile.billingAddress)}</div>
                )}
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  {!!profile.phone && <span style={{ fontSize: 10, color: muted }}>Ph: {profile.phone}</span>}
                  {!!profile.email && <span style={{ fontSize: 10, color: muted }}>{profile.email}</span>}
                </div>
                {!!profile.gstin && <div style={{ fontSize: 10, color: green, fontWeight: 700, marginTop: 3 }}>GSTIN: {profile.gstin}</div>}
              </div>
            </div>
          </div>

          {/* Doc type box */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ background: green, color: '#FFFFFF', padding: '8px 18px', borderRadius: 6, display: 'inline-block' }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{docTitleFromType(doc.type)}</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#374151' }}>
              <div><span style={{ color: muted }}>No. </span><strong>{safeText(doc.invoiceNo) || safeText(doc.documentNumber)}</strong></div>
              {!!doc.date && <div style={{ marginTop: 3 }}><span style={{ color: muted }}>Date: </span>{doc.date}</div>}
              {!!doc.dueDate && <div style={{ marginTop: 2 }}><span style={{ color: muted }}>Due: </span>{doc.dueDate}</div>}
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: border, margin: '0 30px' }} />

        {/* BILL TO + DETAILS */}
        <div style={{ display: 'flex', gap: 0, margin: '0 30px', marginTop: 18 }}>
          <div style={{ flex: 1.5, paddingRight: 20, borderRight: `1px solid ${border}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid, marginBottom: 8 }}>Billed To</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{safeText(doc.customerName) || '—'}</div>
            {!!doc.customerAddress && <div style={{ fontSize: 11, color: muted, marginTop: 5, lineHeight: 1.5 }}>{formatInlineAddress(doc.customerAddress)}</div>}
            {!!doc.customerGstin && <div style={{ fontSize: 11, color: '#111827', marginTop: 5, fontWeight: 700 }}>GSTIN: {doc.customerGstin}</div>}
            {!!doc.customerMobile && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Ph: {doc.customerMobile}</div>}
            {!!doc.customerEmail && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Email: {doc.customerEmail}</div>}
            {!!doc.customerContactPerson && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Contact: {doc.customerContactPerson}</div>}
            {(!!doc.customerStateCode || !!doc.placeOfSupply) && (
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>State: {formatStateDisplay(doc.customerStateCode || null, doc.placeOfSupply || null)}</div>
            )}
          </div>

          <div style={{ flex: 1, paddingLeft: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid, marginBottom: 8 }}>Invoice Details</div>
            <KeyValueOptional label="Ref No." value={doc.referenceNo} />
            <KeyValueOptional label="Challan No." value={doc.challanNo} />
            <KeyValueOptional label="Order No" value={doc.orderNumber} />
            <KeyValueOptional label="Revision No" value={doc.revisionNumber} />
            <KeyValueOptional label="PO No" value={doc.purchaseOrderNo} />
            <KeyValueOptional label="PO Date" value={doc.poDate} />
            <KeyValueOptional label="Place of Supply" value={doc.placeOfSupply} />
            <KeyValueOptional label="E-way Bill No." value={doc.ewayBillNo} />
            <KeyValueOptional label="Vehicle No." value={doc.ewayBillVehicleNo} />
            <KeyValueOptional label="Transport" value={doc.transport} />
            <KeyValueOptional label="Payment Terms" value={doc.paymentTerms} />
          </div>
        </div>

        {!!doc.deliveryAddress && (
          <div style={{ margin: '14px 30px 0 30px', padding: '10px 14px', background: greenLight, borderRadius: 6, border: `1px solid ${border}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid }}>Ship To: </span>
            <span style={{ fontSize: 11, color: '#374151' }}>{formatInlineAddress(doc.deliveryAddress)}</span>
          </div>
        )}

        {/* ITEMS TABLE */}
        <div style={{ margin: '18px 30px 0 30px', border: `1px solid ${border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: green, color: '#FFFFFF', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
            <div style={{ width: 32 }}>#</div>
            <div style={{ flex: 2 }}>Item / Description</div>
            <div style={{ width: 70, textAlign: 'right' }}>HSN/SAC</div>
            <div style={{ width: 52, textAlign: 'right' }}>Qty</div>
            <div style={{ width: 88, textAlign: 'right' }}>Rate</div>
            <div style={{ width: 60, textAlign: 'right' }}>GST%</div>
            <div style={{ width: 96, textAlign: 'right' }}>Amount</div>
          </div>

          {(doc.items || []).map((it, idx) => {
            const c = lineComputed(it);
            return (
              <div key={idx} style={{ display: 'flex', padding: '9px 12px', borderTop: `1px solid ${border}`, fontSize: 11, background: idx % 2 === 0 ? '#FFFFFF' : cream, alignItems: 'flex-start' }}>
                <div style={{ width: 32, color: muted, paddingTop: 1 }}>{idx + 1}</div>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{safeText(it?.name)}</div>
                  {!!it?.description && <div style={{ fontSize: 10, color: muted, marginTop: 2, whiteSpace: 'pre-line', fontStyle: 'italic' }}>{it.description}</div>}
                  {!!it?.sku && <div style={{ fontSize: 10, color: muted }}>SKU: {it.sku}</div>}
                </div>
                <div style={{ width: 70, textAlign: 'right', color: muted }}>{safeText(it?.hsnSac) || '—'}</div>
                <div style={{ width: 52, textAlign: 'right' }}>{c.qty}</div>
                <div style={{ width: 88, textAlign: 'right' }}><Money value={c.rate} /></div>
                <div style={{ width: 60, textAlign: 'right', color: muted }}>{c.taxPct > 0 ? `${c.taxPct}%` : '—'}</div>
                <div style={{ width: 96, textAlign: 'right', fontWeight: 700, color: green }}><Money value={c.total} /></div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM SECTION */}
        <div style={{ display: 'flex', gap: 20, margin: '18px 30px 0 30px', alignItems: 'flex-start' }}>
          {/* Left: bank + words + terms */}
          <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', background: greenLight, borderRadius: 6, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid, marginBottom: 6 }}>Amount in Words</div>
              <div style={{ fontSize: 11, fontStyle: 'italic', color: '#111827', lineHeight: 1.6 }}>{amountInWordsINR(grandTotal)}</div>
            </div>

            {(profile.bankName || (profile as any).accountNumber || doc.bankName || doc.bankAccountNumber) && (
              <div style={{ padding: '12px 14px', background: '#FFFFFF', borderRadius: 6, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid, marginBottom: 8 }}>Bank Details</div>
                <KeyValueOptional label="Bank" value={doc.bankName || profile.bankName} />
                <KeyValueOptional label="Account Holder" value={(doc as any).bankAccountHolderName || profile.businessName} />
                <KeyValueOptional label="Account No." value={doc.bankAccountNumber || (profile as any).accountNumber} />
                <KeyValueOptional label="IFSC" value={doc.bankIfsc || (profile as any).ifscCode} />
              </div>
            )}

            {(profile.upiId || doc.upiId) && (
              <div style={{ padding: '12px 14px', background: '#FFFFFF', borderRadius: 6, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid, marginBottom: 8 }}>UPI Payment</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {!!doc.upiQrText && (
                    <img src={String(doc.upiQrText)} alt="UPI QR" style={{ width: 70, height: 70, borderRadius: 4, border: `1px solid ${border}`, background: '#fff', padding: 4 }} />
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: green }}>{safeText(doc.upiId || profile.upiId)}</div>
                </div>
              </div>
            )}

            {!!doc.termsConditions && (
              <div style={{ padding: '12px 14px', background: '#FFFFFF', borderRadius: 6, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid, marginBottom: 6 }}>Terms & Conditions</div>
                <div style={{ fontSize: 10, color: muted, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{doc.termsConditions}</div>
              </div>
            )}
          </div>

          {/* Right: totals */}
          <div style={{ flex: 1 }}>
            <div style={{ padding: '14px 16px', background: '#FFFFFF', borderRadius: 6, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: greenMid, marginBottom: 10 }}>Summary</div>
              <KeyValue label="Subtotal" value={<Money value={displaySubtotal(doc)} />} />
              {cgst > 0 && <KeyValue label="CGST" value={<Money value={cgst} />} />}
              {sgst > 0 && <KeyValue label="SGST" value={<Money value={sgst} />} />}
              {igst > 0 && <KeyValue label="IGST" value={<Money value={igst} />} />}
              {Number(doc.transportCharges || 0) > 0 && <KeyValue label="Transport" value={<Money value={Number(doc.transportCharges)} />} />}
              {Number(doc.additionalCharges || 0) > 0 && <KeyValue label="Additional" value={<Money value={Number(doc.additionalCharges)} />} />}
              {Number(doc.roundOff || 0) !== 0 && <KeyValue label="Round Off" value={<Money value={Number(doc.roundOff)} />} />}
              {Number(doc.receivedAmount || 0) > 0 && (
                <KeyValue label="Received" value={<Money value={Number(doc.receivedAmount)} />} />
              )}
              {Number(doc.receivedAmount || 0) > 0 && (
                <KeyValue label="Balance" value={<Money value={Number(doc.grandTotal || 0) - Number(doc.receivedAmount)} />} />
              )}

              {taxRows.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: muted, marginBottom: 6 }}>Tax Breakdown</div>
                  {taxRows.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0', color: muted }}>
                      <span>{r.kind} @ {r.rate}%</span>
                      <span style={{ fontWeight: 700 }}><Money value={r.tax} /></span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `2px solid ${green}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: green }}>
                  <span>Grand Total</span>
                  <span><Money value={grandTotal} /></span>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: green }}>For {profile.businessName}</div>
              <div style={{ height: 38 }} />
              <div style={{ fontSize: 10, color: muted, borderTop: `1px solid ${border}`, paddingTop: 4, display: 'inline-block' }}>Authorized Signatory</div>
            </div>
          </div>
        </div>

        {/* BOTTOM DECORATIVE BAR + FOOTER */}
        <div style={{ margin: '20px 30px 0 30px' }}>
          <div style={{ height: 1, background: border }} />
          <div style={{ height: 4, background: green, borderRadius: '0 0 4px 4px', marginTop: 2 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic' }}>Generated by BillVyapar</div>
            <div style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic' }}>Thank you for your business!</div>
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}
