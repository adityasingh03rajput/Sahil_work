import React from 'react';
import type { PdfTemplateId, PdfTemplateProps } from '../types';
import { ClassicTemplate } from './ClassicTemplate';
import { ModernTemplate } from './ModernTemplate';
import { MinimalTemplate } from './MinimalTemplate';
import { ProfessionalTemplate } from './ProfessionalTemplate';
import { CorporateTemplate } from './CorporateTemplate';
import { LedgerTemplate } from './LedgerTemplate';
import { ElegantTemplate } from './ElegantTemplate';
import { BoldTypeTemplate } from './BoldTypeTemplate';
import { GstInvoiceTemplate } from './GstInvoiceTemplate';

export const PDF_TEMPLATES: Array<{ id: PdfTemplateId; label: string }> = [
  { id: 'gst-invoice', label: 'GST Invoice' },
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'boldtype', label: 'Bold Type' },
];

export function renderTemplate(templateId: PdfTemplateId, props: PdfTemplateProps) {
  if (templateId === 'gst-invoice') return React.createElement(GstInvoiceTemplate, props);
  if (templateId === 'gstinvoice') return React.createElement(GstInvoiceTemplate, props);
  if (templateId === 'modern') return React.createElement(ModernTemplate, props);
  if (templateId === 'professional') return React.createElement(ProfessionalTemplate, props);
  if (templateId === 'minimal') return React.createElement(MinimalTemplate, props);
  if (templateId === 'corporate') return React.createElement(CorporateTemplate, props);
  if (templateId === 'ledger') return React.createElement(LedgerTemplate, props);
  if (templateId === 'elegant') return React.createElement(ElegantTemplate, props);
  if (templateId === 'boldtype') return React.createElement(BoldTypeTemplate, props);
  return React.createElement(ClassicTemplate, props);
}
