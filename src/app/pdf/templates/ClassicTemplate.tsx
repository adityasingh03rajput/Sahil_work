import React from 'react';
import type { PdfTemplateProps } from '../types';
import {
  Box,
  Hr,
  KeyValue,
  KeyValueOptional,
  Label,
  Money,
  Muted,
  safeText,
  SmallText,
  TemplateFrame,
  TwoCol,
  docTitleFromType,
  amountInWordsINR,
  displaySubtotal,
  formatInlineAddress,
  formatStateDisplay,
  useScale,
  s,
} from './TemplateFrame';

export function ClassicTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const taxes = Number(doc.totalCgst || 0) + Number(doc.totalSgst || 0) + Number(doc.totalIgst || 0);
  const typeLower = String(doc.type || '').toLowerCase();
  const isQuotation = typeLower === 'quotation';
  const isOrder = typeLower === 'order';
  const isQuoteLike = isQuotation || isOrder;
  const businessStateCode = String(profile.gstin || '').trim().slice(0, 2);
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
    return { qty, rate, taxable, taxPct, cgstPct, sgstPct, igstPct, cgstAmt, sgstAmt, igstAmt, taxAmount, total };
  };

  const taxRows: Array<{ kind: 'CGST' | 'SGST' | 'IGST'; rate: number; taxable: number; tax: number }> = [];
  const addTaxRow = (kind: 'CGST' | 'SGST' | 'IGST', rate: number, taxable: number, tax: number) => {
    if (!rate || !taxable || !tax) return;
    const existing = taxRows.find((r) => r.kind === kind && r.rate === rate);
    if (existing) {
      existing.taxable += taxable;
      existing.tax += tax;
      return;
    }
    taxRows.push({ kind, rate, taxable, tax });
  };

  (doc.items || []).forEach((it: any) => {
    const c = lineComputed(it);
    addTaxRow('CGST', c.cgstPct, c.taxable, c.cgstAmt);
    addTaxRow('SGST', c.sgstPct, c.taxable, c.sgstAmt);
    addTaxRow('IGST', c.igstPct, c.taxable, c.igstAmt);
  });

  taxRows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.rate - b.rate;
  });
  const customFields = Array.isArray(doc.customFields)
    ? doc.customFields
        .map((x) => ({ label: String(x?.label || '').trim(), value: String(x?.value || '').trim() }))
        .filter((x) => x.label && x.value)
    : [];

  return (
    <TemplateFrame itemCount={doc.items?.length ?? 0}>
      <div style={{ borderRadius: s(12, sc), overflow: 'hidden', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ background: '#0E5A74', color: '#FFFFFF', padding: `${s(10, sc)}mm ${s(12, sc)}mm` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              {!!(doc as any)?.partyLogoDataUrl && (
                <div style={{ marginBottom: 10 }}>
                  <img
                    src={String((doc as any).partyLogoDataUrl)}
                    alt="Party Logo"
                    style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 10, background: '#FFFFFF', padding: 6 }}
                  />
                </div>
              )}
              <div style={{ fontSize: s(28, sc), fontWeight: 900, letterSpacing: 1.2, lineHeight: 1 }}>
                {String(docTitleFromType(doc.type) || 'DOCUMENT').toUpperCase()}
              </div>
              <div style={{ fontSize: s(11, sc), opacity: 0.95, marginTop: 6, fontWeight: 600 }}>
                {safeText(doc.invoiceNo) || safeText(doc.documentNumber)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: s(13, sc), fontWeight: 800 }}>{profile.businessName}</div>
              {!!profile.billingAddress && (
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.9,
                    marginTop: 6,
                    maxWidth: 240,
                    marginLeft: 'auto',
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatInlineAddress(profile.billingAddress)}
                </div>
              )}
              {!!profile.phone && <div style={{ fontSize: 10, opacity: 0.9, marginTop: 6 }}>{profile.phone}</div>}
              {!!profile.gstin && <div style={{ fontSize: 10, opacity: 0.9 }}>GSTIN: {profile.gstin}</div>}
            </div>
          </div>
        </div>

        <div style={{ padding: `${s(10, sc)}mm`, background: '#FFFFFF', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Box>
                <Label>Bill To</Label>
                <div style={{ marginTop: 6, fontSize: s(13, sc), fontWeight: 800, color: '#111827' }}>
                  {safeText(doc.customerName)}
                </div>
                {!!doc.customerAddress && (
                  <div style={{ marginTop: 4, fontSize: 10, color: '#6B7280' }}>{formatInlineAddress(doc.customerAddress)}</div>
                )}
                {!!doc.customerGstin && <div style={{ marginTop: 4, fontSize: 10, color: '#111827', fontWeight: 700 }}>GSTIN: {doc.customerGstin}</div>}
                {!!doc.customerMobile && <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>Phone: {doc.customerMobile}</div>}
                {!!doc.customerEmail && <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>Email: {doc.customerEmail}</div>}
                {!!doc.customerContactPerson && <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>Contact: {doc.customerContactPerson}</div>}
                {(!!doc.customerStateCode || !!doc.placeOfSupply) && (
                  <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>
                    State: {formatStateDisplay(doc.customerStateCode || null, doc.placeOfSupply || null)}
                  </div>
                )}
              </Box>

              {!!doc.deliveryAddress && (
                <div style={{ marginTop: 10 }}>
                  <Box>
                    <Label>Ship To</Label>
                    <div style={{ marginTop: 6, fontSize: 10, color: '#6B7280' }}>{formatInlineAddress(doc.deliveryAddress)}</div>
                  </Box>
                </div>
              )}
            </div>

            <div style={{ width: 260, minWidth: 260 }}>
              <Box>
                <Label>Invoice Details</Label>
                <div style={{ marginTop: 8 }}>
                  <KeyValue label="Document" value={safeText(doc.invoiceNo) || safeText(doc.documentNumber)} />
                  <KeyValueOptional label="Date" value={doc.date} />
                  <KeyValueOptional label="Due Date" value={doc.dueDate} />
                  <KeyValueOptional label="Place of Supply" value={doc.placeOfSupply} />
                  <KeyValueOptional label="Ref No." value={doc.referenceNo} />
                  <KeyValueOptional label="Challan No." value={doc.challanNo} />
                  <KeyValueOptional label="Order No." value={doc.orderNumber} />
                  <KeyValueOptional label="Revision No." value={doc.revisionNumber} />
                  <KeyValueOptional label="PO No." value={doc.purchaseOrderNo} />
                  <KeyValueOptional label="PO Date" value={doc.poDate} />
                  {isOrder && !!doc.referenceDocumentNumber && (
                    <KeyValue label="Ref Quote" value={doc.referenceDocumentNumber} />
                  )}
                </div>
              </Box>
            </div>
          </div>

          <div style={{ marginTop: s(12, sc), border: '1px solid #E5E7EB', borderRadius: s(10, sc), overflow: 'hidden' }}>
            <div style={{ background: '#F3F4F6', padding: `${s(6, sc)}px ${s(12, sc)}px` }}>
              <div style={{ display: 'flex', fontSize: s(10, sc), fontWeight: 800, color: '#111827' }}>
                <div style={{ width: 34, textAlign: 'center' }}>S.N.</div>
                <div style={{ flex: 1 }}>Item</div>
                <div style={{ width: 68, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6 }}>HSN/SAC</div>
                <div style={{ width: 48, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6 }}>Qty</div>
                <div style={{ width: 76, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6 }}>Price</div>
                <div style={{ width: 80, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6 }}>Taxable</div>
                <div style={{ width: 50, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6 }}>GST%</div>
                <div style={{ width: 70, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6 }}>Tax</div>
                <div style={{ width: 86, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6 }}>Amount</div>
              </div>
            </div>

            {doc.items?.map((it, idx) => {
              const rowBg = idx % 2 ? '#FFFFFF' : '#FAFAFA';
              const c = lineComputed(it);
              return (
                <div key={idx} style={{ padding: `${s(8, sc)}px ${s(12, sc)}px`, background: rowBg, borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                    <div style={{ width: 34, textAlign: 'center', fontSize: s(10, sc), color: '#111827', fontWeight: 800 }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: s(11, sc), fontWeight: 700, color: '#111827' }}>{it.name}</div>
                      {!!it.description && (
                        <div style={{ marginTop: 2, fontSize: s(9, sc), color: '#374151', whiteSpace: 'pre-line' }}>{it.description}</div>
                      )}
                    </div>
                    <div style={{ width: 68, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6, fontSize: s(10, sc), color: '#111827' }}>
                      {safeText(it.hsnSac) || '—'}
                    </div>
                    <div style={{ width: 48, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6, fontSize: s(11, sc), color: '#111827' }}>{c.qty}</div>
                    <div style={{ width: 76, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6, fontSize: s(11, sc), color: '#111827' }}>
                      <Money value={c.rate} />
                    </div>
                    <div style={{ width: 80, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6, fontSize: s(11, sc), color: '#111827' }}>
                      <Money value={c.taxable} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6, fontSize: s(11, sc), color: '#111827' }}>{c.taxPct.toFixed(1)}</div>
                    <div style={{ width: 70, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6, fontSize: s(11, sc), color: '#111827' }}>
                      <Money value={c.taxAmount} />
                    </div>
                    <div style={{ width: 86, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 6, fontSize: s(11, sc), fontWeight: 800, color: '#111827' }}>
                      <Money value={c.total} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: s(16, sc), alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 12 }}>
                <Box>
                  <Label>Amount in Words</Label>
                  <div style={{ marginTop: 8, paddingBottom: 4 }}>
                    <SmallText style={{ fontWeight: 700, lineHeight: 1.4 } as any}>
                      {amountInWordsINR(Number(doc.grandTotal || 0))}
                    </SmallText>
                  </div>
                </Box>
              </div>

              {(profile.upiId || doc.upiId) && (
                <div style={{ marginBottom: 12 }}>
                  <Box>
                    <Label>Payment & QR</Label>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        {!!doc.upiQrText && (
                          <img
                            src={String(doc.upiQrText)}
                            alt="UPI QR"
                            style={{ width: 100, height: 100, borderRadius: 10, border: '1px solid #E5E7EB', padding: 4 }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <SmallText style={{ fontWeight: 800, color: '#111827' } as any}>Scan to pay via UPI</SmallText>
                          <div style={{ marginTop: 6, fontSize: 11, color: '#4B5563' }}>
                            ID: <span style={{ fontWeight: 800, color: '#111827' }}>{safeText(doc.upiId || profile.upiId)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Box>
                </div>
              )}

              {!!doc.termsConditions && (
                <Box>
                  <Label>Terms & Conditions</Label>
                  <div style={{ marginTop: 6 }}>
                    <SmallText style={{ lineHeight: 1.4 } as any}>
                      <div style={{ whiteSpace: 'pre-line' }}>{doc.termsConditions}</div>
                    </SmallText>
                  </div>
                </Box>
              )}
            </div>

            <div style={{ width: 280, minWidth: 280 }}>
              <Box>
                <Label>Invoice Summary</Label>
                <div style={{ marginTop: 8 }}>
                  <KeyValue label="Subtotal" value={<Money value={displaySubtotal(doc)} />} />
                  <KeyValue label="Taxes" value={<Money value={taxes} />} />
                  <KeyValue
                    label="Charges"
                    value={<Money value={Number(doc.transportCharges || 0) + Number(doc.additionalCharges || 0) + Number(doc.packingHandlingCharges || 0) + Number(doc.tcs || 0)} />}
                  />
                  <KeyValue label="Round Off" value={<Money value={Number(doc.roundOff || 0)} />} />
                  {taxRows.length ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Tax Details</div>
                      <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                        <div
                          style={{
                            display: 'flex',
                            background: '#F9FAFB',
                            padding: '4px 6px',
                            fontSize: 9,
                            fontWeight: 800,
                            color: '#111827',
                          }}
                        >
                          <div style={{ width: 40 }}>Tax</div>
                          <div style={{ width: 34, textAlign: 'right' }}>Rate</div>
                          <div style={{ flex: 1, textAlign: 'right' }}>Taxable</div>
                          <div style={{ width: 60, textAlign: 'right' }}>Amount</div>
                        </div>
                        {taxRows.map((r, idx) => (
                          <div
                            key={`${r.kind}-${r.rate}-${idx}`}
                            style={{ display: 'flex', padding: '4px 6px', borderTop: '1px solid #E5E7EB', fontSize: 9, color: '#111827' }}
                          >
                            <div style={{ width: 40, fontWeight: 800 }}>{r.kind}</div>
                            <div style={{ width: 34, textAlign: 'right' }}>{r.rate.toFixed(1)}%</div>
                            <div style={{ flex: 1, textAlign: 'right' }}>
                              <Money value={r.taxable} />
                            </div>
                            <div style={{ width: 60, textAlign: 'right', fontWeight: 800 }}>
                              <Money value={r.tax} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <Hr />
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#111827' }}>Total</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
                      <Money value={Number(doc.grandTotal || 0)} />
                    </div>
                  </div>
                </div>
              </Box>
            </div>
          </div>

          <div style={{ marginTop: s(10, sc) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div />
              <div style={{ textAlign: 'right', minWidth: 260 }}>
                <div style={{ fontSize: s(11, sc), fontWeight: 900, color: '#111827' }}>For: {profile.businessName}</div>
                <div style={{ marginTop: s(20, sc), fontSize: s(10, sc), color: '#111827', fontWeight: 700 }}>Authorized Signatory</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: s(14, sc), borderTop: '1px solid #E5E7EB', paddingTop: s(10, sc) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Muted>Thank you for your business!</Muted>
              <Muted>Generated by BillVyapar</Muted>
            </div>
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}
