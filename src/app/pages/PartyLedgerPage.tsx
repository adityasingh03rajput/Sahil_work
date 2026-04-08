import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { TraceLoader } from '../components/TraceLoader';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { exportHtmlPagesToPdf } from '../pdf';
import { useRef } from 'react';
import { getCurrentFiscalYearRange } from '../utils/fiscal';
import { DateRangePicker, DateRange } from '../components/ui/date-range-picker';
import { FeatureInfo } from '../components/FeatureInfo';
import { saveCsvWithDialog } from '../utils/saveFile';

type PartyType = 'customer' | 'supplier';

type BalanceType = 'dr' | 'cr';

interface Party {
  id: string;
  name: string;
  logoUrl?: string | null;
  logoDataUrl?: string | null;
  address?: string | null;
  billingAddress?: string | null;
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

interface QuickRangeDto {
  key: string;
  label: string;
  from: string;
  to: string;
  count: number;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));

const fmtBal = (b?: BalanceDto | null) => `${fmtMoney(b?.amount || 0)} ${String(b?.type || 'dr').toUpperCase()}`;

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const LEDGER_ROWS_PER_PAGE = 24;

const LEDGER_GRID_COLUMNS = '80px 80px 90px 80px 90px 90px 100px 100px';
const LEDGER_TABLE_BORDER = '1px solid #111827';

