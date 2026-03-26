/**
 * FormattedInputs — reusable smart input components with inline formatting,
 * validation feedback, and country-code support.
 */
import React, { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  normalizeGstin, validateGstin,
  normalizePan, validatePan,
  normalizeIfsc, validateIfsc,
  normalizeAccountNumber, validateAccountNumber,
  normalizeUpiId, validateUpiId,
  normalizeEmail, validateEmail,
  normalizePhone, validatePhone,
  normalizePostalCode, validatePostalCode,
} from '../utils/contactValidation';

// ─── Country codes ────────────────────────────────────────────────────────────

export const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
];

// ─── Shared field wrapper ─────────────────────────────────────────────────────

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FieldWrapper({ label, error, hint, required, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Phone input with country code dropdown ───────────────────────────────────

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function PhoneInput({ value, onChange, label, required, placeholder, disabled, error: externalError }: PhoneInputProps) {
  // Split stored value into country code + local number
  const parseValue = (v: string) => {
    const raw = String(v || '').trim();
    for (const cc of COUNTRY_CODES) {
      if (raw.startsWith(cc.code)) {
        return { countryCode: cc.code, local: raw.slice(cc.code.length).replace(/\D/g, '') };
      }
    }
    // Default to +91 for plain 10-digit numbers
    return { countryCode: '+91', local: raw.replace(/\D/g, '') };
  };

  const { countryCode: initCode, local: initLocal } = parseValue(value);
  const [countryCode, setCountryCode] = useState(initCode);
  const [localNumber, setLocalNumber] = useState(initLocal);
  const [touched, setTouched] = useState(false);

  const combined = localNumber ? `${countryCode}${localNumber}` : '';
  const internalError = touched ? validatePhone(combined) : undefined;
  const displayError = externalError || internalError;

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    setLocalNumber(digits);
    onChange(digits ? `${countryCode}${digits}` : '');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value);
    onChange(localNumber ? `${e.target.value}${localNumber}` : '');
  };

  // Format display: groups of digits for readability
  const formatDisplay = (digits: string, code: string) => {
    if (code === '+91' && digits.length === 10) {
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return digits;
  };

  return (
    <FieldWrapper label={label} error={displayError} hint="Include country code" required={required}>
      <div className="flex gap-1">
        <select
          value={countryCode}
          onChange={handleCodeChange}
          disabled={disabled}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50 w-[90px] shrink-0"
          aria-label="Country code"
        >
          {COUNTRY_CODES.map((cc) => (
            <option key={cc.code} value={cc.code}>
              {cc.flag} {cc.code}
            </option>
          ))}
        </select>
        <Input
          type="tel"
          inputMode="numeric"
          value={formatDisplay(localNumber, countryCode)}
          onChange={handleLocalChange}
          onBlur={() => setTouched(true)}
          placeholder={placeholder || (countryCode === '+91' ? '98765 43210' : 'Phone number')}
          disabled={disabled}
          className={displayError ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      </div>
    </FieldWrapper>
  );
}

// ─── GSTIN input ──────────────────────────────────────────────────────────────

interface GstinInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onBlur?: () => void;
}

export function GstinInput({ value, onChange, label, required, disabled, error: externalError, onBlur }: GstinInputProps) {
  const [touched, setTouched] = useState(false);
  const normalized = normalizeGstin(value);
  const internalError = touched ? validateGstin(normalized) : undefined;
  const displayError = externalError || internalError;

  // Live format: uppercase, max 15 chars, no spaces
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 15);
    onChange(v);
  };

  // Visual segments: 22 AAAAA 0000 A 1 Z 5
  const formatGstin = (v: string) => {
    if (v.length <= 2) return v;
    if (v.length <= 7) return `${v.slice(0, 2)} ${v.slice(2)}`;
    if (v.length <= 11) return `${v.slice(0, 2)} ${v.slice(2, 7)} ${v.slice(7)}`;
    if (v.length <= 12) return `${v.slice(0, 2)} ${v.slice(2, 7)} ${v.slice(7, 11)} ${v.slice(11)}`;
    return `${v.slice(0, 2)} ${v.slice(2, 7)} ${v.slice(7, 11)} ${v.slice(11, 12)} ${v.slice(12)}`;
  };

  return (
    <FieldWrapper label={label} error={displayError} hint="15-character GST Identification Number" required={required}>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            const n = normalizeGstin(value);
            if (n !== value) onChange(n);
            onBlur?.();
          }}
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
          disabled={disabled}
          className={`font-mono tracking-wider uppercase ${displayError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          spellCheck={false}
        />
        {value.length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {value.length}/15
          </span>
        )}
      </div>
      {value.length > 0 && !displayError && (
        <p className="text-xs text-muted-foreground font-mono">{formatGstin(value)}</p>
      )}
    </FieldWrapper>
  );
}

// ─── PAN input ────────────────────────────────────────────────────────────────

interface PanInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function PanInput({ value, onChange, label, required, disabled, error: externalError }: PanInputProps) {
  const [touched, setTouched] = useState(false);
  const internalError = touched ? validatePan(value) : undefined;
  const displayError = externalError || internalError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    onChange(v);
  };

  // Format: AAAAA 0000 A
  const formatPan = (v: string) => {
    if (v.length <= 5) return v;
    if (v.length <= 9) return `${v.slice(0, 5)} ${v.slice(5)}`;
    return `${v.slice(0, 5)} ${v.slice(5, 9)} ${v.slice(9)}`;
  };

  return (
    <FieldWrapper label={label} error={displayError} hint="10-character Permanent Account Number" required={required}>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            const n = normalizePan(value);
            if (n !== value) onChange(n);
          }}
          placeholder="ABCDE1234F"
          maxLength={10}
          disabled={disabled}
          className={`font-mono tracking-wider uppercase ${displayError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          spellCheck={false}
        />
        {value.length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {value.length}/10
          </span>
        )}
      </div>
      {value.length > 0 && !displayError && (
        <p className="text-xs text-muted-foreground font-mono">{formatPan(value)}</p>
      )}
    </FieldWrapper>
  );
}

