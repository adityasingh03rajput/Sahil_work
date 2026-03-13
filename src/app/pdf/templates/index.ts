import React from 'react';
import type { PdfTemplateId, PdfTemplateProps } from '../types';
import { ClassicTemplate } from './ClassicTemplate';
import { ModernTemplate } from './ModernTemplate';
import { MinimalTemplate } from './MinimalTemplate';
import { ProfessionalTemplate } from './ProfessionalTemplate';

export const PDF_TEMPLATES: Array<{ id: PdfTemplateId; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'minimal', label: 'Minimal' },
];

export function renderTemplate(templateId: PdfTemplateId, props: PdfTemplateProps) {
  if (templateId === 'modern') return React.createElement(ModernTemplate, props);
  if (templateId === 'professional') return React.createElement(ProfessionalTemplate, props);
  if (templateId === 'minimal') return React.createElement(MinimalTemplate, props);
  return React.createElement(ClassicTemplate, props);
}