export function PartyLedgerPage() {
  const { accessToken, deviceId } = useAuth();
  const apiUrl = API_URL;

  const pdfPagesRootRef = useRef<HTMLDivElement | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);

  const readCurrentProfile = () => {
    const raw = localStorage.getItem('currentProfile');
    if (!raw) return {} as any;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return {} as any;
        }
      }
      return parsed || ({} as any);
    } catch {
      return {} as any;
    }
  };

  const profileId = readCurrentProfile()?.id;

  const [partyType, setPartyType] = useState<PartyType>('customer');
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string>('');

  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });

  const [loadingParties, setLoadingParties] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statement, setStatement] = useState<LedgerStatementDto | null>(null);

  const [quickRanges, setQuickRanges] = useState<QuickRangeDto[]>([]);
  const [loadingRanges, setLoadingRanges] = useState(false);
  const [quickRangeKey, setQuickRangeKey] = useState<string>('');
  const [visibleRows, setVisibleRows] = useState(50);

  const partyLabel = partyType === 'customer' ? 'Customer' : 'Supplier';

  const headers = useMemo(() => {
    return {
      Authorization: `Bearer ${accessToken}`,
      'X-Device-ID': deviceId,
      'X-Profile-ID': profileId,
    };
  }, [accessToken, deviceId, profileId]);

  useEffect(() => {
    const run = async () => {
      if (!accessToken || !deviceId || !profileId) return;
      setLoadingParties(true);
      try {
        const url = partyType === 'customer' ? `${apiUrl}/customers` : `${apiUrl}/suppliers`;
        const res = await fetch(url, { headers });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.error || 'Failed to load parties');
        const rows: Party[] = Array.isArray(data)
          ? data.map((p: any) => ({ id: String(p?.id || p?._id), name: String(p?.name || '') })).filter((p: Party) => p.id && p.name)
          : [];
        setParties(rows);
        // Auto-select "All" when parties load so user sees combined ledger immediately
        if (!partyId || (!rows.some((p) => p.id === partyId) && partyId !== '__all__')) {
          setPartyId(rows.length > 0 ? '__all__' : '');
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load parties');
        setParties([]);
        setPartyId('');
      } finally {
        setLoadingParties(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyType, accessToken, deviceId, profileId]);

  const loadStatement = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    if (!partyId) {
      toast.error(`Select a ${partyLabel.toLowerCase()} first`);
      return;
    }

    setLoadingStatement(true);
    try {
      const from = dateRange.from;
      const to = dateRange.to;

      if (partyId === '__all__') {
        // Fetch all parties' statements in parallel and merge
        if (parties.length === 0) { setStatement(null); return; }
        const results = await Promise.allSettled(
          parties.map(async (p) => {
            const qs = new URLSearchParams({ partyType, partyId: p.id, from, to }).toString();
            const res = await fetch(`${apiUrl}/ledger/statement?${qs}`, { headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return null;
            return { party: p, data: data as LedgerStatementDto };
          })
        );

        // Merge all rows into a combined statement
        const allRows: any[] = [];
        let totalDebit = 0, totalCredit = 0;
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.data?.rows) {
            const partyName = r.value.party.name;
            for (const row of r.value.data.rows) {
              allRows.push({ ...row, particulars: `[${partyName}] ${row.particulars || ''}` });
            }
            totalDebit += r.value.data.periodTotals?.debit || 0;
            totalCredit += r.value.data.periodTotals?.credit || 0;
          }
        }
        // Sort by date
        allRows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

        const combined: LedgerStatementDto = {
          party: { id: '__all__', name: `All ${partyLabel}s` },
          range: { from: from || '', to: to || '' },
          openingBalance: { amount: 0, type: 'dr' },
          periodTotals: { debit: totalDebit, credit: totalCredit },
          closingBalance: { amount: Math.abs(totalDebit - totalCredit), type: totalDebit >= totalCredit ? 'dr' : 'cr' },
          rows: allRows,
        };
        setStatement(combined);
        setVisibleRows(50);
        return;
      }

      const qs = new URLSearchParams({ partyType, partyId, from, to }).toString();
      const res = await fetch(`${apiUrl}/ledger/statement?${qs}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load statement');
      setStatement(data as LedgerStatementDto);
      setVisibleRows(50);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load statement');
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  };

  const loadRanges = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    if (!partyId) {
      setQuickRanges([]);
      setQuickRangeKey('');
      return;
    }

    setLoadingRanges(true);
    try {
      const qs = new URLSearchParams({ partyType, partyId }).toString();
      const res = await fetch(`${apiUrl}/ledger/ranges?${qs}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load ranges');

      const ranges: QuickRangeDto[] = Array.isArray(data?.ranges)
        ? data.ranges
            .map((r: any) => ({
              key: String(r?.key || ''),
              label: String(r?.label || ''),
              from: String(r?.from || ''),
              to: String(r?.to || ''),
              count: Number(r?.count || 0),
            }))
            .filter((r: QuickRangeDto) => r.key && r.label && r.from && r.to)
        : [];

      setQuickRanges(ranges);
      if (!ranges.some((r) => r.key === quickRangeKey)) {
        setQuickRangeKey('');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load quick ranges');
      setQuickRanges([]);
      setQuickRangeKey('');
    } finally {
      setLoadingRanges(false);
    }
  };

  useEffect(() => {
    if (!partyId) return;
    void loadStatement();
    if (partyId !== '__all__') void loadRanges();
    else { setQuickRanges([]); setQuickRangeKey(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, partyType]);

  const downloadCsv = () => {
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
    const name = String(statement.party?.name || partyLabel).replace(/[^a-z0-9\-_ ]/gi, '_');
    const filename = `ledger_${name}_${dateRange.from}_to_${dateRange.to}.csv`;
    
    void saveCsvWithDialog(csv, filename);
  };

  const downloadPdf = async () => {
    if (!statement) {
      toast.error('No statement to export');
      return;
    }
    if (!pdfPagesRootRef.current) {
      toast.error('PDF renderer not ready');
      return;
    }

    setPdfExporting(true);
    try {
      const pages = Array.from(pdfPagesRootRef.current.querySelectorAll<HTMLElement>('[data-ledger-pdf-page]'));
      const name = String(statement.party?.name || partyLabel).replace(/[^a-z0-9\-_ ]/gi, '_');
      const filename = `ledger_${name}_${dateRange.from}_to_${dateRange.to}.pdf`;
      await exportHtmlPagesToPdf({ pages, filename });
      toast.success('PDF downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export PDF');
    } finally {
      setPdfExporting(false);
    }
  };

  const selectedPartyName = partyId === '__all__'
    ? `All ${partyLabel}s`
    : parties.find((p) => p.id === partyId)?.name || statement?.party?.name || '';

  if (loadingParties && parties.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading ledger..." />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">Party Ledger</h1>
              <FeatureInfo 
                title="Party Ledger"
                steps={[
                  "Entries are automatically generated when an Invoice is Finalized.",
                  "Payments linked to the document appear as Credit (Receipts) or Debit (Purchases).",
                  "Closing Balance = Opening Balance + Total Debits - Total Credits.",
                  "Individual party statements show full transaction history including reference numbers."
                ]}
              />
            </div>
            <p className="text-muted-foreground mt-1">Statement format with opening/running/closing balance</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={downloadCsv} disabled={!statement}>
              Download CSV
            </Button>
            <Button type="button" variant="outline" onClick={downloadPdf} disabled={!statement || pdfExporting}>
              {pdfExporting ? 'Preparing…' : 'Download PDF'}
            </Button>
            <Button type="button" onClick={loadStatement} disabled={loadingStatement || !partyId}>
              {loadingStatement ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b bg-muted/40">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Filters</CardTitle>
              <Select
                value={quickRangeKey}
                onValueChange={(v) => {
                  setQuickRangeKey(v);
                  const found = quickRanges.find((r) => r.key === v);
                  if (!found) return;
                  setDateRange({ from: String(found.from).slice(0, 10), to: String(found.to).slice(0, 10) });
                  window.setTimeout(() => {
                    void loadStatement();
                  }, 0);
                }}
                disabled={loadingRanges || !partyId || quickRanges.length === 0}
              >
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue
                    placeholder={
                      loadingRanges
                        ? 'Loading ranges...'
                        : quickRanges.length
                          ? 'Quick date ranges'
                          : 'No ranges'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {quickRanges.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label} ({r.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Party Type</Label>
                <Select value={partyType} onValueChange={(v) => setPartyType(v as PartyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <Label>{partyLabel}</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${partyLabel.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {partyLabel}s</SelectItem>
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <div className="w-full">
                  <Label className="mb-1.5 block">Custom Date Range</Label>
                  <DateRangePicker range={dateRange} onRangeChange={setDateRange} align="start" className="w-full" persistenceKey="party_ledger" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>{selectedPartyName ? `${selectedPartyName} Ledger` : 'Ledger'}</CardTitle>
              {statement ? (
                <div className="text-sm text-muted-foreground">
                  Opening: <span className="font-semibold text-foreground">{fmtBal(statement.openingBalance)}</span>
                  <span className="mx-2">|</span>
                  Closing: <span className="font-semibold text-foreground">{fmtBal(statement.closingBalance)}</span>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingStatement ? (
              <div className="flex items-center justify-center py-10">
                <TraceLoader label="Loading statement..." />
              </div>
            ) : !statement ? (
              <div className="text-sm text-muted-foreground">Select a party to view statement.</div>
            ) : statement.rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No entries in this date range.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 min-w-[110px]">Date</th>
                      <th className="py-2 pr-3 min-w-[240px]">Particulars</th>
                      <th className="py-2 pr-3 min-w-[140px]">Vch Type</th>
                      <th className="py-2 pr-3 min-w-[130px]">Vch No.</th>
                      <th className="py-2 pr-3 min-w-[120px] text-right">Debit</th>
                      <th className="py-2 pr-3 min-w-[120px] text-right">Credit</th>
                      <th className="py-2 pr-3 min-w-[160px] text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.rows.slice(0, visibleRows).map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 whitespace-nowrap">{String(r.date || '').slice(0, 10)}</td>
                        <td className="py-2 pr-3">
                          <div className="font-medium text-foreground">{r.particulars || '—'}</div>
                        </td>
                        <td className="py-2 pr-3">{r.voucherType || '—'}</td>
                        <td className="py-2 pr-3">{r.voucherNo || '—'}</td>
                        <td className="py-2 pr-3 text-right">{r.debit ? fmtMoney(r.debit) : '—'}</td>
                        <td className="py-2 pr-3 text-right">{r.credit ? fmtMoney(r.credit) : '—'}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{fmtBal(r.balanceAfter)}</td>
                      </tr>
                    ))}
                    <tr className="border-t">
                      <td className="py-3 pr-3" colSpan={4}>
                        <div className="text-sm font-semibold text-foreground">Totals</div>
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold">{fmtMoney(statement.periodTotals.debit)}</td>
                      <td className="py-3 pr-3 text-right font-semibold">{fmtMoney(statement.periodTotals.credit)}</td>
                      <td className="py-3 pr-3 text-right font-semibold">{fmtBal(statement.closingBalance)}</td>
                    </tr>
                  </tbody>
                </table>
                {statement.rows.length > visibleRows && (
                  <div className="mt-4 space-y-2">
                    {/* Progress bar showing how much is loaded */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.round((visibleRows / statement.rows.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {visibleRows} / {statement.rows.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisibleRows(v => Math.min(v + 50, statement.rows.length))}
                      className="w-full py-2.5 rounded-lg border border-dashed border-primary/40 text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                      Load {Math.min(50, statement.rows.length - visibleRows)} more entries
                    </button>
                  </div>
                )}
                {statement.rows.length > 50 && visibleRows >= statement.rows.length && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-primary/20">
                      <div className="h-full w-full rounded-full bg-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">All {statement.rows.length} loaded</span>
                    <button
                      type="button"
                      onClick={() => setVisibleRows(50)}
                      className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                    >
                      Collapse
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div
          ref={pdfPagesRootRef}
          style={{ position: 'fixed', left: -10000, top: 0, width: A4_WIDTH_PX, height: 'auto', pointerEvents: 'none' }}
          aria-hidden
        >
          {statement && (
            <LedgerStatementPdfPages
              statement={statement}
              profile={readCurrentProfile()}
              partyLabel={partyLabel}
              from={dateRange.from}
              to={dateRange.to}
            />
          )}
        </div>
      </div>
    </>
  );
}

function LedgerStatementPdfPages(props: {
  statement: LedgerStatementDto;
  profile: any;
  partyLabel: string;
  from: string;
  to: string;
}) {
  const { statement, profile, partyLabel, from, to } = props;

  const rows = Array.isArray(statement.rows) ? statement.rows : [];
  const chunks: LedgerRowDto[][] = [];
  for (let i = 0; i < rows.length; i += LEDGER_ROWS_PER_PAGE) {
    chunks.push(rows.slice(i, i + LEDGER_ROWS_PER_PAGE));
  }
  const pages = chunks.length ? chunks : [[]];

  const businessName = String(profile?.businessName || '').trim();
  const ownerName = String(profile?.ownerName || '').trim();
  const address = String(profile?.billingAddress || '').trim();
  const phone = String(profile?.phone || '').trim();
  const email = String(profile?.email || '').trim();
  const gstin = String(profile?.gstin || '').trim();
  const state = String(profile?.billingState || profile?.state || '').trim();
  const businessLogo = String(profile?.logoUrl || profile?.logoDataUrl || '').trim();

  const partyLogo = String((statement as any)?.party?.logoUrl || (statement as any)?.party?.logoDataUrl || '').trim();

  const partyName = String(statement.party?.name || '').trim();
  const partyAddress = String((statement as any)?.party?.address || (statement as any)?.party?.billingAddress || '').trim();
  const partyGstin = String((statement as any)?.party?.gstin || '').trim();

  const opening = statement.openingBalance;

  const balanceSplit = (b?: BalanceDto | null) => {
    const amt = Number(b?.amount || 0);
    const t = String(b?.type || 'dr').toLowerCase();
    const receivable = t === 'dr' ? amt : 0;
    const payable = t === 'cr' ? amt : 0;
    return { receivable, payable };
  };

  return (
    <div>
      {pages.map((pageRows, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;

        const prevPageLast = pageIndex > 0 ? pages[pageIndex - 1][pages[pageIndex - 1].length - 1] : null;
        const broughtForward = isFirst ? opening : prevPageLast?.balanceAfter;

        const pageLast = pageRows[pageRows.length - 1] || null;
        const carriedOver = !isLast ? pageLast?.balanceAfter : null;

        const bfSplit = balanceSplit(broughtForward);

        return (
          <div
            key={pageIndex}
            data-ledger-pdf-page
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX,
              background: '#ffffff',
              color: '#111827',
              padding: 34,
              boxSizing: 'border-box',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {partyLogo ? (
                    <img
                      src={partyLogo}
                      alt="Party Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  ) : businessLogo ? (
                    <img
                      src={businessLogo}
                      alt="Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#f3f4f6' }} />
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2 }}>{businessName || 'Business'}</div>
                {address ? <div style={{ fontSize: 10.5, marginTop: 3, whiteSpace: 'pre-line' }}>{address}</div> : null}
                {(phone || email) ? (
                  <div style={{ fontSize: 10.5, marginTop: 3 }}>
                    {phone ? `Phone no: ${phone}` : ''}{phone && email ? '  ' : ''}{email ? `Email: ${email}` : ''}
                  </div>
                ) : null}
                {(gstin || state) ? (
                  <div style={{ fontSize: 10.5, marginTop: 3, fontWeight: 700 }}>
                    {gstin ? `GSTIN : ${gstin}` : ''}{gstin && state ? ', ' : ''}{state ? `State: ${state}` : ''}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #111827', opacity: 0.4, marginTop: 10, marginBottom: 14 }} />

            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, textDecoration: 'underline' }}>Party statement</div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 900 }}>
                Party name: {partyName || '—'}
              </div>
              {partyAddress ? <div style={{ fontSize: 11, marginTop: 6 }}>Address: {partyAddress}</div> : null}
              {partyGstin ? <div style={{ fontSize: 11, marginTop: 2 }}>GSTIN: {partyGstin}</div> : null}
            </div>

            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 12 }}>
              Duration: From {from} to {to}
            </div>

            <div style={{ border: LEDGER_TABLE_BORDER, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: LEDGER_GRID_COLUMNS,
                  padding: '8px 8px',
                  fontSize: 10,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  alignItems: 'center',
                  background: '#d1d5db',
                  borderBottom: LEDGER_TABLE_BORDER,
                }}
              >
                <div>Date</div>
                <div>Txn Type</div>
                <div>Ref No.</div>
                <div style={{ textAlign: 'right' }}>Total</div>
                <div style={{ textAlign: 'right', lineHeight: 1.05 }}>
                  Received <br />/ Paid
                </div>
                <div style={{ textAlign: 'right', lineHeight: 1.05 }}>
                  Txn <br />Balance
                </div>
                <div style={{ textAlign: 'right', lineHeight: 1.05 }}>
                  Receivable <br />Balance
                </div>
                <div style={{ textAlign: 'right', lineHeight: 1.05 }}>
                  Payable <br />Balance
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: LEDGER_GRID_COLUMNS,
                    padding: '8px 8px',
                    fontSize: 10,
                    lineHeight: 1.15,
                    alignItems: 'center',
                    minHeight: 32,
                    borderBottom: LEDGER_TABLE_BORDER,
                    background: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  <div>{String(from || '').trim() ? String(from) : ''}</div>
                  <div
                    style={{
                      gridColumn: '2 / span 2',
                      lineHeight: 1.05,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      paddingTop: 1,
                    }}
                  >
                    <span>Receivable</span>
                    <span>Beginning</span>
                    <span>Balance</span>
                  </div>
                  <div style={{ textAlign: 'right' }} />
                  <div style={{ textAlign: 'right' }} />
                  <div style={{ textAlign: 'right' }}>{fmtBal(broughtForward)}</div>
                  <div style={{ textAlign: 'right' }}>{bfSplit.receivable ? fmtMoney(bfSplit.receivable) : ''}</div>
                  <div style={{ textAlign: 'right' }}>{bfSplit.payable ? fmtMoney(bfSplit.payable) : ''}</div>
                </div>

                {pageRows.map((r) => {
                  const total = Number(r.debit || 0);
                  const received = Number(r.credit || 0);
                  const txnBal = total - received;
                  const split = balanceSplit(r.balanceAfter);
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: LEDGER_GRID_COLUMNS,
                        padding: '9px 8px',
                        fontSize: 10,
                        lineHeight: 1.15,
                        alignItems: 'center',
                        minHeight: 30,
                        borderBottom: '1px solid rgba(17,24,39,0.35)',
                        background: '#ffffff',
                      }}
                    >
                      <div style={{ whiteSpace: 'nowrap' }}>{String(r.date || '').slice(0, 10)}</div>
                      <div
                        style={{
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: 1.15,
                          display: 'flex',
                          alignItems: 'center',
                          paddingTop: 1,
                        }}
                      >
                        {String(r.voucherType || 'Txn')}
                      </div>
                      <div
                        style={{
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: 1.15,
                          display: 'flex',
                          alignItems: 'center',
                          paddingTop: 1,
                        }}
                      >
                        {String(r.voucherNo || '')}
                      </div>
                      <div style={{ textAlign: 'right' }}>{total ? fmtMoney(total) : ''}</div>
                      <div style={{ textAlign: 'right' }}>{received ? fmtMoney(received) : ''}</div>
                      <div style={{ textAlign: 'right' }}>{txnBal ? fmtMoney(txnBal) : ''}</div>
                      <div style={{ textAlign: 'right' }}>{split.receivable ? fmtMoney(split.receivable) : ''}</div>
                      <div style={{ textAlign: 'right' }}>{split.payable ? fmtMoney(split.payable) : ''}</div>
                    </div>
                  );
                })}

                {(isLast || carriedOver) && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: LEDGER_GRID_COLUMNS,
                      padding: '8px 8px',
                      fontSize: 10,
                      lineHeight: 1.15,
                      alignItems: 'center',
                      minHeight: 32,
                      background: '#d1d5db',
                      borderTop: LEDGER_TABLE_BORDER,
                      fontWeight: 900,
                    }}
                  >
                    <div />
                    <div style={{ gridColumn: '2 / span 2' }}>Total</div>
                    <div style={{ textAlign: 'right' }} />
                    <div style={{ textAlign: 'right' }}>{fmtMoney(statement.periodTotals.debit)}</div>
                    <div style={{ textAlign: 'right' }}>{fmtMoney(statement.periodTotals.credit)}</div>
                    <div style={{ textAlign: 'right' }}>{fmtBal(statement.closingBalance)}</div>
                    <div style={{ textAlign: 'right' }}>{balanceSplit(statement.closingBalance).receivable ? fmtMoney(balanceSplit(statement.closingBalance).receivable) : ''}</div>
                    <div style={{ textAlign: 'right' }}>{balanceSplit(statement.closingBalance).payable ? fmtMoney(balanceSplit(statement.closingBalance).payable) : ''}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 10.5 }}>
              <div style={{ color: '#6b7280' }}>{businessName ? businessName : ''}</div>
              <div style={{ fontWeight: 900 }}>Page {pageIndex + 1}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
