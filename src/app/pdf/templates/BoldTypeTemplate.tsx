import React from 'react';
import type { PdfTemplateProps } from '../types';
import {
  Money,
  TemplateFrame,
  amountInWordsINR,
  displaySubtotal,
  docTitleFromType,
  safeText,
  useScale,
  s,
} from './TemplateFrame';

/**
 * BoldType Template — Clean, professional invoice with compact layout
 * Optimized to fit on a single page
 */
export function BoldTypeTemplate({ doc, profile }: PdfTemplateProps) {
  const sc = useScale();
  const cgst = Number(doc.totalCgst || 0);
  const sgst = Number(doc.totalSgst || 0);
  const igst = Number(doc.totalIgst || 0);
  const grandTotal = Number(doc.grandTotal || 0);
  const items = Array.isArray(doc.items) ? doc.items : [];

  return (
    <TemplateFrame itemCount={items.length}>
      <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', padding: `${s(12, sc)}mm`, boxSizing: 'border-box' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: s(8, sc), paddingBottom: s(8, sc), borderBottom: '3px solid #333' }}>
          <div>
            <div style={{ fontSize: s(24, sc), fontWeight: 900, color: '#333', letterSpacing: -0.5, textTransform: 'uppercase' }}>
              {docTitleFromType(doc.type)}
            </div>
            <div style={{ fontSize: s(9, sc), color: '#666', marginTop: 2 }}>
              #{safeText(doc.invoiceNo) || safeText(doc.documentNumber)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: s(11, sc), fontWeight: 900, color: '#333' }}>{profile.businessName}</div>
            {profile.gstin && <div style={{ fontSize: s(8, sc), color: '#666', marginTop: 1 }}>GSTIN: {profile.gstin}</div>}
          </div>
        </div>

        {/* Info Section */}
        <div style={{ display: 'flex', gap: s(16, sc), marginBottom: s(8, sc), fontSize: s(8, sc) }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, marginBottom: 3, color: '#333' }}>BILL TO:</div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{safeText(doc.customerName)}</div>
            {doc.customerAddress && <div style={{ color: '#666', marginBottom: 1 }}>{doc.customerAddress}</div>}
            {doc.customerMobile && <div style={{ color: '#666' }}>Phone: {doc.customerMobile}</div>}
            {doc.customerGstin && <div style={{ color: '#666' }}>GSTIN: {doc.customerGstin}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, marginBottom: 3, color: '#333' }}>FROM:</div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{profile.businessName}</div>
            {profile.email && <div style={{ color: '#666', marginBottom: 1 }}>Email: {profile.email}</div>}
            {profile.phone && <div style={{ color: '#666' }}>Phone: {profile.phone}</div>}
          </div>
          <div style={{ width: 120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontWeight: 700 }}>Date:</span>
              <span>{doc.date || '-'}</span>
            </div>
            {doc.dueDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontWeight: 700 }}>Due:</span>
                <span>{doc.dueDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table — Flexbox Auto-Layout */}
        <div style={{ marginBottom: s(8, sc), fontSize: s(8, sc) }}>
          {/* Header Row */}
          <div style={{ display: 'flex', background: '#f5f5f5', borderTop: '2px solid #333', borderBottom: '1px solid #ddd', padding: `${s(4, sc)}px ${s(6, sc)}px` }}>
            <div style={{ flex: 1, fontWeight: 900, textAlign: 'left' }}>ITEM</div>
            <div style={{ width: s(60, sc), fontWeight: 900, textAlign: 'center' }}>HSN</div>
            <div style={{ width: s(50, sc), fontWeight: 900, textAlign: 'right' }}>QTY</div>
            <div style={{ width: s(70, sc), fontWeight: 900, textAlign: 'right' }}>RATE</div>
            {(cgst > 0 || sgst > 0 || igst > 0) && (
              <div style={{ width: s(50, sc), fontWeight: 900, textAlign: 'right' }}>TAX</div>
            )}
            <div style={{ width: s(80, sc), fontWeight: 900, textAlign: 'right' }}>AMOUNT</div>
          </div>
          {/* Item Rows */}
          {items.map((item, idx) => {
            const qty = Number(item.quantity || 0);
            const rate = Number(item.rate || 0);
            const taxPct = Number(item.cgst || 0) + Number(item.sgst || 0) + Number(item.igst || 0);
            const total = Number(item.total || 0);
            
            return (
              <div key={idx} style={{ display: 'flex', borderBottom: '1px solid #eee', padding: `${s(4, sc)}px ${s(6, sc)}px`, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{safeText(item.name)}</div>
                  {item.description && <div style={{ fontSize: s(7, sc), color: '#666', marginTop: 1 }}>{item.description}</div>}
                </div>
                <div style={{ width: s(60, sc), textAlign: 'center', color: '#666' }}>{safeText(item.hsnSac) || '-'}</div>
                <div style={{ width: s(50, sc), textAlign: 'right' }}>{qty}</div>
                <div style={{ width: s(70, sc), textAlign: 'right' }}><Money value={rate} /></div>
                {(cgst > 0 || sgst > 0 || igst > 0) && (
                  <div style={{ width: s(50, sc), textAlign: 'right', color: '#666' }}>{taxPct > 0 ? `${taxPct}%` : '-'}</div>
                )}
                <div style={{ width: s(80, sc), textAlign: 'right', fontWeight: 700 }}><Money value={total} /></div>
              </div>
            );
          })}
        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            {/* Bank Details */}
            {(profile.bankName || (profile as any).accountNumber) && (
              <div style={{ fontSize: 7, padding: 8, background: '#f9f9f9', borderRadius: 4 }}>
                <div style={{ fontWeight: 900, marginBottom: 3, color: '#333' }}>BANK DETAILS</div>
                {profile.bankName && <div style={{ marginBottom: 1 }}>Bank: {profile.bankName}</div>}
                {(profile as any).accountNumber && <div style={{ marginBottom: 1 }}>A/c: {(profile as any).accountNumber}</div>}
                {(profile as any).ifscCode && <div>IFSC: {(profile as any).ifscCode}</div>}
              </div>
            )}
          </div>
          
          <div style={{ width: 200 }}>
            <table style={{ width: '100%', fontSize: 8 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 0', fontWeight: 700 }}>Subtotal:</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}><Money value={displaySubtotal(doc)} /></td>
                </tr>
                {cgst > 0 && (
                  <tr>
                    <td style={{ padding: '3px 0', color: '#666' }}>CGST:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', color: '#666' }}><Money value={cgst} /></td>
                  </tr>
                )}
                {sgst > 0 && (
                  <tr>
                    <td style={{ padding: '3px 0', color: '#666' }}>SGST:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', color: '#666' }}><Money value={sgst} /></td>
                  </tr>
                )}
                {igst > 0 && (
                  <tr>
                    <td style={{ padding: '3px 0', color: '#666' }}>IGST:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', color: '#666' }}><Money value={igst} /></td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #333' }}>
                  <td style={{ padding: '6px 0 3px', fontSize: 11, fontWeight: 900 }}>TOTAL:</td>
                  <td style={{ padding: '6px 0 3px', textAlign: 'right', fontSize: 11, fontWeight: 900 }}><Money value={grandTotal} /></td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 7, color: '#666', fontStyle: 'italic', marginTop: 3, lineHeight: 1.2 }}>
              {amountInWordsINR(grandTotal)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, borderTop: '1px solid #ddd', fontSize: 7 }}>
          <div>
            {doc.termsConditions && (
              <div>
                <div style={{ fontWeight: 900, marginBottom: 2, color: '#333' }}>TERMS & CONDITIONS</div>
                <div style={{ color: '#666', lineHeight: 1.3, maxWidth: 300 }}>{doc.termsConditions}</div>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 900, marginBottom: 2, color: '#333' }}>AUTHORIZED SIGNATURE</div>
            <div style={{ height: 20 }} />
            <div style={{ borderTop: '1px solid #333', paddingTop: 2, minWidth: 100 }}>{profile.businessName}</div>
          </div>
        </div>

      </div>
    </TemplateFrame>
  );
}
