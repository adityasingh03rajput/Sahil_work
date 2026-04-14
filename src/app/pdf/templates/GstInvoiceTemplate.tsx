import React from 'react';
import type { PdfTemplateProps } from '../types';
import { amountInWordsINR, displaySubtotal, safeText, TemplateFrame, useScale, s } from './TemplateFrame';

const BLUE = '#1a6fa8';
const BLUE_LIGHT = '#e8f4fb';
const BORDER = '#a8d4ed';

function fmt(n: number) {
  return Number(n || 0).toFixed(2);
}

export function GstInvoiceTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const cgst = Number(doc.totalCgst || 0);
  const sgst = Number(doc.totalSgst || 0);
  const igst = Number(doc.totalIgst || 0);
  const grandTotal = Number(doc.grandTotal || 0);
  const items = Array.isArray(doc.items) ? doc.items : [];
  const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

  const businessAddr = [profile.billingAddress].filter(Boolean).join(', ');
  const customerAddr = [doc.customerAddress, doc.placeOfSupply].filter(Boolean).join(', ');

  const docTitle = String(doc.type || '').toLowerCase() === 'purchase' ? 'PURCHASE INVOICE'
    : String(doc.type || '').toLowerCase() === 'quotation' ? 'QUOTATION'
    : String(doc.type || '').toLowerCase() === 'proforma' ? 'PROFORMA INVOICE'
    : 'TAX INVOICE';

  return (
    <TemplateFrame itemCount={items.length}>
      <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', width: '100%', minHeight: '100%', color: '#111', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: s(4, sc) }}>
          <div>
            <div style={{ fontSize: s(14, sc), fontWeight: 900, color: '#111', marginBottom: 1 }}>{safeText(profile.businessName)}</div>
            {businessAddr && <div style={{ fontSize: s(8, sc), color: '#444', lineHeight: 1.3 }}>{businessAddr}</div>}
            {profile.gstin && <div style={{ fontSize: s(8, sc), color: '#444' }}>GSTIN: {profile.gstin}</div>}
          </div>
          <div style={{ textAlign: 'right', fontSize: s(8, sc), color: '#444', lineHeight: 1.4 }}>
            {profile.phone && <div><strong>Phone</strong> : {safeText(profile.phone)}</div>}
            {profile.email && <div><strong>Email</strong> : {safeText(profile.email)}</div>}
          </div>
        </div>

        {/* Title bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', border: `1px solid ${BORDER}`, background: BLUE_LIGHT, padding: `${s(3, sc)}px 0`, marginBottom: 0 }}>
          <div style={{ textAlign: 'center', flex: 1, fontSize: s(11, sc), fontWeight: 900, color: BLUE, letterSpacing: 0.5, borderRight: `1px solid ${BORDER}` }}>
            {docTitle}
          </div>
          <div style={{ textAlign: 'right', padding: `0 ${s(6, sc)}px`, fontSize: s(8, sc), fontWeight: 700, color: '#555' }}>
            ORIGINAL FOR RECIPIENT
          </div>
        </div>

        {/* Customer + Invoice meta */}
        <div style={{ display: 'flex', border: `1px solid ${BORDER}`, borderTop: 'none', marginBottom: 0 }}>
          {/* Left: Customer Detail */}
          <div style={{ flex: 1, display: 'flex', borderRight: `1px solid ${BORDER}` }}>
            <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, borderRight: `1px solid ${BORDER}`, background: BLUE_LIGHT, fontWeight: 700, textAlign: 'center', fontSize: s(8, sc) }}>Customer Detail</div>
            <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px` }}>
              <div style={{ fontSize: s(8, sc), fontWeight: 700 }}>Name</div>
              <div style={{ fontSize: s(8, sc) }}>{safeText(doc.customerName)}</div>
            </div>
          </div>
          {/* Right: Invoice Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 700, fontSize: s(8, sc) }}>Invoice No.</div>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc) }}>{safeText(doc.documentNumber || doc.invoiceNo)}</div>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 700, fontSize: s(8, sc) }}>Date</div>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc) }}>{doc.date || ''}</div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 700, fontSize: s(8, sc) }}>Due Date</div>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc) }}>{doc.dueDate || ''}</div>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 700, fontSize: s(8, sc) }}>Order No.</div>
              <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc) }}>{safeText(doc.orderNumber) || '-'}</div>
            </div>
          </div>
        </div>

        {/* GSTIN + Address row */}
        <div style={{ display: 'flex', border: `1px solid ${BORDER}`, borderTop: 'none', marginBottom: 0 }}>
          <div style={{ width: s(80, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 700, fontSize: s(8, sc), borderRight: `1px solid ${BORDER}` }}>GSTIN</div>
          <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), borderRight: `1px solid ${BORDER}` }}>{safeText(doc.customerGstin) || '-'}</div>
          <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc) }}>
            <div><strong>Address:</strong> {customerAddr || '-'}</div>
            {doc.customerMobile && <div><strong>Phone:</strong> {doc.customerMobile}</div>}
          </div>
        </div>

        {/* Items table — Flexbox Auto-Layout */}
        <div style={{ border: `1px solid ${BORDER}`, borderTop: 'none', marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', background: BLUE_LIGHT, borderBottom: `2px solid ${BORDER}` }}>
            <div style={{ width: s(24, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>Sr.</div>
            <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, borderRight: `1px solid ${BORDER}` }}>Product / Service</div>
            <div style={{ width: s(48, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>HSN</div>
            <div style={{ width: s(40, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>Qty</div>
            <div style={{ width: s(56, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>Rate</div>
            {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>CGST</div>}
            {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>SGST</div>}
            {igst > 0 && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>IGST</div>}
            <div style={{ width: s(64, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(8, sc), fontWeight: 700, textAlign: 'right' }}>Total</div>
          </div>
          {/* Items */}
          {items.map((it, i) => {
            const gross = Number(it.quantity || 0) * Number(it.rate || 0);
            const discAmt = (gross * Number(it.discount || 0)) / 100;
            const taxable = gross - discAmt;
            const cgstAmt = (taxable * Number(it.cgst || 0)) / 100;
            const sgstAmt = (taxable * Number(it.sgst || 0)) / 100;
            const igstAmt = (taxable * Number(it.igst || 0)) / 100;
            return (
              <div key={i} style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>
                <div style={{ width: s(24, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>{i + 1}</div>
                <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 600, borderRight: `1px solid ${BORDER}` }}>
                  {safeText(it.name)}
                  {it.description && <div style={{ fontSize: s(7, sc), color: '#666', fontWeight: 400, marginTop: 1 }}>{it.description}</div>}
                </div>
                <div style={{ width: s(48, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>{safeText(it.hsnSac)}</div>
                <div style={{ width: s(40, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>{Number(it.quantity || 0).toFixed(2)}</div>
                <div style={{ width: s(56, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>{Number(it.rate || 0).toFixed(2)}</div>
                {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>{cgstAmt > 0 ? cgstAmt.toFixed(2) : '-'}</div>}
                {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>{sgstAmt > 0 ? sgstAmt.toFixed(2) : '-'}</div>}
                {igst > 0 && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}` }}>{igstAmt > 0 ? igstAmt.toFixed(2) : '-'}</div>}
                <div style={{ width: s(64, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right' }}>{Number(it.total || 0).toFixed(2)}</div>
              </div>
            );
          })}
          {/* Blank rows for spacing */}
          {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, i) => (
            <div key={`blank-${i}`} style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, height: s(14, sc) }}>
              <div style={{ width: s(24, sc), borderRight: `1px solid ${BORDER}` }} />
              <div style={{ flex: 1, borderRight: `1px solid ${BORDER}` }} />
              <div style={{ width: s(48, sc), borderRight: `1px solid ${BORDER}` }} />
              <div style={{ width: s(40, sc), borderRight: `1px solid ${BORDER}` }} />
              <div style={{ width: s(56, sc), borderRight: `1px solid ${BORDER}` }} />
              {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), borderRight: `1px solid ${BORDER}` }} />}
              {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), borderRight: `1px solid ${BORDER}` }} />}
              {igst > 0 && <div style={{ width: s(44, sc), borderRight: `1px solid ${BORDER}` }} />}
              <div style={{ width: s(64, sc) }} />
            </div>
          ))}
          {/* Total row */}
          <div style={{ display: 'flex', background: BLUE_LIGHT, fontWeight: 700 }}>
            <div style={{ width: s(24, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'center', borderRight: `1px solid ${BORDER}` }} />
            <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>Total</div>
            <div style={{ width: s(48, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'center', borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }} />
            <div style={{ width: s(40, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>{totalQty.toFixed(2)}</div>
            <div style={{ width: s(56, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }} />
            {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>{cgst.toFixed(2)}</div>}
            {(cgst > 0 || sgst > 0) && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>{sgst.toFixed(2)}</div>}
            {igst > 0 && <div style={{ width: s(44, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>{igst.toFixed(2)}</div>}
            <div style={{ width: s(64, sc), padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', fontSize: s(8, sc) }}>{grandTotal.toFixed(2)}</div>
          </div>
        </div>

        {/* Total in words */}
        <div style={{ display: 'flex', border: `1px solid ${BORDER}`, borderTop: 'none' }}>
          <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 700, width: '25%', background: BLUE_LIGHT, borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>Total in words</div>
          <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, fontSize: s(7, sc), fontStyle: 'italic', borderRight: `1px solid ${BORDER}` }}>{amountInWordsINR(grandTotal).toUpperCase()}</div>
          <div style={{ width: '15%', padding: `${s(3, sc)}px ${s(4, sc)}px`, fontWeight: 700, background: BLUE_LIGHT, borderRight: `1px solid ${BORDER}`, fontSize: s(8, sc) }}>Grand Total</div>
          <div style={{ width: '15%', padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'right', fontWeight: 900, fontSize: s(11, sc) }}>₹{grandTotal.toFixed(2)}</div>
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', border: `1px solid ${BORDER}`, borderTop: 'none' }}>
          <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, borderRight: `1px solid ${BORDER}`, width: '50%', fontSize: s(7, sc) }}>
            <strong>Terms:</strong> {doc.termsConditions || 'Goods once sold will not be taken back.'}
          </div>
          <div style={{ flex: 1, padding: `${s(3, sc)}px ${s(4, sc)}px`, textAlign: 'center', minHeight: s(50, sc), display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: s(8, sc) }}>For {safeText(profile.businessName)}</div>
            <div style={{ marginTop: s(20, sc), fontSize: s(7, sc), color: '#666' }}>Authorised Signatory</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: s(7, sc), color: '#999', marginTop: s(2, sc) }}>Generated by BillVyapar</div>
      </div>
    </TemplateFrame>
  );
}
