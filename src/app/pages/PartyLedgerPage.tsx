import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
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

interface QuickRangeDto {
  key: string;
  label: string;
  from: string;
  to: string;
  count: number;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));

const fmtBal = (b: BalanceDto) => `${fmtMoney(b?.amount || 0)} ${String(b?.type || 'dr').toUpperCase()}`;

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const LEDGER_ROWS_PER_PAGE = 24;

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

  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toYmd(d);
  });
  const [to, setTo] = useState<string>(() => toYmd(new Date()));

  const [loadingParties, setLoadingParties] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statement, setStatement] = useState<LedgerStatementDto | null>(null);

  const [quickRanges, setQuickRanges] = useState<QuickRangeDto[]>([]);
  const [loadingRanges, setLoadingRanges] = useState(false);
  const [quickRangeKey, setQuickRangeKey] = useState<string>('');

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
        if (!rows.some((p) => p.id === partyId)) {
          setPartyId(rows[0]?.id || '');
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
      const qs = new URLSearchParams({ partyType, partyId, from, to }).toString();
      const res = await fetch(`${apiUrl}/ledger/statement?${qs}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load statement');
      setStatement(data as LedgerStatementDto);
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
    void loadRanges();
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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const name = String(statement.party?.name || partyLabel).replace(/[^a-z0-9\-_ ]/gi, '_');
    a.download = `ledger_${name}_${from}_to_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
      const filename = `ledger_${name}_${from}_to_${to}.pdf`;
      await exportHtmlPagesToPdf({ pages, filename });
      toast.success('PDF downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export PDF');
    } finally {
      setPdfExporting(false);
    }
  };

  const selectedPartyName = parties.find((p) => p.id === partyId)?.name || statement?.party?.name || '';

  if (loadingParties && parties.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading ledger..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Party Ledger</h1>
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
                  setFrom(String(found.from).slice(0, 10));
                  setTo(String(found.to).slice(0, 10));
                  window.setTimeout(() => {
                    void loadStatement();
                  }, 0);
                }}
                disabled={loadingRanges || !partyId || quickRanges.length === 0}
              >
                <SelectTrigger className="w-[280px]">
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
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>From</Label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </div>

              <div>
                <Label>To</Label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
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
                    {statement.rows.map((r) => (
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
              from={from}
              to={to}
            />
          )}
        </div>
      </div>
    </AppLayout>
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

  const headerLeft = businessName || 'Business';
  const headerRight = ownerName || '';

  const opening = statement.openingBalance;

  return (
    <div>
      {pages.map((pageRows, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;

        const prevPageLast = pageIndex > 0 ? pages[pageIndex - 1][pages[pageIndex - 1].length - 1] : null;
        const broughtForward = isFirst ? opening : prevPageLast?.balanceAfter;

        const pageLast = pageRows[pageRows.length - 1] || null;
        const carriedOver = !isLast ? pageLast?.balanceAfter : null;

        return (
          <div
            key={pageIndex}
            data-ledger-pdf-page
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX,
              background: '#ffffff',
              color: '#111827',
              padding: 24,
              boxSizing: 'border-box',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{headerLeft}</div>
              {headerRight ? <div style={{ fontSize: 12, marginTop: 2 }}>{headerRight}</div> : null}
              {address ? <div style={{ fontSize: 11, marginTop: 2, color: '#4b5563' }}>{address}</div> : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                Ledger Account: {String(statement.party?.name || '')}
              </div>
              <div style={{ fontSize: 11, color: '#4b5563' }}>
                {from} to {to}
              </div>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 120px 110px 110px 110px',
                  gap: 0,
                  padding: '8px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#f3f4f6',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div>Date</div>
                <div>Particulars</div>
                <div>Vch Type</div>
                <div>Vch No.</div>
                <div style={{ textAlign: 'right' }}>Debit</div>
                <div style={{ textAlign: 'right' }}>Credit</div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {broughtForward ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px 1fr 120px 110px 110px 110px',
                      padding: '8px 10px',
                      fontSize: 11,
                      borderBottom: '1px solid #e5e7eb',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ color: '#6b7280' }}>{isFirst ? '' : ''}</div>
                    <div style={{ fontWeight: 700 }}>{isFirst ? 'Opening Balance' : 'Brought Forward'}</div>
                    <div />
                    <div />
                    <div style={{ textAlign: 'right', color: '#6b7280' }} />
                    <div style={{ textAlign: 'right', fontWeight: 700 }}>{fmtBal(broughtForward)}</div>
                  </div>
                ) : null}

                {pageRows.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px 1fr 120px 110px 110px 110px',
                      padding: '8px 10px',
                      fontSize: 11,
                      borderBottom: '1px solid #f3f4f6',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ whiteSpace: 'nowrap' }}>{String(r.date || '').slice(0, 10)}</div>
                    <div>{r.particulars || partyLabel}</div>
                    <div>{r.voucherType || ''}</div>
                    <div>{r.voucherNo || ''}</div>
                    <div style={{ textAlign: 'right' }}>{r.debit ? fmtMoney(r.debit) : ''}</div>
                    <div style={{ textAlign: 'right' }}>{r.credit ? fmtMoney(r.credit) : ''}</div>
                  </div>
                ))}

                {carriedOver ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px 1fr 120px 110px 110px 110px',
                      padding: '8px 10px',
                      fontSize: 11,
                      borderTop: '1px solid #e5e7eb',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ color: '#6b7280' }} />
                    <div style={{ fontWeight: 700 }}>Carried Over</div>
                    <div />
                    <div />
                    <div style={{ textAlign: 'right', color: '#6b7280' }} />
                    <div style={{ textAlign: 'right', fontWeight: 700 }}>{fmtBal(carriedOver)}</div>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11 }}>
              <div style={{ color: '#6b7280' }}>{businessName ? businessName : ''}</div>
              <div style={{ fontWeight: 700 }}>Page {pageIndex + 1}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
