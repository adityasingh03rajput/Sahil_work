import React from 'react';
import type { PdfTemplateProps } from '../types';
import {
  Box,
  Hr,
  KeyValue,
  Label,
  Money,
  Muted,
  safeText,
  SmallText,
  TemplateFrame,
  TwoCol,
  docTitleFromType,
} from './TemplateFrame';

export function ClassicTemplate({ doc, profile }: PdfTemplateProps) {
  const taxes = Number(doc.totalCgst || 0) + Number(doc.totalSgst || 0) + Number(doc.totalIgst || 0);
  const typeLower = String(doc.type || '').toLowerCase();
  const isQuotation = typeLower === 'quotation';
  const isOrder = typeLower === 'order';
  const isQuoteLike = isQuotation || isOrder;

  return (
    <TemplateFrame>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        <div style={{ background: '#0E5A74', color: '#FFFFFF', padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 1.2, lineHeight: 1 }}>INVOICE</div>
              <div style={{ fontSize: 12, opacity: 0.95, marginTop: 8, fontWeight: 600 }}>
                {docTitleFromType(doc.type)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{profile.businessName}</div>
              <div style={{ fontSize: 12, opacity: 0.95, marginTop: 4 }}>{profile.ownerName}</div>
              {!!profile.billingAddress && (
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 8, whiteSpace: 'pre-line' }}>
                  {profile.billingAddress}
                </div>
              )}
              {!!profile.phone && <div style={{ fontSize: 11, opacity: 0.9, marginTop: 8 }}>{profile.phone}</div>}
              {!!profile.email && <div style={{ fontSize: 11, opacity: 0.9 }}>{profile.email}</div>}
            </div>
          </div>
        </div>

        <div style={{ padding: 28, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Box>
                <Label>Bill To</Label>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: '#111827' }}>
                  {safeText(doc.customerName) || '—'}
                </div>
                {!!doc.customerAddress && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280', whiteSpace: 'pre-line' }}>
                    {doc.customerAddress}
                  </div>
                )}
                {!!doc.customerGstin && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>GSTIN: {doc.customerGstin}</div>}
              </Box>
            </div>

            <div style={{ width: 280, minWidth: 280 }}>
              <Box>
                <Label>Invoice Details</Label>
                <div style={{ marginTop: 10 }}>
                  <KeyValue label="Document" value={doc.documentNumber} />
                  {!!doc.date && <KeyValue label="Date" value={doc.date} />}
                  {!!doc.dueDate && <KeyValue label="Due" value={doc.dueDate} />}
                  {!!doc.placeOfSupply && <KeyValue label="Supply" value={doc.placeOfSupply} />}
                  {isOrder && !!doc.referenceDocumentNumber && (
                    <KeyValue label="Ref Quote" value={doc.referenceDocumentNumber} />
                  )}
                  {isQuoteLike && !!doc.orderNumber && <KeyValue label="Order" value={doc.orderNumber} />}
                  {isQuoteLike && !!doc.revisionNumber && <KeyValue label="Revision" value={doc.revisionNumber} />}
                  {isQuoteLike && !!doc.referenceNo && <KeyValue label="Ref" value={doc.referenceNo} />}
                  {isQuoteLike && !!doc.purchaseOrderNo && <KeyValue label="PO No" value={doc.purchaseOrderNo} />}
                  {isQuoteLike && !!doc.poDate && <KeyValue label="PO Date" value={doc.poDate} />}
                </div>
              </Box>
            </div>
          </div>

          {isQuoteLike && (
            <div style={{ marginTop: 14 }}>
              <TwoCol
                left={
                  <Box>
                    <Label>Contact</Label>
                    <div style={{ marginTop: 10 }}>
                      {!!doc.customerContactPerson && <KeyValue label="Person" value={doc.customerContactPerson} />}
                      {!!doc.customerMobile && <KeyValue label="Mobile" value={doc.customerMobile} />}
                      {!!doc.customerEmail && <KeyValue label="Email" value={doc.customerEmail} />}
                      {!!doc.customerStateCode && <KeyValue label="State Code" value={doc.customerStateCode} />}
                      {!doc.customerContactPerson && !doc.customerMobile && !doc.customerEmail && !doc.customerStateCode && (
                        <Muted>—</Muted>
                      )}
                    </div>
                  </Box>
                }
                right={
                  <Box>
                    <Label>Delivery</Label>
                    <div style={{ marginTop: 10 }}>
                      {!!doc.deliveryMethod && <KeyValue label="Method" value={doc.deliveryMethod} />}
                      {!!doc.expectedDeliveryDate && <KeyValue label="Expected" value={doc.expectedDeliveryDate} />}
                      {!!doc.deliveryAddress && <KeyValue label="Address" value={<div style={{ maxWidth: 170, whiteSpace: 'pre-line' }}>{doc.deliveryAddress}</div>} />}
                      {!doc.deliveryMethod && !doc.expectedDeliveryDate && !doc.deliveryAddress && <Muted>—</Muted>}
                    </div>
                  </Box>
                }
              />
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: '#F3F4F6', padding: '10px 12px' }}>
                <div style={{ display: 'flex', fontSize: 12, fontWeight: 800, color: '#111827' }}>
                  <div style={{ flex: 1 }}>Item</div>
                  <div style={{ width: 70, textAlign: 'right' }}>Qty</div>
                  <div style={{ width: 90, textAlign: 'right' }}>Rate</div>
                  <div style={{ width: 90, textAlign: 'right' }}>Amount</div>
                </div>
              </div>

              {doc.items?.map((it, idx) => {
                const rowBg = idx % 2 ? '#FFFFFF' : '#FAFAFA';
                return (
                  <div key={idx} style={{ padding: '10px 12px', background: rowBg, borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{it.name}</div>
                        {!!it.hsnSac && <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>HSN/SAC: {it.hsnSac}</div>}
                        {!!it.sku && <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>SKU: {it.sku}</div>}
                        {!!it.servicePeriod && (
                          <div style={{ marginTop: 2, fontSize: 10, color: '#6B7280' }}>Service: {it.servicePeriod}</div>
                        )}
                        {!!it.description && (
                          <div style={{ marginTop: 4, fontSize: 10, color: '#374151', whiteSpace: 'pre-line' }}>{it.description}</div>
                        )}
                      </div>
                      <div style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#111827' }}>{Number(it.quantity || 0)}</div>
                      <div style={{ width: 90, textAlign: 'right', fontSize: 12, color: '#111827' }}>
                        <Money value={Number(it.rate || 0)} />
                      </div>
                      <div style={{ width: 90, textAlign: 'right', fontSize: 12, fontWeight: 800, color: '#111827' }}>
                        <Money value={Number(it.total || 0)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, marginTop: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Box>
                <Label>Terms</Label>
                <div style={{ marginTop: 8 }}>
                  {doc.termsConditions ? (
                    <SmallText>
                      <div style={{ whiteSpace: 'pre-line' }}>{doc.termsConditions}</div>
                    </SmallText>
                  ) : (
                    <Muted>—</Muted>
                  )}
                </div>
              </Box>

              {isQuotation && !!doc.paymentTerms && (
                <div style={{ marginTop: 12 }}>
                  <Box>
                    <Label>Payment Terms</Label>
                    <div style={{ marginTop: 8 }}>
                      <SmallText>
                        <div style={{ whiteSpace: 'pre-line' }}>{doc.paymentTerms}</div>
                      </SmallText>
                      {!!doc.creditPeriod && <Muted style={{ marginTop: 6 } as any}>Credit: {doc.creditPeriod}</Muted>}
                      {!!doc.lateFeeTerms && <Muted style={{ marginTop: 2 } as any}>Late Fee: {doc.lateFeeTerms}</Muted>}
                    </div>
                  </Box>
                </div>
              )}

              {isQuotation && !!doc.internalNotes && (
                <div style={{ marginTop: 12 }}>
                  <Box>
                    <Label>Internal Notes</Label>
                    <div style={{ marginTop: 8 }}>
                      <SmallText>
                        <div style={{ whiteSpace: 'pre-line' }}>{doc.internalNotes}</div>
                      </SmallText>
                    </div>
                  </Box>
                </div>
              )}

              {isQuotation && !!doc.warrantyReturnCancellationPolicies && (
                <div style={{ marginTop: 12 }}>
                  <Box>
                    <Label>Policies</Label>
                    <div style={{ marginTop: 8 }}>
                      <SmallText>
                        <div style={{ whiteSpace: 'pre-line' }}>{doc.warrantyReturnCancellationPolicies}</div>
                      </SmallText>
                    </div>
                  </Box>
                </div>
              )}

              {(profile.upiId || doc.upiId) && (
                <div style={{ marginTop: 12 }}>
                  <Box>
                    <Label>Payment</Label>
                    <div style={{ marginTop: 8 }}>
                      {!!doc.upiQrText && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                          <img
                            src={String(doc.upiQrText)}
                            alt="UPI QR"
                            style={{ width: 110, height: 110, borderRadius: 10, border: '1px solid #E5E7EB' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <SmallText>
                              Scan to pay
                            </SmallText>
                            <Muted style={{ marginTop: 4 } as any}>UPI ID below</Muted>
                          </div>
                        </div>
                      )}
                      <SmallText>
                        UPI: <span style={{ fontWeight: 800 }}>{safeText(doc.upiId || profile.upiId)}</span>
                      </SmallText>
                      {!!doc.paymentMode && <Muted style={{ marginTop: 4 } as any}>Mode: {doc.paymentMode}</Muted>}
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
                  {isQuoteLike && !!Number(doc.packingHandlingCharges || 0) && (
                    <KeyValue label="Packing" value={<Money value={Number(doc.packingHandlingCharges || 0)} />} />
                  )}
                  {isQuoteLike && !!Number(doc.tcs || 0) && <KeyValue label="TCS" value={<Money value={Number(doc.tcs || 0)} />} />}
                  <KeyValue label="Round Off" value={<Money value={Number(doc.roundOff || 0)} />} />
                  <Hr />
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#111827' }}>Total</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>
                      <Money value={Number(doc.grandTotal || 0)} />
                    </div>
                  </div>
                </div>
              </Box>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <Hr />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <Muted>Thank you for your business!</Muted>
              <Muted>Generated by BillVyapar</Muted>
            </div>
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}
