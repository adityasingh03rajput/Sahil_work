import React from 'react';
import type { PdfTemplateProps } from '../types';
import { Box, Hr, KeyValue, KeyValueOptional, Label, Money, Muted, safeText, SmallText, TemplateFrame, docTitleFromType, amountInWordsINR, formatInlineAddress, formatStateDisplay } from './TemplateFrame';

export function ModernTemplate({ doc, profile }: PdfTemplateProps) {
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
    <TemplateFrame>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        <div style={{ background: '#0B3A46', color: '#FFFFFF', padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
              <div
                style={{
                  width: 78,
                  height: 56,
                  borderRadius: 10,
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
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 0.6, lineHeight: 1.05 }}>
                  {String(docTitleFromType(doc.type) || 'DOCUMENT').toUpperCase()}
                </div>
                {!!doc.invoiceNo && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, fontWeight: 700 }}>
                    {safeText(doc.invoiceNo)}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 900 }}>{profile.businessName}</div>
              {!!profile.billingAddress && (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.85,
                    marginTop: 10,
                    maxWidth: 260,
                    marginLeft: 'auto',
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatInlineAddress(profile.billingAddress)}
                </div>
              )}
              {!!profile.phone && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 8 }}>{profile.phone}</div>}
              {!!profile.email && <div style={{ fontSize: 11, opacity: 0.85 }}>{profile.email}</div>}
              {!!profile.gstin && <div style={{ fontSize: 11, opacity: 0.85 }}>GSTIN: {profile.gstin}</div>}
              {!!profile.gstin && businessStateCode && (
                <div style={{ fontSize: 11, opacity: 0.85 }}>State: {formatStateDisplay(businessStateCode, null)}</div>
              )}
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 800 }}>Doc No: {doc.documentNumber}</div>
                {!!doc.date && <div style={{ fontSize: 11, opacity: 0.85 }}>Date: {doc.date}</div>}
                {!!doc.dueDate && <div style={{ fontSize: 11, opacity: 0.85 }}>Due: {doc.dueDate}</div>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 26, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Box>
                <Label>Bill To</Label>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 900, color: '#111827' }}>
                  {safeText(doc.customerName) || '—'}
                </div>
                {!!doc.customerAddress && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>{formatInlineAddress(doc.customerAddress)}</div>
                )}
                {!!doc.customerMobile && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>Phone: {doc.customerMobile}</div>}
                {!!doc.customerGstin && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>GSTIN: {doc.customerGstin}</div>}
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
                  <KeyValue label="Doc No" value={doc.documentNumber} />
                  <KeyValueOptional label="Place of Supply" value={doc.placeOfSupply} />
                  <KeyValueOptional label="Due" value={doc.dueDate} />
                  {isOrder && !!doc.referenceDocumentNumber && (
                    <KeyValue label="Ref Quote" value={doc.referenceDocumentNumber} />
                  )}
                  <KeyValueOptional label="Order" value={isQuoteLike ? doc.orderNumber : null} />
                  <KeyValueOptional label="Invoice No" value={doc.invoiceNo} />
                  <KeyValueOptional label="Challan No" value={doc.challanNo} />
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

          <div style={{ marginTop: 16, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#F3F4F6', padding: '9px 12px' }}>
              <div style={{ display: 'flex', fontSize: 11, fontWeight: 900, color: '#111827', letterSpacing: 0.2 }}>
                <div style={{ width: 34, textAlign: 'center' }}>S.N.</div>
                <div style={{ flex: 1 }}>Item</div>
                <div style={{ width: 72, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>HSN/SAC</div>
                <div style={{ width: 52, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>Qty</div>
                <div style={{ width: 80, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>Price/Unit</div>
                <div style={{ width: 86, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>Taxable</div>
                <div style={{ width: 56, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>GST%</div>
                <div style={{ width: 76, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>Tax</div>
                <div style={{ width: 92, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>Amount</div>
              </div>
            </div>

            {doc.items?.map((it, idx) => {
              const rowBg = idx % 2 ? '#FFFFFF' : '#FAFAFA';
              const c = lineComputed(it);
              return (
                <div key={idx} style={{ padding: '9px 12px', background: rowBg, borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, textAlign: 'center', fontSize: 11, color: '#111827', fontWeight: 800, paddingTop: 1 }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{it.name}</div>
                      {!!it.sku && <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>SKU: {it.sku}</div>}
                      {!!it.servicePeriod && <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>Service: {it.servicePeriod}</div>}
                      {!!it.description && (
                        <div style={{ marginTop: 4, fontSize: 10, color: '#374151', whiteSpace: 'pre-line' }}>{it.description}</div>
                      )}
                    </div>
                    <div style={{ width: 72, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: 11, color: '#111827' }}>
                      {safeText(it.hsnSac) || '—'}
                    </div>
                    <div style={{ width: 52, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: 12, color: '#111827' }}>{c.qty}</div>
                    <div style={{ width: 80, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: 12, color: '#111827' }}>
                      <Money value={c.rate} />
                    </div>
                    <div style={{ width: 86, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: 12, color: '#111827' }}>
                      <Money value={c.taxable} />
                    </div>
                    <div style={{ width: 56, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: 12, color: '#111827' }}>{c.taxPct.toFixed(2)}</div>
                    <div style={{ width: 76, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: 12, color: '#111827' }}>
                      <Money value={c.taxAmount} />
                    </div>
                    <div style={{ width: 92, textAlign: 'right', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, fontSize: 12, fontWeight: 900, color: '#111827' }}>
                      <Money value={c.total} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Box>
                <Label>Invoice Amount In Words</Label>
                <div style={{ marginTop: 8 }}>
                  <SmallText style={{ fontWeight: 800 } as any}>{amountInWordsINR(Number(doc.grandTotal || 0))}</SmallText>
                </div>
              </Box>

              {!!doc.notes && (
                <div style={{ marginTop: 12 }}>
                  <Box>
                    <Label>Notes</Label>
                    <div style={{ marginTop: 8 }}>
                      <SmallText>
                        <div style={{ whiteSpace: 'pre-line' }}>{doc.notes}</div>
                      </SmallText>
                    </div>
                  </Box>
                </div>
              )}
              {!isOrder && (profile.upiId || doc.upiId) && (
                <div style={{ marginTop: doc.notes ? 12 : 0 }}>
                  <Box>
                    <Label>Payment</Label>
                    <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                      {!!doc.upiQrText && (
                        <img
                          src={String(doc.upiQrText)}
                          alt="UPI QR"
                          style={{ width: 120, height: 120, borderRadius: 12, border: '1px solid #E5E7EB' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SmallText>
                          UPI: <span style={{ fontWeight: 900 }}>{safeText(doc.upiId || profile.upiId)}</span>
                        </SmallText>
                        <Muted style={{ marginTop: 6 } as any}>Scan the QR to pay</Muted>
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

            <div style={{ width: 280, minWidth: 280 }}>
              <Box>
                <Label>Summary</Label>
                <div style={{ marginTop: 10 }}>
                  <KeyValue label="Subtotal" value={<Money value={Number(doc.subtotal || 0)} />} />
                  <KeyValue label="Taxes" value={<Money value={taxes} />} />
                  <KeyValue
                    label="Charges"
                    value={<Money value={Number(doc.transportCharges || 0) + Number(doc.additionalCharges || 0) + Number(doc.packingHandlingCharges || 0) + Number(doc.tcs || 0)} />}
                  />
                  <KeyValue label="Received" value={<Money value={receivedAmount} />} />
                  <KeyValue label="Balance" value={<Money value={balanceAmount} />} />
                  {isQuoteLike && !!Number(doc.packingHandlingCharges || 0) && (
                    <KeyValue label="Packing" value={<Money value={Number(doc.packingHandlingCharges || 0)} />} />
                  )}
                  {isQuoteLike && !!Number(doc.tcs || 0) && <KeyValue label="TCS" value={<Money value={Number(doc.tcs || 0)} />} />}
                  {taxRows.length ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Tax Details</div>
                      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                        <div
                          style={{
                            display: 'flex',
                            background: '#F9FAFB',
                            padding: '6px 8px',
                            fontSize: 10,
                            fontWeight: 800,
                            color: '#111827',
                          }}
                        >
                          <div style={{ width: 44 }}>Tax</div>
                          <div style={{ width: 38, textAlign: 'right' }}>Rate</div>
                          <div style={{ flex: 1, textAlign: 'right' }}>Taxable</div>
                          <div style={{ width: 68, textAlign: 'right' }}>Amount</div>
                        </div>
                        {taxRows.map((r, idx) => (
                          <div
                            key={`${r.kind}-${r.rate}-${idx}`}
                            style={{ display: 'flex', padding: '6px 8px', borderTop: '1px solid #E5E7EB', fontSize: 10, color: '#111827' }}
                          >
                            <div style={{ width: 44, fontWeight: 800 }}>{r.kind}</div>
                            <div style={{ width: 38, textAlign: 'right' }}>{r.rate.toFixed(2)}%</div>
                            <div style={{ flex: 1, textAlign: 'right' }}>
                              <Money value={r.taxable} />
                            </div>
                            <div style={{ width: 68, textAlign: 'right', fontWeight: 800 }}>
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
                      marginTop: 10,
                      background: '#0B3A46',
                      color: '#FFFFFF',
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 900 }}>TOTAL</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>
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
