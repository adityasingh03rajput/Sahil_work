import React from 'react';
import type { PdfTemplateProps } from '../types';
import { Hr, KeyValue, KeyValueOptional, Label, Money, Muted, safeText, SmallText, TemplateFrame, docTitleFromType } from './TemplateFrame';

export function MinimalTemplate({ doc, profile }: PdfTemplateProps) {
  const taxes = Number(doc.totalCgst || 0) + Number(doc.totalSgst || 0) + Number(doc.totalIgst || 0);
  const typeLower = String(doc.type || '').toLowerCase();
  const isQuotation = typeLower === 'quotation';
  const isOrder = typeLower === 'order';
  const isQuoteLike = isQuotation || isOrder;
  const customFields = Array.isArray(doc.customFields)
    ? doc.customFields
        .map((x) => ({ label: String(x?.label || '').trim(), value: String(x?.value || '').trim() }))
        .filter((x) => x.label && x.value)
    : [];

  return (
    <TemplateFrame>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>{profile.businessName}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{profile.ownerName}</div>
          {!!profile.billingAddress && (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8, whiteSpace: 'pre-line' }}>{profile.billingAddress}</div>
          )}
          {!!profile.gstin && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>GSTIN: {profile.gstin}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, color: '#111827' }}>{docTitleFromType(doc.type)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>{doc.documentNumber}</div>
          {!!doc.date && <div style={{ fontSize: 11, color: '#6B7280' }}>{doc.date}</div>}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Hr />
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Customer</Label>
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: '#111827' }}>{safeText(doc.customerName)}</div>
          {!!doc.customerAddress && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280', whiteSpace: 'pre-line' }}>{doc.customerAddress}</div>
          )}
          {!!doc.customerGstin && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>GSTIN: {doc.customerGstin}</div>}
        </div>
        <div style={{ width: 280, minWidth: 280 }}>
          <Label>Details</Label>
          <div style={{ marginTop: 8 }}>
            <KeyValueOptional label="Due" value={doc.dueDate} />
            {isOrder && !!doc.referenceDocumentNumber && (
              <KeyValue label="Ref Quote" value={doc.referenceDocumentNumber} />
            )}
            <KeyValueOptional label="Order" value={isQuoteLike ? doc.orderNumber : null} />
            <KeyValueOptional label="Status" value={doc.paymentStatus} />
            <KeyValueOptional label="Invoice No" value={doc.invoiceNo} />
            <KeyValueOptional label="Challan No" value={doc.challanNo} />
            <KeyValueOptional label="E-way Bill No" value={doc.ewayBillNo} />
            <KeyValueOptional label="Vehicle No" value={doc.ewayBillVehicleNo} />
            <KeyValueOptional label="Transport" value={doc.transport} />
            <KeyValueOptional label="Transport ID" value={doc.transportId} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, borderTop: '1px solid #E5E7EB' }} />

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', fontSize: 12, fontWeight: 900, color: '#111827', padding: '8px 0' }}>
          <div style={{ flex: 1 }}>Item</div>
          <div style={{ width: 70, textAlign: 'right' }}>Qty</div>
          <div style={{ width: 90, textAlign: 'right' }}>Rate</div>
          <div style={{ width: 100, textAlign: 'right' }}>Total</div>
        </div>

        {doc.items?.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{it.name}</div>
              {!!it.hsnSac && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>HSN/SAC: {it.hsnSac}</div>}
              {!!it.sku && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>SKU: {it.sku}</div>}
              {!!it.servicePeriod && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Service: {it.servicePeriod}</div>}
              {!!it.description && (
                <div style={{ fontSize: 10, color: '#374151', marginTop: 4, whiteSpace: 'pre-line' }}>{it.description}</div>
              )}
            </div>
            <div style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#111827' }}>{Number(it.quantity || 0)}</div>
            <div style={{ width: 90, textAlign: 'right', fontSize: 12, color: '#111827' }}>
              <Money value={Number(it.rate || 0)} />
            </div>
            <div style={{ width: 100, textAlign: 'right', fontSize: 12, fontWeight: 900, color: '#111827' }}>
              <Money value={Number(it.total || 0)} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280, minWidth: 280 }}>
          <KeyValue label="Subtotal" value={<Money value={Number(doc.subtotal || 0)} />} />
          <KeyValue label="Taxes" value={<Money value={taxes} />} />
          {isQuoteLike && !!Number(doc.packingHandlingCharges || 0) && (
            <KeyValue label="Packing" value={<Money value={Number(doc.packingHandlingCharges || 0)} />} />
          )}
          {isQuoteLike && !!Number(doc.tcs || 0) && <KeyValue label="TCS" value={<Money value={Number(doc.tcs || 0)} />} />}
          <div style={{ marginTop: 8 }}>
            <Hr />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#111827' }}>Total</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>
              <Money value={Number(doc.grandTotal || 0)} />
            </div>
          </div>
        </div>
      </div>

      {!!doc.termsConditions && (
        <div style={{ marginTop: 16 }}>
          <Hr />
          <div style={{ marginTop: 12 }}>
            <Label>Terms</Label>
            <div style={{ marginTop: 8 }}>
              <SmallText>
                <div style={{ whiteSpace: 'pre-line' }}>{doc.termsConditions}</div>
              </SmallText>
            </div>
          </div>
        </div>
      )}

      {customFields.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Hr />
          <div style={{ marginTop: 12 }}>
            <Label>Custom Fields</Label>
            <div style={{ marginTop: 8 }}>
              {customFields.map((f, idx) => (
                <KeyValue key={idx} label={f.label} value={f.value} />
              ))}
            </div>
          </div>
        </div>
      )}

      {(profile.upiId || doc.upiId) && (
        <div style={{ marginTop: 16 }}>
          <Hr />
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            {!!doc.upiQrText && (
              <img
                src={String(doc.upiQrText)}
                alt="UPI QR"
                style={{ width: 110, height: 110, borderRadius: 10, border: '1px solid #E5E7EB' }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>Payment</Label>
              <div style={{ marginTop: 8 }}>
                <SmallText>
                  UPI: <span style={{ fontWeight: 900 }}>{safeText(doc.upiId || profile.upiId)}</span>
                </SmallText>
                <Muted style={{ marginTop: 6 } as any}>Scan QR to pay</Muted>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <Hr />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <Muted>Generated by BillVyapar</Muted>
          <Muted>Thank you for your business!</Muted>
        </div>
      </div>
    </TemplateFrame>
  );
}
