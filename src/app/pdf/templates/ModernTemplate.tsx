import React from 'react';
import type { PdfTemplateProps } from '../types';
import { Box, Hr, KeyValue, KeyValueOptional, Label, Money, Muted, safeText, SmallText, TemplateFrame, docTitleFromType, amountInWordsINR, displaySubtotal, formatInlineAddress, formatStateDisplay, useScale, s } from './TemplateFrame';

export function ModernTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const taxes = Number(doc.totalCgst || 0) + Number(doc.totalSgst || 0) + Number(doc.totalIgst || 0);
  const receivedAmount = Math.max(0, Number((doc as any)?.receivedAmount || 0));
  const balanceAmount = Math.max(0, Number(doc.grandTotal || 0) - receivedAmount);
  const typeLower = String(doc.type || '').toLowerCase();
  const isQuotation = typeLower === 'quotation';
  const isOrder = typeLower === 'order';
  const isQuoteLike = isQuotation || isOrder;
  const businessStateCode = String(profile.gstin || '').trim().slice(0, 2);
  const partyLogo = String((doc as any)?.partyLogoDataUrl || '').trim();
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
        <div style={{ background: '#0B3A46', color: '#FFFFFF', padding: `${s(10, sc)}mm ${s(12, sc)}mm` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
              <div
                style={{
                  width: 72,
                  height: 52,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {!!partyLogo ? (
                  <img
                    src={partyLogo}
                    alt="Party Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.08)' }} />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: s(24, sc), fontWeight: 800, letterSpacing: '0.02em', lineHeight: '1.2' }}>
                  {String(docTitleFromType(doc.type) || 'DOCUMENT').toUpperCase()}
                </div>
                {!!doc.invoiceNo && (
                  <div style={{ fontSize: s(10, sc), opacity: 0.85, marginTop: 2, fontWeight: 600 }}>
                    {safeText(doc.invoiceNo)}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: s(13, sc), fontWeight: 900 }}>{profile.businessName}</div>
              {!!profile.billingAddress && (
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.85,
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
              {!!profile.phone && <div style={{ fontSize: 10, opacity: 0.85, marginTop: 4 }}>{profile.phone}</div>}
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <div style={{ fontSize: 10, opacity: 0.9, fontWeight: 800 }}>Doc No: {safeText(doc.invoiceNo) || doc.documentNumber}</div>
                {!!doc.date && <div style={{ fontSize: 10, opacity: 0.85 }}>Date: {doc.date}</div>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: `${s(10, sc)}mm`, background: '#FFFFFF', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Box>
                <Label>Bill To</Label>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 900, color: '#111827', overflowWrap: 'anywhere' }}>
                  {safeText(doc.customerName) || '—'}
                </div>
                {!!doc.customerAddress && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280', overflowWrap: 'anywhere' }}>{formatInlineAddress(doc.customerAddress)}</div>
                )}
                {!!doc.customerMobile && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>Phone: {doc.customerMobile}</div>}
                {(doc.customerGstin || (doc as any).partyGstin || (doc as any).gstin) && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>
                    GSTIN: {doc.customerGstin || (doc as any).partyGstin || (doc as any).gstin}
                  </div>
                )}
                {!!doc.customerEmail && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>Email: {doc.customerEmail}</div>}
                {!!doc.customerContactPerson && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>Contact: {doc.customerContactPerson}</div>}
                {(!!doc.customerStateCode || !!doc.placeOfSupply) && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>
                    State: {formatStateDisplay(doc.customerStateCode || null, doc.placeOfSupply || null)}
                  </div>
                )}
              </Box>

              {!!doc.deliveryAddress && (
                <div style={{ marginTop: 12 }}>
                  <Box>
                    <Label>Ship To</Label>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>{formatInlineAddress(doc.deliveryAddress)}</div>
                  </Box>
                </div>
              )}
            </div>
            <div style={{ width: 280, minWidth: 280 }}>
              <Box>
                <Label>Details</Label>
                <div style={{ marginTop: 10 }}>
                  <KeyValue label="Doc No" value={safeText(doc.invoiceNo) || doc.documentNumber} />
                  <KeyValueOptional label="Place of Supply" value={doc.placeOfSupply} />
                  <KeyValueOptional label="Due" value={doc.dueDate} />
                  <KeyValueOptional label="Ref No." value={doc.referenceNo} />
                  <KeyValueOptional label="Challan No" value={doc.challanNo} />
                  <KeyValueOptional label="Order No" value={doc.orderNumber} />
                  <KeyValueOptional label="Revision No" value={doc.revisionNumber} />
                  <KeyValueOptional label="PO No" value={doc.purchaseOrderNo} />
                  <KeyValueOptional label="PO Date" value={doc.poDate} />
                  {isOrder && !!doc.referenceDocumentNumber && (
                    <KeyValue label="Ref Quote" value={doc.referenceDocumentNumber} />
                  )}
                  <KeyValueOptional label="E-way Bill No" value={doc.ewayBillNo} />
                  <KeyValueOptional label="Vehicle No" value={doc.ewayBillVehicleNo} />
                  <KeyValueOptional label="Transport" value={doc.transport} />
                  <KeyValueOptional label="Transport ID" value={doc.transportId} />
                </div>
              </Box>
            </div>
          </div>

          {isQuoteLike && (
            <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Box>
                  <Label>Contact</Label>
                  <div style={{ marginTop: 10 }}>
                    <KeyValueOptional label="Person" value={doc.customerContactPerson} />
                    <KeyValueOptional label="Mobile" value={doc.customerMobile} />
                    <KeyValueOptional label="Email" value={doc.customerEmail} />
                    <KeyValueOptional label="State Code" value={doc.customerStateCode} />
                  </div>
                </Box>
              </div>
              <div style={{ width: 280, minWidth: 280 }}>
                <Box>
                  <Label>Delivery</Label>
                  <div style={{ marginTop: 10 }}>
                    <KeyValueOptional label="Method" value={doc.deliveryMethod} />
                    <KeyValueOptional label="Expected" value={doc.expectedDeliveryDate} />
                    {!!doc.deliveryAddress && (
                      <KeyValue label="Address" value={<div style={{ maxWidth: 170, whiteSpace: 'pre-line' }}>{doc.deliveryAddress}</div>} />
                    )}
                  </div>
                </Box>
              </div>
            </div>
          )}

          <div style={{ marginTop: s(10, sc), border: '1px solid #E5E7EB', borderRadius: s(10, sc), overflow: 'hidden' }}>
            <div style={{ background: '#F3F4F6', padding: `${s(6, sc)}px ${s(12, sc)}px` }}>
              <div style={{ display: 'flex', fontSize: s(10, sc), fontWeight: 900, color: '#111827', letterSpacing: 0.1 }}>
                <div style={{ width: 34, textAlign: 'center' }}>S.N.</div>
                <div style={{ flex: 1, minWidth: 140 }}>Item</div>
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
                <div key={idx} style={{ padding: `${s(9, sc)}px ${s(12, sc)}px`, background: rowBg, borderTop: '1px solid #E5E7EB', minHeight: `${s(12, sc)}mm` }}>
                  <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                    <div style={{ width: 34, textAlign: 'center', fontSize: s(11, sc), color: '#111827', fontWeight: 800, paddingTop: 1 }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 140, paddingRight: 8 }}>
                      <div style={{ fontSize: s(12, sc), fontWeight: 800, color: '#111827', overflowWrap: 'anywhere' }}>{it.name}</div>
                      {!!it.sku && <div style={{ marginTop: 2, fontSize: s(10, sc), color: '#6B7280' }}>SKU: {it.sku}</div>}
                      {!!it.servicePeriod && <div style={{ marginTop: 2, fontSize: s(10, sc), color: '#6B7280' }}>Service: {it.servicePeriod}</div>}
                      {!!it.description && (
                        <div style={{ marginTop: 4, fontSize: s(10, sc), color: '#4B5563', whiteSpace: 'pre-line', overflowWrap: 'anywhere', lineHeight: 1.4 }}>{it.description}</div>
                      )}
                    </div>
                    <div style={{ width: 72, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: s(11, sc), color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {safeText(it.hsnSac) || '—'}
                    </div>
                    <div style={{ width: 52, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: s(12, sc), color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{c.qty}</div>
                    <div style={{ width: 80, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: s(12, sc), color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Money value={c.rate} />
                    </div>
                    <div style={{ width: 86, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: s(12, sc), color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Money value={c.taxable} />
                    </div>
                    <div style={{ width: 56, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: s(12, sc), color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{c.taxPct.toFixed(1)}%</div>
                    <div style={{ width: 76, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: s(12, sc), color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Money value={c.taxAmount} />
                    </div>
                    <div style={{ width: 92, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: s(12, sc), fontWeight: 900, color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Money value={c.total} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Box>
                <Label>Amount In Words</Label>
                <div style={{ marginTop: 6 }}>
                  <SmallText style={{ fontWeight: 800 } as any}>{amountInWordsINR(Number(doc.grandTotal || 0))}</SmallText>
                </div>
              </Box>

              {!!doc.notes && (
                <div style={{ marginTop: 8 }}>
                  <Box>
                    <Label>Notes</Label>
                    <div style={{ marginTop: 6 }}>
                      <SmallText>
                        <div style={{ whiteSpace: 'pre-line' }}>{doc.notes}</div>
                      </SmallText>
                    </div>
                  </Box>
                </div>
              )}
              {!isOrder && (profile.upiId || doc.upiId) && (
                <div style={{ marginTop: 8 }}>
                  <Box>
                    <Label>Payment</Label>
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                      {!!doc.upiQrText && (
                        <img
                          src={String(doc.upiQrText)}
                          alt="UPI QR"
                          style={{ width: 100, height: 100, borderRadius: 8, border: '1px solid #E5E7EB' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SmallText>
                          UPI: <span style={{ fontWeight: 900 }}>{safeText(doc.upiId || profile.upiId)}</span>
                        </SmallText>
                        <Muted style={{ marginTop: 4 } as any}>Scan to pay</Muted>
                      </div>
                    </div>
                  </Box>
                </div>
              )}
              {customFields.length > 0 && (
                <div style={{ marginTop: doc.notes ? 12 : 0 }}>
                  <Box>
                    <Label>Custom Fields</Label>
                    <div style={{ marginTop: 10 }}>
                      {customFields.map((f, idx) => (
                        <KeyValue key={idx} label={f.label} value={f.value} />
                      ))}
                    </div>
                  </Box>
                </div>
              )}
              {!!doc.termsConditions && (
                <div style={{ marginTop: doc.notes ? 12 : 0 }}>
                  <Box>
                    <Label>Terms</Label>
                    <div style={{ marginTop: 8 }}>
                      <SmallText>
                        <div style={{ whiteSpace: 'pre-line' }}>{doc.termsConditions}</div>
                      </SmallText>
                    </div>
                  </Box>
                </div>
              )}

              {!isOrder && (profile.bankName || (profile as any).accountNumber || (profile as any).ifscCode || doc.bankName || doc.bankAccountNumber || doc.bankIfsc) && (
                <div style={{ marginTop: 12 }}>
                  <Box>
                    <Label>Bank Details</Label>
                    <div style={{ marginTop: 10 }}>
                      <KeyValueOptional label="Name" value={doc.bankName || profile.bankName} />
                      <KeyValueOptional
                        label="Account Holder"
                        value={
                          (doc as any).bankAccountHolderName ||
                          (doc as any).bankHolderName ||
                          (profile as any).accountHolderName ||
                          profile.businessName
                        }
                      />
                      <KeyValueOptional label="Account No" value={doc.bankAccountNumber || (profile as any).accountNumber} />
                      <KeyValueOptional label="IFSC" value={doc.bankIfsc || (profile as any).ifscCode} />
                    </div>
                  </Box>
                </div>
              )}
            </div>
            <div style={{ width: 260, minWidth: 260 }}>
              <Box>
                <Label>Summary</Label>
                <div style={{ marginTop: 6 }}>
                  <KeyValue label="Subtotal" value={<Money value={displaySubtotal(doc)} />} />
                  <KeyValue label="Taxes" value={<Money value={taxes} />} />
                  <KeyValue
                    label="Charges"
                    value={<Money value={Number(doc.transportCharges || 0) + Number(doc.additionalCharges || 0) + Number(doc.packingHandlingCharges || 0) + Number(doc.tcs || 0)} />}
                  />
                  <KeyValue label="Received" value={<Money value={receivedAmount} />} />
                  <KeyValue label="Balance" value={<Money value={balanceAmount} />} />
                  {taxRows.length ? (
                    <div style={{ marginTop: 6 }}>
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
                  <div
                    style={{
                      marginTop: 8,
                      background: '#0B3A46',
                      color: '#FFFFFF',
                      borderRadius: 8,
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900 }}>TOTAL</div>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>
                      <Money value={Number(doc.grandTotal || 0)} />
                    </div>
                  </div>
                </div>
              </Box>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div />
              <div style={{ textAlign: 'right', minWidth: 280 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#111827' }}>For: {profile.businessName}</div>
                <div style={{ marginTop: 22, fontSize: 11, color: '#111827', fontWeight: 700 }}>Authorized Signatory</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Hr />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <Muted>Generated by BillVyapar</Muted>
              <Muted>{safeText(profile.gstin) ? `GSTIN: ${profile.gstin}` : ''}</Muted>
            </div>
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}
