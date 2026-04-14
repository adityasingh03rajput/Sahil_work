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

export function ProfessionalTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const taxes = Number(doc.totalCgst || 0) + Number(doc.totalSgst || 0) + Number(doc.totalIgst || 0);
  const receivedAmount = Math.max(0, Number((doc as any)?.receivedAmount || 0));
  const grandTotal = Number(doc.grandTotal || 0);
  const balanceAmount = Math.max(0, grandTotal - receivedAmount);
  const businessStateCode = String(profile.gstin || '').trim().slice(0, 2);
  const partyLogo = String((doc as any)?.partyLogoDataUrl || '').trim();

  const colors = {
    dark: '#1A1C1E',
    accent: '#D4B996',
    bg: '#F6F3EF',
    card: '#FDFBFA',
    text: '#2D2E2F',
    muted: '#6B7280',
    border: '#E5E7EB',
  };

  const lineComputed = (it: any) => {
    const qty = Number(it?.quantity || 0);
    const rate = Number(it?.rate || 0);
    const discountPct = Number(it?.discount || 0);
    const gross = qty * rate;
    const discountAmount = (gross * discountPct) / 100;
    const taxable = gross - discountAmount;
    const cgstPct = Number(it?.cgst || 0);
    const sgstPct = Number(it?.sgst || 0);
    const igstPct = Number(it?.igst || 0);
    const taxPct = cgstPct + sgstPct + igstPct;
    const cgstAmt = (taxable * cgstPct) / 100;
    const sgstAmt = (taxable * sgstPct) / 100;
    const igstAmt = (taxable * igstPct) / 100;
    const taxAmount = cgstAmt + sgstAmt + igstAmt;
    const total = Number.isFinite(Number(it?.total)) ? Number(it.total) : taxable + taxAmount;
    return { qty, rate, taxable, taxPct, taxAmount, total, cgstPct, sgstPct, igstPct, cgstAmt, sgstAmt, igstAmt };
  };

  const taxRows: Array<{ kind: 'CGST' | 'SGST' | 'IGST'; rate: number; taxable: number; tax: number }> = [];
  const addTaxRow = (kind: 'CGST' | 'SGST' | 'IGST', rate: number, taxable: number, tax: number) => {
    if (!rate || !taxable || !tax) return;
    const existing = taxRows.find((r) => r.kind === kind && r.rate === rate);
    if (existing) { existing.taxable += taxable; existing.tax += tax; return; }
    taxRows.push({ kind, rate, taxable, tax });
  };

  (doc.items || []).forEach((it: any) => {
    const c = lineComputed(it);
    addTaxRow('CGST', c.cgstPct, c.taxable, c.cgstAmt);
    addTaxRow('SGST', c.sgstPct, c.taxable, c.sgstAmt);
    addTaxRow('IGST', c.igstPct, c.taxable, c.igstAmt);
  });

  taxRows.sort((a, b) => a.kind !== b.kind ? a.kind.localeCompare(b.kind) : a.rate - b.rate);

  // Compact card box — reduced padding
  const CardBox = ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div style={{ border: `1.5px solid ${colors.accent}`, borderRadius: 10, padding: '8px 10px', background: colors.card, height: '100%' }}>
      {title && (
        <div style={{ fontSize: 8, fontWeight: 900, color: '#8B6E4E', textTransform: 'uppercase', marginBottom: 5, letterSpacing: 0.8 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );

  const HeaderIcon = ({ path }: { path: string }) => (
    <span style={{ width: 14, height: 14, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(212,185,150,0.20)', border: `1px solid ${colors.accent}`, flex: '0 0 auto' }}>
      <svg width="9" height="9" viewBox="0 0 24 24"><path d={path} fill={colors.accent} /></svg>
    </span>
  );

  const HeaderRow = ({ icon, text }: { icon: string; text: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
      <div style={{ fontSize: 9, opacity: 0.9, lineHeight: 1.3, overflowWrap: 'anywhere', wordBreak: 'break-word', color: '#FFF', textAlign: 'right', maxWidth: 220 }}>{text}</div>
      <HeaderIcon path={icon} />
    </div>
  );

  const IconLocation = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';
  const IconPhone = 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z';
  const IconMail = 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z';
  const IconId = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z';
  const IconMap = IconLocation;

  return (
    <TemplateFrame itemCount={doc.items?.length ?? 0}>
      <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', color: colors.text }}>
        <div style={{ borderRadius: s(14, sc), overflow: 'hidden', border: `1px solid ${colors.border}`, background: colors.bg }}>

          {/* ── HEADER ── compact: 14px padding, 20px title */}
          <div style={{ background: colors.dark, padding: '14px 20px', borderBottom: `4px solid ${colors.accent}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {partyLogo ? (
                    <img src={partyLogo} alt="Logo" style={{ width: 40, height: 40, borderRadius: 999, border: `2px solid ${colors.accent}`, background: '#FFFFFF', objectFit: 'cover' }} />
                  ) : null}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#FFF', fontSize: 20, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.05 }}>
                      {String(docTitleFromType(doc.type) || 'TAX INVOICE').toUpperCase()}
                    </div>
                    <div style={{ color: colors.accent, fontSize: 10, fontWeight: 700, marginTop: 3 }}>
                      {safeText(doc.invoiceNo) || safeText(doc.documentNumber)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', color: '#FFF', maxWidth: 280 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: colors.accent }}>{profile.businessName}</div>
                <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                  {!!profile.billingAddress && <HeaderRow icon={IconLocation} text={formatInlineAddress(profile.billingAddress)} />}
                  {!!profile.phone && <HeaderRow icon={IconPhone} text={safeText(profile.phone)} />}
                  {!!profile.email && <HeaderRow icon={IconMail} text={safeText(profile.email)} />}
                  {!!profile.gstin && <HeaderRow icon={IconId} text={<span style={{ fontWeight: 900 }}>GSTIN: {profile.gstin}</span>} />}
                  {!!profile.gstin && businessStateCode && <HeaderRow icon={IconMap} text={`State: ${formatStateDisplay(businessStateCode, null)}`} />}
                </div>
                <div style={{ fontSize: 9, opacity: 0.85, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                  <div style={{ fontWeight: 800 }}>Doc No: {safeText(doc.invoiceNo) || doc.documentNumber}</div>
                  {!!doc.date && <div>Date: {doc.date}</div>}
                  {!!doc.dueDate && <div>Due: {doc.dueDate}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* ── BILL TO + INVOICE DETAILS ── */}
          <div style={{ padding: '10px 20px 0 20px', display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <div style={{ flex: 1.5, minWidth: 0 }}>
              <CardBox title="Bill To">
                <div style={{ fontSize: 12, fontWeight: 900 }}>{safeText(doc.customerName) || '—'}</div>
                {!!doc.customerAddress && <div style={{ fontSize: 9, color: colors.muted, marginTop: 3, overflowWrap: 'anywhere' }}>{formatInlineAddress(doc.customerAddress)}</div>}
                {!!doc.customerMobile && <div style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>Phone: {safeText(doc.customerMobile)}</div>}
                {!!doc.customerEmail && <div style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>Email: {safeText(doc.customerEmail)}</div>}
                {!!doc.customerContactPerson && <div style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>Contact: {safeText(doc.customerContactPerson)}</div>}
                {!!doc.customerGstin && <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3 }}>GSTIN: {safeText(doc.customerGstin)}</div>}
                {(!!doc.customerStateCode || !!doc.placeOfSupply) && (
                  <div style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>State: {formatStateDisplay(doc.customerStateCode || null, doc.placeOfSupply || null)}</div>
                )}
              </CardBox>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CardBox title="Invoice Details">
                <KeyValue label="Document" value={safeText(doc.invoiceNo) || safeText(doc.documentNumber)} />
                <KeyValueOptional label="Date" value={doc.date} />
                <KeyValueOptional label="Due Date" value={doc.dueDate} />
                <KeyValueOptional label="Ref No." value={doc.referenceNo} />
                <KeyValueOptional label="Challan No." value={doc.challanNo} />
                <KeyValueOptional label="Order No." value={doc.orderNumber} />
                <KeyValueOptional label="Revision No." value={doc.revisionNumber} />
                <KeyValueOptional label="PO No." value={doc.purchaseOrderNo} />
                <KeyValueOptional label="PO Date" value={doc.poDate} />
                <KeyValueOptional label="Place of Supply" value={doc.placeOfSupply} />
              </CardBox>
            </div>
          </div>

          {!!doc.deliveryAddress && (
            <div style={{ padding: '8px 20px 0 20px' }}>
              <CardBox title="Ship To">
                <div style={{ fontSize: 9, color: colors.muted, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{formatInlineAddress(doc.deliveryAddress)}</div>
              </CardBox>
            </div>
          )}

          {/* ── ITEMS TABLE ── */}
          <div style={{ padding: '10px 20px 0 20px' }}>
            <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${colors.border}`, background: '#FFFFFF' }}>
              <div style={{ background: colors.dark, color: '#FFF', display: 'flex', padding: '7px 10px', fontSize: 9, fontWeight: 900, letterSpacing: 0.4 }}>
                <div style={{ width: 32 }}>S.N.</div>
                <div style={{ flex: 2 }}>Item</div>
                <div style={{ width: 68, textAlign: 'right' }}>HSN/SAC</div>
                <div style={{ width: 50, textAlign: 'right' }}>Qty</div>
                <div style={{ width: 80, textAlign: 'right' }}>Price/Unit</div>
                <div style={{ width: 56, textAlign: 'right' }}>GST%</div>
                <div style={{ width: 86, textAlign: 'right' }}>Amount</div>
              </div>

              {doc.items?.map((it, idx) => {
                const c = lineComputed(it);
                return (
                  <div key={idx} style={{ display: 'flex', padding: '6px 10px', borderTop: `1px solid ${colors.border}`, fontSize: 10, background: idx % 2 ? '#FAFAFA' : '#FFFFFF', alignItems: 'flex-start' }}>
                    <div style={{ width: 32, fontWeight: 800, paddingTop: 1 }}>{idx + 1}</div>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      <div style={{ fontWeight: 900 }}>{safeText(it?.name) || '—'}</div>
                      {!!it?.description && <div style={{ marginTop: 2, fontSize: 9, color: '#374151', whiteSpace: 'pre-line' }}>{safeText(it.description)}</div>}
                      {!!it?.sku && <div style={{ marginTop: 2, fontSize: 9, color: colors.muted }}>SKU: {safeText(it.sku)}</div>}
                    </div>
                    <div style={{ width: 68, textAlign: 'right', color: '#111827' }}>{safeText(it?.hsnSac) || '—'}</div>
                    <div style={{ width: 50, textAlign: 'right' }}>{c.qty}</div>
                    <div style={{ width: 80, textAlign: 'right' }}><Money value={c.rate} /></div>
                    <div style={{ width: 56, textAlign: 'right' }}>{c.taxPct.toFixed(1)}%</div>
                    <div style={{ width: 86, textAlign: 'right', fontWeight: 900 }}><Money value={c.total} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── BOTTOM: UPI/Bank/Words + Summary ── */}
          <div style={{ padding: '10px 20px 10px 20px', display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(profile.upiId || doc.upiId) && (
                <CardBox title="Payment">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!!doc.upiQrText && (
                      <img src={String(doc.upiQrText)} alt="UPI QR" style={{ width: 60, height: 60, borderRadius: 6, border: `1px solid ${colors.border}`, background: '#FFFFFF', padding: 3 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: colors.muted }}>Scan to pay</div>
                      <div style={{ fontSize: 10, color: colors.accent, fontWeight: 900, marginTop: 2 }}>{safeText(doc.upiId || profile.upiId)}</div>
                      <KeyValueOptional label="Mode" value={doc.paymentMode} />
                    </div>
                  </div>
                </CardBox>
              )}

              <CardBox title="Amount in Words">
                <div style={{ fontSize: 9, fontWeight: 800, fontStyle: 'italic', lineHeight: 1.4 }}>
                  {amountInWordsINR(Number(doc.grandTotal || 0))}
                </div>
              </CardBox>

              {(profile.bankName || (profile as any).accountNumber || (profile as any).ifscCode || doc.bankName || doc.bankAccountNumber || doc.bankIfsc) && (
                <CardBox title="Bank Details">
                  <KeyValueOptional label="Bank" value={doc.bankName || profile.bankName} />
                  <KeyValueOptional label="Account Holder" value={(doc as any).bankAccountHolderName || (doc as any).bankHolderName || (profile as any).accountHolderName || profile.businessName} />
                  <KeyValueOptional label="Account No." value={doc.bankAccountNumber || (profile as any).accountNumber} />
                  <KeyValueOptional label="IFSC" value={doc.bankIfsc || (profile as any).ifscCode} />
                </CardBox>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <CardBox title="Summary">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
                  <span style={{ color: colors.muted, fontWeight: 700 }}>Subtotal</span>
                  <span style={{ fontWeight: 900 }}><Money value={displaySubtotal(doc)} /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
                  <span style={{ color: colors.muted, fontWeight: 700 }}>Taxes</span>
                  <span style={{ fontWeight: 900 }}><Money value={taxes} /></span>
                </div>
                {(Number(doc.transportCharges || 0) + Number(doc.additionalCharges || 0) + Number(doc.packingHandlingCharges || 0) + Number(doc.tcs || 0)) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
                    <span style={{ color: colors.muted, fontWeight: 700 }}>Charges</span>
                    <span style={{ fontWeight: 900 }}><Money value={Number(doc.transportCharges || 0) + Number(doc.additionalCharges || 0) + Number(doc.packingHandlingCharges || 0) + Number(doc.tcs || 0)} /></span>
                  </div>
                )}
                {Number(doc.roundOff || 0) !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
                    <span style={{ color: colors.muted, fontWeight: 700 }}>Round Off</span>
                    <span style={{ fontWeight: 900 }}><Money value={Number(doc.roundOff || 0)} /></span>
                  </div>
                )}
                {receivedAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
                    <span style={{ color: colors.muted, fontWeight: 700 }}>Received</span>
                    <span style={{ fontWeight: 900 }}><Money value={receivedAmount} /></span>
                  </div>
                )}

                {taxRows.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: colors.text, marginBottom: 4 }}>Tax Details</div>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden', background: '#FFFFFF' }}>
                      <div style={{ display: 'flex', background: '#F9FAFB', padding: '4px 6px', fontSize: 8, fontWeight: 900, color: colors.text }}>
                        <div style={{ width: 36 }}>Tax</div>
                        <div style={{ width: 32, textAlign: 'right' }}>Rate</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>Taxable</div>
                        <div style={{ width: 58, textAlign: 'right' }}>Amount</div>
                      </div>
                      {taxRows.map((r, idx) => (
                        <div key={`${r.kind}-${r.rate}-${idx}`} style={{ display: 'flex', padding: '4px 6px', borderTop: `1px solid ${colors.border}`, fontSize: 8, color: colors.text }}>
                          <div style={{ width: 36, fontWeight: 900 }}>{r.kind}</div>
                          <div style={{ width: 32, textAlign: 'right' }}>{r.rate.toFixed(1)}%</div>
                          <div style={{ flex: 1, textAlign: 'right' }}><Money value={r.taxable} /></div>
                          <div style={{ width: 58, textAlign: 'right', fontWeight: 900 }}><Money value={r.tax} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  <Hr color={colors.border} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, color: colors.dark, marginTop: 6 }}>
                  <span>Total</span>
                  <span><Money value={grandTotal} /></span>
                </div>
                {balanceAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 900, marginTop: 4, color: colors.text }}>
                    <span style={{ color: colors.muted }}>Balance</span>
                    <span><Money value={balanceAmount} /></span>
                  </div>
                )}
              </CardBox>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ padding: '0 20px 10px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 9, color: colors.muted }}>Thank you for your business!</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 900 }}>For {profile.businessName}</div>
                <div style={{ height: 22 }} />
                <div style={{ fontSize: 9, borderTop: `1px solid ${colors.border}`, paddingTop: 3 }}>Authorized Signatory</div>
              </div>
            </div>
            <Hr color={colors.border} />
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 9, color: colors.muted }}>Generated by BillVyapar</div>
              <div style={{ fontSize: 9, color: colors.muted }}>{safeText(profile.gstin) ? `GSTIN: ${profile.gstin}` : ''}</div>
            </div>
          </div>

        </div>
      </div>
    </TemplateFrame>
  );
}
