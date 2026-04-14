import React from 'react';
import type { PdfTemplateProps } from '../types';
import {
  Hr,
  KeyValue,
  KeyValueOptional,
  Label,
  Money,
  SmallText,
  Muted,
  safeText,
  TemplateFrame,
  amountInWordsINR,
  displaySubtotal,
  formatInlineAddress,
  formatStateDisplay,
  useScale,
  s,
} from './TemplateFrame';

export function MinimalTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const cgst = Number(doc.totalCgst || 0);
  const sgst = Number(doc.totalSgst || 0);
  const igst = Number(doc.totalIgst || 0);

  const customFields = Array.isArray(doc.customFields)
    ? doc.customFields
        .map((x) => ({ label: String(x?.label || '').trim(), value: String(x?.value || '').trim() }))
        .filter((x) => x.label && x.value)
    : [];

  return (
    <TemplateFrame itemCount={doc.items?.length ?? 0}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{profile.businessName}</div>
          {!!profile.billingAddress && (
            <div style={{ fontSize: 11, color: '#374151', marginTop: 6 }}>
              {formatInlineAddress(profile.billingAddress)}
            </div>
          )}
          {!!(profile as any).phone && (
            <div style={{ fontSize: 11, color: '#374151' }}>Phone no.: {(profile as any).phone}</div>
          )}
          {!!(profile as any).email && (
            <div style={{ fontSize: 11, color: '#374151' }}>Email: {(profile as any).email}</div>
          )}
          {!!profile.gstin && (
            <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>GSTIN: {profile.gstin}</div>
          )}
          {!!profile.gstin && (
            <div style={{ fontSize: 11, color: '#374151' }}>
              State: {formatStateDisplay(profile.gstin.slice(0, 2), null)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>Tax Invoice</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Hr />
      </div>

      {/* BILL TO + INVOICE DETAILS */}
      <div style={{ display: 'flex', gap: 30, marginTop: 16, alignItems: 'flex-start' }}>
        {/* BILL TO */}
        <div style={{ flex: 1 }}>
          <Label>Bill To</Label>
          <div style={{ fontWeight: 900, marginTop: 8, fontSize: 14, color: '#111827' }}>
            {safeText(doc.customerName)}
          </div>
          {!!doc.customerAddress && (
            <SmallText style={{ marginTop: 4 } as any}>
              {formatInlineAddress(doc.customerAddress)}
            </SmallText>
          )}
          {!!doc.customerGstin && <SmallText>GSTIN: {doc.customerGstin}</SmallText>}
          {!!doc.customerMobile && <SmallText>Phone: {doc.customerMobile}</SmallText>}
          {!!doc.customerEmail && <SmallText>Email: {doc.customerEmail}</SmallText>}
          {!!doc.customerContactPerson && <SmallText>Contact: {doc.customerContactPerson}</SmallText>}
          {(!!doc.customerStateCode || !!doc.placeOfSupply) && (
            <SmallText>
              State: {formatStateDisplay(doc.customerStateCode || null, doc.placeOfSupply || null)}
            </SmallText>
          )}
          {!!doc.deliveryAddress && (
            <div style={{ marginTop: 10 }}>
              <Label>Ship To</Label>
              <SmallText style={{ marginTop: 6 } as any}>{formatInlineAddress(doc.deliveryAddress)}</SmallText>
            </div>
          )}
        </div>

        {/* INVOICE DETAILS */}
        <div style={{ width: 260 }}>
          <Label>Invoice Details</Label>
          <div style={{ marginTop: 8 }}>
            <KeyValue label="Invoice No." value={safeText(doc.invoiceNo) || safeText(doc.documentNumber)} />
            <KeyValueOptional label="Date" value={doc.date} />
            <KeyValueOptional label="Due Date" value={doc.dueDate} />
            <KeyValueOptional label="Ref No." value={doc.referenceNo} />
            <KeyValueOptional label="Challan No" value={doc.challanNo} />
            <KeyValueOptional label="Order No" value={doc.orderNumber} />
            <KeyValueOptional label="Revision No" value={doc.revisionNumber} />
            <KeyValueOptional label="PO No" value={doc.purchaseOrderNo} />
            <KeyValueOptional label="PO Date" value={doc.poDate} />
            <KeyValueOptional label="Place of Supply" value={doc.placeOfSupply} />
            <KeyValueOptional label="E-way Bill No" value={doc.ewayBillNo} />
            <KeyValueOptional label="Vehicle No" value={doc.ewayBillVehicleNo} />
            <KeyValueOptional label="Transport" value={doc.transport} />
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'flex',
            fontWeight: 900,
            fontSize: 12,
            color: '#111827',
            borderBottom: '1px solid #ddd',
            paddingBottom: 6,
          }}
        >
          <div style={{ width: 30 }}>#</div>
          <div style={{ flex: 1 }}>Item Name</div>
          <div style={{ width: 80 }}>HSN/SAC</div>
          <div style={{ width: 80, textAlign: 'right' }}>Qty</div>
          <div style={{ width: 110, textAlign: 'right' }}>Price / Unit</div>
          <div style={{ width: 120, textAlign: 'right' }}>GST Amount</div>
          <div style={{ width: 120, textAlign: 'right' }}>Total</div>
        </div>

        {doc.items?.map((it, i) => {
          const itemTax =
            Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0);
          const qty = Number(it.quantity || 0);
          const rate = Number(it.rate || 0);
          const discountPct = Number(it.discount || 0);
          const gross = qty * rate;
          const taxable = gross - (gross * discountPct) / 100;
          const taxAmount = (taxable * itemTax) / 100;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '10px 0',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 12,
                color: '#111827',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ width: 30 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>{it.name}</div>
                {!!it.description && (
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, whiteSpace: 'pre-line' }}>
                    {it.description}
                  </div>
                )}
                {!!it.sku && <div style={{ fontSize: 10, color: '#6B7280' }}>SKU: {it.sku}</div>}
              </div>
              <div style={{ width: 80 }}>{safeText(it.hsnSac) || '—'}</div>
              <div style={{ width: 80, textAlign: 'right' }}>{qty}</div>
              <div style={{ width: 110, textAlign: 'right' }}>
                <Money value={rate} />
              </div>
              <div style={{ width: 120, textAlign: 'right' }}>
                <Money value={taxAmount} />
              </div>
              <div style={{ width: 120, textAlign: 'right', fontWeight: 900 }}>
                <Money value={Number(it.total || 0)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* TAX BREAKDOWN */}
      {(sgst > 0 || cgst > 0 || igst > 0) && (
        <div style={{ marginTop: 20 }}>
          <Label>Tax Details</Label>
          <div style={{ marginTop: 10 }}>
            {cgst > 0 && <KeyValue label="CGST" value={<Money value={cgst} />} />}
            {sgst > 0 && <KeyValue label="SGST" value={<Money value={sgst} />} />}
            {igst > 0 && <KeyValue label="IGST" value={<Money value={igst} />} />}
          </div>
        </div>
      )}

      {/* TOTALS */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 260 }}>
          <KeyValue label="Sub Total" value={<Money value={displaySubtotal(doc)} />} />
          <KeyValue label="Taxes" value={<Money value={cgst + sgst + igst} />} />
          <div style={{ marginTop: 8 }}>
            <Hr />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>Total</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>
              <Money value={Number(doc.grandTotal || 0)} />
            </div>
          </div>
        </div>
      </div>

      {/* AMOUNT IN WORDS */}
      <div style={{ marginTop: 20 }}>
        <Label>Invoice Amount In Words</Label>
        <SmallText style={{ marginTop: 6 } as any}>
          {amountInWordsINR(Number(doc.grandTotal || 0))}
        </SmallText>
      </div>

      {/* TERMS */}
      {!!doc.termsConditions && (
        <div style={{ marginTop: 18 }}>
          <Hr />
          <div style={{ marginTop: 12 }}>
            <Label>Terms and Conditions</Label>
            <SmallText style={{ marginTop: 6, whiteSpace: 'pre-line' } as any}>
              {doc.termsConditions}
            </SmallText>
          </div>
        </div>
      )}

      {/* BANK DETAILS */}
      {(profile.bankName || (profile as any).accountNumber || doc.bankName || doc.bankAccountNumber) && (
        <div style={{ marginTop: 20 }}>
          <Hr />
          <div style={{ marginTop: 12 }}>
            <Label>Bank Details</Label>
            <div style={{ marginTop: 8 }}>
              <KeyValueOptional label="Name" value={doc.bankName || profile.bankName} />
              <KeyValueOptional
                label="Account Holder"
                value={
                  (doc as any).bankAccountHolderName ||
                  (profile as any).accountHolderName ||
                  profile.businessName
                }
              />
              <KeyValueOptional label="Account No." value={doc.bankAccountNumber || (profile as any).accountNumber} />
              <KeyValueOptional label="IFSC Code" value={doc.bankIfsc || (profile as any).ifscCode} />
            </div>
          </div>
        </div>
      )}

      {/* UPI */}
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

      {/* CUSTOM FIELDS */}
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

      {/* SIGNATURE */}
      <div style={{ marginTop: 40, textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#111827' }}>For: {profile.businessName}</div>
        <div style={{ marginTop: 40, fontSize: 11, color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: 4, display: 'inline-block' }}>
          Authorized Signatory
        </div>
      </div>

      {/* FOOTER */}
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
