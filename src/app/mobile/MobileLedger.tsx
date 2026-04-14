/**
 * MobileLedger — Mobile-optimized party ledger page
 * Fully theme-aware (dark, light, warm, ocean, emerald, rosewood)
 * Responsive to display scales (compact, medium, large)
 */
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { ChevronDown, Download, RefreshCw, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { useTheme } from '../contexts/ThemeContext';
import { useDisplay } from '../contexts/DisplayContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { MOBILE_TOKENS } from './MobileDesignSystem';
import { saveCsvWithDialog } from '../utils/saveFile';

type PartyType = 'customer' | 'supplier';
type BalanceType = 'dr' | 'cr';

interface Party {
  id: string;
  name: string;
}

interface BalanceDto {
  amount: number;
  type: BalanceType;
}

interface LedgerRowDto {
  id: string;
  date: string;
  particulars: string;
  voucherType: string;
  voucherNo: string;
  debit: number;
  credit: number;
  balanceAfter: BalanceDto;
}

interface LedgerStatementDto {
  party: Party;
  range: { from: string; to: string };
  openingBalance: BalanceDto;
  periodTotals: { debit: number; credit: number };
  closingBalance: BalanceDto;
  rows: LedgerRowDto[];
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));

const fmtBal = (b?: BalanceDto | null) => `${fmtMoney(b?.amount || 0)} ${String(b?.type || 'dr').toUpperCase()}`;

// Theme color system supporting all themes: dark, light, warm, ocean, emerald, rosewood
const getThemeColors = (resolvedTheme: 'light' | 'dark', themeClass: string | null) => {
  const isDark = resolvedTheme === 'dark';
  
  // Base colors for light/dark
  const baseColors = {
    light: {
      bg: '#fafaf9',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: 'rgba(0,0,0,0.5)',
      border: 'rgba(0,0,0,0.1)',
      inputBg: 'rgba(0,0,0,0.05)',
    },
    dark: {
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: 'rgba(255,255,255,0.4)',
      border: 'rgba(255,255,255,0.08)',
      inputBg: 'rgba(255,255,255,0.06)',
    },
  };

  const base = isDark ? baseColors.dark : baseColors.light;

  // Theme-specific accent colors
  const themeAccents: Record<string, string> = {
    'theme-warm': '#f97316',    // Orange
    'theme-ocean': '#0ea5e9',   // Sky blue
    'theme-emerald': '#10b981', // Emerald
    'theme-rosewood': '#e11d48', // Rose
  };

  const accent = themeClass && themeAccents[themeClass] ? themeAccents[themeClass] : '#6366f1'; // Default indigo

  return { ...base, accent };
};

