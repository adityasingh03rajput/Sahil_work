export type ContactFieldErrors = {
  gstin?: string;
  phone?: string;
  email?: string;
};

export function normalizeGstin(value: string) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidGstin(value: string) {
  const v = normalizeGstin(value);
  if (!v) return true;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v);
}

export function validateGstin(value: string): string | undefined {
  const v = normalizeGstin(value);
  if (!v) return undefined;
  if (!isValidGstin(v)) return 'Invalid GSTIN format';
  return undefined;
}

export function normalizeEmail(value: string) {
  return String(value || '').trim();
}

export function isValidEmail(value: string) {
  const v = normalizeEmail(value);
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function validateEmail(value: string): string | undefined {
  const v = normalizeEmail(value);
  if (!v) return undefined;
  if (!isValidEmail(v)) return 'Invalid email address';
  return undefined;
}

export function normalizePhone(value: string) {
  const raw = String(value || '').trim();
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D+/g, '');
  return hasPlus ? `+${digits}` : digits;
}

export function isValidPhone(value: string) {
  const v = normalizePhone(value);
  if (!v) return true;

  const digits = v.startsWith('+') ? v.slice(1) : v;

  if (/^\d{10}$/.test(digits)) return true;
  if (/^91\d{10}$/.test(digits)) return true;

  return false;
}

export function validatePhone(value: string): string | undefined {
  const v = normalizePhone(value);
  if (!v) return undefined;
  if (!isValidPhone(v)) return 'Invalid phone number';
  return undefined;
}

export function validateContactFields(fields: { gstin?: string; phone?: string; email?: string }): ContactFieldErrors {
  return {
    gstin: validateGstin(fields.gstin || ''),
    phone: validatePhone(fields.phone || ''),
    email: validateEmail(fields.email || ''),
  };
}

export function hasContactErrors(errors: ContactFieldErrors) {
  return Boolean(errors.gstin || errors.phone || errors.email);
}