// ─── IFSC input ───────────────────────────────────────────────────────────────

interface IfscInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function IfscInput({ value, onChange, label, required, disabled, error: externalError }: IfscInputProps) {
  const [touched, setTouched] = useState(false);
  const internalError = touched ? validateIfsc(value) : undefined;
  const displayError = externalError || internalError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    onChange(v);
  };

  // Format: SBIN 0 001234
  const formatIfsc = (v: string) => {
    if (v.length <= 4) return v;
    if (v.length <= 5) return `${v.slice(0, 4)} ${v.slice(4)}`;
    return `${v.slice(0, 4)} ${v.slice(4, 5)} ${v.slice(5)}`;
  };

  return (
    <FieldWrapper label={label} error={displayError} hint="11-character bank branch code" required={required}>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            const n = normalizeIfsc(value);
            if (n !== value) onChange(n);
          }}
          placeholder="SBIN0001234"
          maxLength={11}
          disabled={disabled}
          className={`font-mono tracking-wider uppercase ${displayError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          spellCheck={false}
        />
        {value.length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {value.length}/11
          </span>
        )}
      </div>
      {value.length > 0 && !displayError && (
        <p className="text-xs text-muted-foreground font-mono">{formatIfsc(value)}</p>
      )}
    </FieldWrapper>
  );
}

// ─── Account number input ─────────────────────────────────────────────────────

interface AccountNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function AccountNumberInput({ value, onChange, label, required, disabled, error: externalError }: AccountNumberInputProps) {
  const [touched, setTouched] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const internalError = touched ? validateAccountNumber(value) : undefined;
  const displayError = externalError || internalError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 18);
    onChange(v);
  };

  // Mask: show last 4 digits only when not focused
  const maskedValue = value.length > 4
    ? '•'.repeat(value.length - 4) + value.slice(-4)
    : value;

  return (
    <FieldWrapper label={label} error={displayError} hint="9–18 digit bank account number" required={required}>
      <div className="relative">
        <Input
          type={showFull ? 'text' : 'password'}
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onFocus={() => setShowFull(true)}
          onBlur={() => {
            setShowFull(false);
            setTouched(true);
            const n = normalizeAccountNumber(value);
            if (n !== value) onChange(n);
          }}
          placeholder="Enter account number"
          maxLength={18}
          disabled={disabled}
          className={`font-mono pr-20 ${displayError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {value.length > 0 && (
            <span className="text-xs text-muted-foreground">{value.length} digits</span>
          )}
        </div>
      </div>
    </FieldWrapper>
  );
}

