import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { accountApi, periodApi } from '../../services/api';
import { DayEndSnapshot, PeriodStatus, PeriodCloseLog } from '../../types';
import { Lock, Unlock, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { SkeletonCards, SkeletonLines } from '../ui/Skeleton';

const inputCls =
  'w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500';

export default function DayEndTab() {
  const { shopSettings, hasPermission } = useStore();
  const canClose = hasPermission('period.close');
  const canReopen = hasPermission('period.reopen');

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [snapshot, setSnapshot] = useState<DayEndSnapshot | null>(null);
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);
  const [history, setHistory] = useState<PeriodCloseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [closeNote, setCloseNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [snap, status, hist] = await Promise.all([
        accountApi.getDayEnd(date ? new Date(date).toISOString() : undefined),
        periodApi.status(),
        periodApi.history(20),
      ]);
      setSnapshot(snap);
      setPeriodStatus(status);
      setHistory(hist);
    } catch (err: any) {
      setError(err?.message || 'Failed to load day-end');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const isClosed = useMemo(() => {
    if (!periodStatus?.closedThroughDate) return false;
    if (!date) return false;
    const target = new Date(date);
    target.setHours(23, 59, 59, 999);
    const through = new Date(periodStatus.closedThroughDate);
    return target.getTime() <= through.getTime();
  }, [periodStatus, date]);

  const closeDate = async () => {
    if (!confirm(`Close the books through ${date}? After this, no entries dated on or before ${date} can be created or cancelled.`)) return;
    setSubmitting(true);
    try {
      await periodApi.close(new Date(date).toISOString(), closeNote);
      setCloseNote('');
      await load();
    } catch (err: any) {
      alert(err?.message || 'Close failed');
    } finally {
      setSubmitting(false);
    }
  };

  const reopenToDate = async () => {
    if (!periodStatus?.closedThroughDate) return;
    const inp = prompt(
      'Reopen back to date (YYYY-MM-DD). Anything dated on or after this date becomes editable again.\nLeave blank and click OK to fully reopen.',
      '',
    );
    if (inp === null) return;
    const note = prompt('Reason / note for the reopen?', '') || '';
    setSubmitting(true);
    try {
      await periodApi.reopen(inp ? new Date(inp).toISOString() : null, note);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Reopen failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="bg-slate-800 border border-slate-700 rounded p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Day</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Reload
        </button>
        <div className="ml-auto flex items-end gap-2">
          {periodStatus?.closedThroughDate && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-200 rounded text-xs">
              <Lock className="w-3 h-3" />
              Locked through {format(new Date(periodStatus.closedThroughDate), 'd MMM yyyy')}
            </span>
          )}
          {canReopen && periodStatus?.closedThroughDate && (
            <button
              onClick={reopenToDate}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm"
            >
              <Unlock className="w-4 h-4" /> Reopen
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}
      {loading && (
        <>
          <SkeletonCards count={8} className="grid grid-cols-2 md:grid-cols-4 gap-2" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded p-3"><SkeletonLines lines={6} /></div>
            <div className="bg-slate-800 border border-slate-700 rounded p-3"><SkeletonLines lines={6} /></div>
          </div>
        </>
      )}

      {snapshot && !loading && (
        <>
          {/* Top KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Kpi label="Cash inflow" value={formatCurrency(snapshot.cash.inflow)} tone="emerald" />
            <Kpi label="Cash outflow" value={formatCurrency(snapshot.cash.outflow)} tone="rose" />
            <Kpi label="Net cash movement" value={formatCurrency(snapshot.netCashMovement)} tone={snapshot.netCashMovement >= 0 ? 'emerald' : 'rose'} />
            <Kpi label="Cash in hand (closing)" value={formatCurrency(snapshot.cash.closing)} tone="blue" />
            <Kpi label="Sales (net)" value={formatCurrency(snapshot.sales.net)} tone="emerald" />
            <Kpi label="Returns" value={formatCurrency(snapshot.salesReturn.net)} tone="amber" />
            <Kpi label="Customer credit ↑" value={formatCurrency(snapshot.customerReceivable.net)} tone={snapshot.customerReceivable.net >= 0 ? 'amber' : 'emerald'} />
            <Kpi label="Expenses" value={formatCurrency(snapshot.expense.net)} tone="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cash & Bank breakdown */}
            <div className="bg-slate-800 border border-slate-700 rounded">
              <div className="px-3 py-2 border-b border-slate-700">
                <h3 className="text-sm font-semibold">Cash & Bank movement</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-700/40 text-slate-300 text-xs uppercase">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Account</th>
                    <th className="px-2 py-1.5 text-right">Opening</th>
                    <th className="px-2 py-1.5 text-right">In</th>
                    <th className="px-2 py-1.5 text-right">Out</th>
                    <th className="px-2 py-1.5 text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {[...snapshot.cash.accounts, ...snapshot.bank.accounts].length === 0 ? (
                    <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400 text-xs">No cash or bank accounts seen.</td></tr>
                  ) : (
                    [...snapshot.cash.accounts, ...snapshot.bank.accounts].map(row => (
                      <tr key={row.account.id} className="border-t border-slate-700">
                        <td className="px-2 py-1">
                          <span className="font-mono text-blue-300 text-xs">{row.account.code}</span>{' '}
                          {row.account.name}
                        </td>
                        <td className="px-2 py-1 text-right">{formatCurrency(row.opening)}</td>
                        <td className="px-2 py-1 text-right text-emerald-300">{row.inflow > 0 ? formatCurrency(row.inflow) : ''}</td>
                        <td className="px-2 py-1 text-right text-rose-300">{row.outflow > 0 ? formatCurrency(row.outflow) : ''}</td>
                        <td className="px-2 py-1 text-right font-medium">{formatCurrency(row.closing)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Movement summary */}
            <div className="bg-slate-800 border border-slate-700 rounded">
              <div className="px-3 py-2 border-b border-slate-700">
                <h3 className="text-sm font-semibold">Day summary</h3>
              </div>
              <div className="p-3 space-y-1.5 text-sm">
                <Row label="Sales income (Cr − Dr)" value={formatCurrency(snapshot.sales.net)} positive />
                <Row label="Sales returns (Dr − Cr)" value={formatCurrency(snapshot.salesReturn.net)} />
                <Row label="Customer receivables Δ" value={formatCurrency(snapshot.customerReceivable.net)} hint={`+${formatCurrency(snapshot.customerReceivable.increase)} / −${formatCurrency(snapshot.customerReceivable.decrease)}`} />
                <Row label="Supplier payables Δ" value={formatCurrency(snapshot.supplierPayable.net)} hint={`+${formatCurrency(snapshot.supplierPayable.increase)} / −${formatCurrency(snapshot.supplierPayable.decrease)}`} />
                <Row label="Expenses" value={formatCurrency(snapshot.expense.net)} />
                <div className="border-t border-slate-700 pt-2 mt-2 space-y-1">
                  <Row label="Cash in hand opening" value={formatCurrency(snapshot.cash.opening)} />
                  <Row label="Cash in hand closing" value={formatCurrency(snapshot.cash.closing)} positive />
                  <Row label="Bank balance opening" value={formatCurrency(snapshot.bank.opening)} />
                  <Row label="Bank balance closing" value={formatCurrency(snapshot.bank.closing)} positive />
                </div>
              </div>
            </div>
          </div>

          {/* Close action */}
          {canClose && (
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <h3 className="text-sm font-semibold mb-2">Close this day</h3>
              {isClosed ? (
                <p className="text-xs text-amber-300 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> This date is already in the locked period.
                </p>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-xs text-slate-400 mb-1">Note (optional)</label>
                    <input
                      value={closeNote}
                      onChange={e => setCloseNote(e.target.value)}
                      placeholder="e.g. End of business day, drawer reconciled"
                      className={inputCls}
                    />
                  </div>
                  <button
                    onClick={closeDate}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded text-sm font-medium text-white"
                  >
                    <Lock className="w-4 h-4" /> {submitting ? 'Closing…' : `Close through ${date}`}
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> After close, sales/returns/payments dated on or before this day cannot be created or cancelled.
              </p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded">
              <div className="px-3 py-2 border-b border-slate-700">
                <h3 className="text-sm font-semibold">Period close history</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-700/40 text-slate-300 text-xs uppercase">
                  <tr>
                    <th className="px-2 py-1.5 text-left">When</th>
                    <th className="px-2 py-1.5 text-left">Action</th>
                    <th className="px-2 py-1.5 text-left">Through</th>
                    <th className="px-2 py-1.5 text-left">By</th>
                    <th className="px-2 py-1.5 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-t border-slate-700">
                      <td className="px-2 py-1 text-xs whitespace-nowrap">{h.at ? format(new Date(h.at), 'd MMM yyyy HH:mm') : ''}</td>
                      <td className={`px-2 py-1 capitalize text-xs ${h.action === 'close' ? 'text-rose-300' : 'text-emerald-300'}`}>{h.action}</td>
                      <td className="px-2 py-1 text-xs">{h.throughDate && new Date(h.throughDate).getTime() > 0 ? format(new Date(h.throughDate), 'd MMM yyyy') : '—'}</td>
                      <td className="px-2 py-1 text-xs">{h.by?.name || '—'}</td>
                      <td className="px-2 py-1 text-xs text-slate-400">{h.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' | 'amber' | 'blue' }) {
  const cls = {
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
    amber: 'text-amber-300',
    blue: 'text-blue-300',
  }[tone];
  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`text-base font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, positive, hint }: { label: string; value: string; positive?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-slate-400">{label}{hint && <span className="text-[11px] text-slate-600 ml-1">({hint})</span>}</span>
      <span className={positive ? 'font-medium text-emerald-300' : 'font-medium'}>{value}</span>
    </div>
  );
}