// Memoized Ledger Row Component — Matches desktop table design
const LedgerRow = memo(({ row, colors, isExpanded, onToggle, scale }: { row: LedgerRowDto; colors: any; isExpanded: boolean; onToggle: () => void; scale: string }) => {
  const isDebit = row.debit > 0;
  
  // Scale-responsive spacing
  const spacingMap = {
    compact: { md: 8, lg: 12, xs: 4 },
    medium: { md: 12, lg: 16, xs: 4 },
    large: { md: 14, lg: 18, xs: 5 },
  };
  const sp = spacingMap[scale as keyof typeof spacingMap] || spacingMap.medium;

  // Scale-responsive font sizes
  const fontSizeMap = {
    compact: { label: 10, value: 11, secondary: 10 },
    medium: { label: 12, value: 13, secondary: 11 },
    large: { label: 13, value: 14, secondary: 12 },
  };
  const fs = fontSizeMap[scale as keyof typeof fontSizeMap] || fontSizeMap.medium;

  return (
    <div style={{ borderBottom: `1px solid ${colors.border}` }}>
      {/* Compact row - always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: `${sp.md}px ${sp.lg}px`,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: sp.md,
          transition: 'background 0.15s ease-out'
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: sp.md, marginBottom: sp.xs }}>
            <span style={{ fontSize: fs.label, fontWeight: 700, color: colors.textSecondary, minWidth: '70px' }}>{String(row.date || '').slice(0, 10)}</span>
            <span style={{ fontSize: fs.value, fontWeight: 600, color: colors.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.voucherNo || '—'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: fs.secondary, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.particulars || '—'}
          </p>
        </div>
        <div style={{ textAlign: 'right', minWidth: '100px' }}>
          <p style={{ margin: 0, fontSize: fs.value, fontWeight: 700, color: isDebit ? '#ef4444' : '#10b981' }}>
            {isDebit ? 'Dr' : 'Cr'} {fmtMoney(isDebit ? row.debit : row.credit)}
          </p>
          <p style={{ margin: `${sp.xs * 0.25}px 0 0`, fontSize: fs.secondary, fontWeight: 600, color: row.balanceAfter?.type === 'dr' ? '#ef4444' : '#10b981' }}>
            {fmtBal(row.balanceAfter)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', color: colors.textSecondary }}>
          {isExpanded ? <ChevronUp style={{ width: 18, height: 18 }} /> : <ChevronDown style={{ width: 18, height: 18 }} />}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div style={{ padding: `0 ${sp.lg}px ${sp.md}px`, background: colors.inputBg, animation: 'slideDown 0.2s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp.md, fontSize: fs.secondary }}>
            <div>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: fs.label - 1, fontWeight: 700, textTransform: 'uppercase', marginBottom: sp.xs }}>Voucher Type</p>
              <p style={{ margin: 0, color: colors.text, fontWeight: 600 }}>{row.voucherType || '—'}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: fs.label - 1, fontWeight: 700, textTransform: 'uppercase', marginBottom: sp.xs }}>Debit</p>
              <p style={{ margin: 0, color: '#ef4444', fontWeight: 700 }}>{fmtMoney(row.debit)}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: fs.label - 1, fontWeight: 700, textTransform: 'uppercase', marginBottom: sp.xs }}>Credit</p>
              <p style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>{fmtMoney(row.credit)}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: fs.label - 1, fontWeight: 700, textTransform: 'uppercase', marginBottom: sp.xs }}>Balance</p>
              <p style={{ margin: 0, color: row.balanceAfter?.type === 'dr' ? '#ef4444' : '#10b981', fontWeight: 700 }}>{fmtBal(row.balanceAfter)}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});

export function MobileLedger() {
  const { accessToken, deviceId } = useAuth();
  const { profileId } = useCurrentProfile();
  const { theme, resolvedTheme } = useTheme();
  const { scale } = useDisplay();

  // Get theme class for accent colors
  const themeClass = useMemo(() => {
    if (theme === 'warm') return 'theme-warm';
    if (theme === 'ocean') return 'theme-ocean';
    if (theme === 'emerald') return 'theme-emerald';
    if (theme === 'rosewood') return 'theme-rosewood';
    return null;
  }, [theme]);

  // Theme-aware colors with all theme support
  const colors = useMemo(() => getThemeColors(resolvedTheme, themeClass), [resolvedTheme, themeClass]);

  // Scale-responsive spacing
  const spacingMap = {
    compact: { xs: 4, sm: 8, md: 12, lg: 16 },
    medium: { xs: 4, sm: 8, md: 12, lg: 16 },
    large: { xs: 5, sm: 10, md: 14, lg: 18 },
  };
  const sp = spacingMap[scale as keyof typeof spacingMap] || spacingMap.medium;

  // Scale-responsive font sizes
  const fontSizeMap = {
    compact: { h1: 20, h2: 16, body: 12, label: 10 },
    medium: { h1: 24, h2: 18, body: 13, label: 11 },
    large: { h1: 28, h2: 20, body: 14, label: 12 },
  };
  const fs = fontSizeMap[scale as keyof typeof fontSizeMap] || fontSizeMap.medium;

  const [partyType, setPartyType] = useState<PartyType>('customer');
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string>('');
  const [statement, setStatement] = useState<LedgerStatementDto | null>(null);

  const [loading, setLoading] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleRows, setVisibleRows] = useState(20);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const headers = useMemo(() => ({
    Authorization: `Bearer ${accessToken}`,
    'X-Device-ID': deviceId,
    'X-Profile-ID': profileId,
  }), [accessToken, deviceId, profileId]);

  // Load parties
  useEffect(() => {
    const loadParties = async () => {
      if (!accessToken || !deviceId || !profileId) return;
      setLoading(true);
      try {
        const url = partyType === 'customer' ? `${API_URL}/customers` : `${API_URL}/suppliers`;
        const res = await fetch(url, { headers });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.error || 'Failed to load parties');
        const rows: Party[] = Array.isArray(data)
          ? data.map((p: any) => ({ id: String(p?.id || p?._id), name: String(p?.name || '') })).filter((p: Party) => p.id && p.name)
          : [];
        setParties(rows);
        if (rows.length > 0 && !partyId) setPartyId(rows[0].id);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load parties');
        setParties([]);
      } finally {
        setLoading(false);
      }
    };
    loadParties();
  }, [partyType, accessToken, deviceId, profileId, headers]);

  // Load statement
  const loadStatement = useCallback(async () => {
    if (!accessToken || !deviceId || !profileId || !partyId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ partyType, partyId, from: dateFrom, to: dateTo }).toString();
      const res = await fetch(`${API_URL}/ledger/statement?${qs}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load statement');
      setStatement(data as LedgerStatementDto);
      setVisibleRows(20);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load statement');
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, deviceId, profileId, partyId, partyType, dateFrom, dateTo, headers]);

  // Load statement on party change
  useEffect(() => {
    if (partyId) loadStatement();
  }, [partyId, partyType]);

  const downloadCsv = useCallback(() => {
    if (!statement) {
      toast.error('No statement to export');
      return;
    }

    const lines: string[] = [];
    lines.push(['Date', 'Particulars', 'Voucher Type', 'Voucher No', 'Debit', 'Credit', 'Balance', 'Balance Type'].join(','));
    for (const r of statement.rows || []) {
      const balAmt = Number(r.balanceAfter?.amount || 0).toFixed(2);
      const balType = String(r.balanceAfter?.type || 'dr').toUpperCase();
      const row = [
        String(r.date || '').slice(0, 10),
        JSON.stringify(String(r.particulars || '')),
        JSON.stringify(String(r.voucherType || '')),
        JSON.stringify(String(r.voucherNo || '')),
        String(Number(r.debit || 0).toFixed(2)),
        String(Number(r.credit || 0).toFixed(2)),
        balAmt,
        balType,
      ];
      lines.push(row.join(','));
    }

    const csv = lines.join('\n');
    const name = String(statement.party?.name || 'Ledger').replace(/[^a-z0-9\-_ ]/gi, '_');
    saveCsvWithDialog(csv, `${name}-ledger.csv`);
  }, [statement]);

  const selectedParty = parties.find(p => p.id === partyId);
  const displayRows = statement?.rows?.slice(0, visibleRows) || [];
  const hasMore = (statement?.rows?.length || 0) > visibleRows;

  return (
    <div style={{ padding: `${sp.lg}px ${sp.lg}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)`, fontFamily: 'system-ui,sans-serif', background: colors.bg, color: colors.text }}>
      {/* Header */}
      <div style={{ marginBottom: sp.lg }}>
        <h1 style={{ margin: 0, fontSize: fs.h1, fontWeight: 800, color: colors.text }}>Ledger</h1>
        <p style={{ margin: `${sp.xs}px 0 0`, fontSize: fs.label, color: colors.textSecondary }}>Party transaction history</p>
      </div>

      {/* Party Type Selector */}
      <div style={{ display: 'flex', gap: sp.md, marginBottom: sp.lg }}>
        {(['customer', 'supplier'] as PartyType[]).map(type => (
          <button
            key={type}
            onClick={() => { setPartyType(type); setPartyId(''); }}
            style={{
              flex: 1,
              padding: `${sp.md}px ${sp.lg}px`,
              borderRadius: MOBILE_TOKENS.radius.lg,
              border: 'none',
              background: partyType === type ? colors.accent : colors.inputBg,
              color: partyType === type ? '#fff' : colors.text,
              fontSize: fs.body,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease-out'
            }}
          >
            {type === 'customer' ? 'Customers' : 'Suppliers'}
          </button>
        ))}
      </div>

      {/* Party Selector */}
      <div style={{ position: 'relative', marginBottom: sp.lg }}>
        <button
          onClick={() => setShowPartyDropdown(!showPartyDropdown)}
          style={{
            width: '100%',
            padding: `${sp.md}px ${sp.lg}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: fs.body,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease-out'
          }}
        >
          <span>{selectedParty?.name || 'Select a party'}</span>
          <ChevronDown style={{ width: 18, height: 18, transform: showPartyDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
        </button>

        {showPartyDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: sp.xs,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            maxHeight: 300,
            overflowY: 'auto',
            zIndex: 50,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            {parties.map(party => (
              <button
                key={party.id}
                onClick={() => {
                  setPartyId(party.id);
                  setShowPartyDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: `${sp.md}px ${sp.lg}px`,
                  border: 'none',
                  background: partyId === party.id ? `${colors.accent}20` : 'transparent',
                  color: partyId === party.id ? colors.accent : colors.text,
                  fontSize: fs.body,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease-out',
                  borderBottom: `1px solid ${colors.border}`
                }}
              >
                {party.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp.md, marginBottom: sp.lg }}>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={{
            padding: `${sp.md}px ${sp.lg}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: fs.body,
            fontWeight: 600
          }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={{
            padding: `${sp.md}px ${sp.lg}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: fs.body,
            fontWeight: 600
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: sp.md, marginBottom: sp.lg }}>
        <button
          onClick={loadStatement}
          disabled={loading}
          style={{
            flex: 1,
            padding: `${sp.md}px ${sp.lg}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: 'none',
            background: colors.accent,
            color: 'var(--primary-foreground)',
            fontSize: fs.body,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: sp.xs,
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.15s ease-out'
          }}
        >
          <RefreshCw style={{ width: 16, height: 16 }} />
          Load
        </button>
        <button
          onClick={downloadCsv}
          disabled={!statement || loading}
          style={{
            flex: 1,
            padding: `${sp.md}px ${sp.lg}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: fs.body,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: sp.xs,
            opacity: !statement || loading ? 0.4 : 1,
            transition: 'all 0.15s ease-out'
          }}
        >
          <Download style={{ width: 16, height: 16 }} />
          Export
        </button>
      </div>

      {/* Summary */}
      {statement && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp.md, marginBottom: sp.lg }}>
          <div style={{ padding: sp.lg, borderRadius: MOBILE_TOKENS.radius.lg, background: colors.inputBg, border: `1px solid ${colors.border}` }}>
            <p style={{ margin: 0, fontSize: fs.label, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase' }}>Opening</p>
            <p style={{ margin: `${sp.xs}px 0 0`, fontSize: fs.body, fontWeight: 700, color: colors.text }}>{fmtBal(statement.openingBalance)}</p>
          </div>
          <div style={{ padding: sp.lg, borderRadius: MOBILE_TOKENS.radius.lg, background: colors.inputBg, border: `1px solid ${colors.border}` }}>
            <p style={{ margin: 0, fontSize: fs.label, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase' }}>Closing</p>
            <p style={{ margin: `${sp.xs}px 0 0`, fontSize: fs.body, fontWeight: 700, color: statement.closingBalance?.type === 'dr' ? '#ef4444' : '#10b981' }}>{fmtBal(statement.closingBalance)}</p>
          </div>
        </div>
      )}

      {/* Ledger Rows */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: sp.lg * 2 }}>
          <div style={{ fontSize: fs.body, color: colors.textSecondary }}>Loading ledger...</div>
        </div>
      ) : displayRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: sp.lg * 2 }}>
          <div style={{ fontSize: fs.body, color: colors.textSecondary }}>No transactions found</div>
        </div>
      ) : (
        <>
          <div style={{ borderRadius: MOBILE_TOKENS.radius.lg, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: sp.lg, background: colors.surface }}>
            {displayRows.map(row => (
              <LedgerRow 
                key={row.id} 
                row={row} 
                colors={colors}
                isExpanded={expandedRows[row.id] || false}
                onToggle={() => setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                scale={scale}
              />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setVisibleRows(v => v + 20)}
              style={{
                width: '100%',
                padding: `${sp.md}px ${sp.lg}px`,
                borderRadius: MOBILE_TOKENS.radius.lg,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.accent,
                fontSize: fs.body,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease-out'
              }}
            >
              Load More ({visibleRows} of {statement?.rows?.length})
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default MobileLedger;