// ─── UPI ID input ─────────────────────────────────────────────────────────────

interface UpiInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function UpiInput({ value, onChange, label, required, disabled, error: externalError }: UpiInputProps) {
  const [touched, setTouched] = useState(false);
  const internalError = touched ? validateUpiId(value) : undefined;
  const displayError = externalError || internalError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow alphanumeric, dots, hyphens, underscores, and @
    const v = e.target.value.replace(/[^a-zA-Z0-9.\-_@]/g, '');
    onChange(v);
  };

  const hasAt = value.includes('@');

  return (
    <FieldWrapper label={label} error={displayError} hint="e.g. name@upi or 9876543210@paytm" required={required}>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            const n = normalizeUpiId(value);
            if (n !== value) onChange(n);
          }}
          placeholder="yourname@upi"
          disabled={disabled}
          className={displayError ? 'border-destructive focus-visible:ring-destructive' : ''}
          spellCheck={false}
          autoComplete="off"
        />
        {value.length > 0 && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${hasAt ? 'text-green-600' : 'text-muted-foreground'}`}>
            {hasAt ? '✓' : 'needs @'}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
}

// ─── Email input ──────────────────────────────────────────────────────────────

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

export function EmailInput({ value, onChange, label, required, disabled, error: externalError, placeholder }: EmailInputProps) {
  const [touched, setTouched] = useState(false);
  const internalError = touched ? validateEmail(value) : undefined;
  const displayError = externalError || internalError;

  return (
    <FieldWrapper label={label} error={displayError} required={required}>
      <Input
        type="email"
        inputMode="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          setTouched(true);
          const n = normalizeEmail(value);
          if (n !== value) onChange(n);
        }}
        placeholder={placeholder || 'email@example.com'}
        disabled={disabled}
        className={displayError ? 'border-destructive focus-visible:ring-destructive' : ''}
        autoComplete="email"
        spellCheck={false}
      />
    </FieldWrapper>
  );
}

// ─── Postal code input ────────────────────────────────────────────────────────

interface PostalCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onLookup?: (pincode: string) => void;
}

export function PostalCodeInput({ value, onChange, label, required, disabled, error: externalError, onLookup }: PostalCodeInputProps) {
  const [touched, setTouched] = useState(false);
  const internalError = touched ? validatePostalCode(value) : undefined;
  const displayError = externalError || internalError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(v);
    if (v.length === 6 && onLookup) onLookup(v);
  };

  return (
    <FieldWrapper label={label} error={displayError} hint="6-digit PIN code" required={required}>
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder="400001"
        maxLength={6}
        disabled={disabled}
        className={`font-mono ${displayError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
    </FieldWrapper>
  );
}

// ─── Address textarea ─────────────────────────────────────────────────────────

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

export function AddressInput({ value, onChange, label, required, disabled, placeholder, rows = 3 }: AddressInputProps) {
  return (
    <FieldWrapper label={label} required={required}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Street, Area, City, State - PIN'}
        rows={rows}
        disabled={disabled}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />
    </FieldWrapper>
  );
}
