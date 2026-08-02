import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { JournalEntry, JournalSourceKind } from '../../types';
import { journalEntryApi } from '../../services/api';
import { Plus, Save, RotateCcw as RotateIcon, ChevronRight, ChevronDown, RotateCcw, Trash2, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { printVoucher } from '../../utils/printVoucher';
import { downloadCSV } from '../../utils/csv';
import { SkeletonTableRows } from '../ui/Skeleton';

const SOURCE_LABEL: Record<JournalSourceKind, string> = {
  sale: 'Sale',
  return: 'Return',
  manual: 'Manual',
  opening: 'Opening',
  payment: 'Payment',
  purchase: 'Purchase',
};

const VOUCHER_TITLE: Record<string, string> = {
  SV: 'Sale Voucher',
  RV: 'Return Voucher',
  JV: 'Journal Voucher',
  CV: 'Cash Voucher',
  BV: 'Bank Voucher',
  PV: 'Purchase Voucher',
  OV: 'Opening Voucher',
};

interface DraftLine {
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
}

const newLine = (): DraftLine => ({ accountId: '', debit: '', credit: '', memo: '' });

const inputCls =
  'w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500';

export default function JournalEntriesTab() {
  const { accounts, hasPermission, shopSettings } = useStore();
  const canManage = hasPermission('accounts.manage');

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'' | JournalSourceKind>('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [expanded, setExpanded] = useState<string | null>(null);

  // Inline form state (always rendered when canManage — no modal)
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formMemo, setFormMemo] = useState('');
  const [formNarration, setFormNarration] = useState('');
  const [formLines, setFormLines] = useState<DraftLine[]>([newLine(), newLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const activeAccounts = useMemo(
    () => accounts.filter(a => a.isActive && a.allowPosting !== false && !a.controlAccount),
    [accounts],
  );
  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await journalEntryApi.getAll({
        source: sourceFilter || undefined,
        from,
        to,
        limit: 500,
      });
      setEntries(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const draftTotals = useMemo(() => {
    let d = 0, c = 0;
    for (const ln of formLines) {
      d += parseFloat(ln.debit) || 0;
      c += parseFloat(ln.credit) || 0;
    }
    return { debit: d, credit: c, diff: Math.round((d - c) * 100) / 100 };
  }, [formLines]);

  const updateLine = (idx: number, patch: Partial<DraftLine>) => {
    setFormLines(prev => prev.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormMemo('');
    setFormNarration('');
    setFormLines([newLine(), newLine()]);
    setFormError(null);
  };

  const submit = async () => {
    setFormError(null);
    if (!formLines.length || formLines.length < 2) return setFormError('At least 2 lines required');
    for (const ln of formLines) {
      if (!ln.accountId) return setFormError('Every line needs an account');
      const d = parseFloat(ln.debit) || 0;
      const c = parseFloat(ln.credit) || 0;
      if (d === 0 && c === 0) return setFormError('Every line needs a debit or credit');
      if (d > 0 && c > 0) return setFormError('A line cannot have both debit and credit');
    }
    if (Math.abs(draftTotals.diff) > 0.01) {
      return setFormError(
        `Unbalanced: ${draftTotals.diff > 0 ? 'Debit' : 'Credit'} side is over by ${Math.abs(draftTotals.diff).toFixed(2)}`,
      );
    }
    setSubmitting(true);
    try {
      await journalEntryApi.create({
        date: formDate ? new Date(formDate).toISOString() : undefined,
        memo: formMemo,
        narration: formNarration,
        lines: formLines.map(ln => ({
          accountId: ln.accountId,
          debit: parseFloat(ln.debit) || 0,
          credit: parseFloat(ln.credit) || 0,
          memo: ln.memo,
        })),
      });
      resetForm();
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create entry');
    } finally {
      setSubmitting(false);
    }
  };

  const reverse = async (id: string) => {
    if (!confirm('Reverse this entry? A new offsetting entry will be created.')) return;
    try {
      await journalEntryApi.reverse(id);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Failed to reverse');
    }
  };

  const printEntry = (e: JournalEntry) => {
    printVoucher({
      shopName: shopSettings.shopName,
      shopAddress: shopSettings.shopAddress,
      shopPhone: shopSettings.shopPhone,
      currency: shopSettings.currency,
      title: VOUCHER_TITLE[e.voucherType] || 'Journal Voucher',
      voucherNumber: e.voucherNumber,
      date: format(new Date(e.date), 'd MMM yyyy HH:mm'),
      narration: e.narration || e.memo,
      lines: e.lines.map(ln => ({
        label: `${ln.accountCode || accountById.get(ln.accountId)?.code || ''} — ${ln.accountName || accountById.get(ln.accountId)?.name || ''}`,
        memo: ln.memo,
        debit: ln.debit,
        credit: ln.credit,
      })),
      footer: e.postedBy?.name ? `Posted by ${e.postedBy.name}` : undefined,
    });
  };

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['Voucher #', 'Date', 'Type', 'Source', 'Memo', 'Account Code', 'Account Name', 'Debit', 'Credit', 'Line Memo', 'Status', 'Posted By'],
    ];
    for (const e of entries) {
      const dateStr = format(new Date(e.date), 'yyyy-MM-dd HH:mm');
      const status = e.reversed ? 'Reversed' : 'Posted';
      for (const ln of e.lines) {
        rows.push([
          e.voucherNumber,
          dateStr,
          e.voucherType,
          SOURCE_LABEL[e.source.kind] || e.source.kind,
          e.memo || '',
          ln.accountCode || accountById.get(ln.accountId)?.code || '',
          ln.accountName || accountById.get(ln.accountId)?.name || '',
          ln.debit || 0,
          ln.credit || 0,
          ln.memo || '',
          status,
          e.postedBy?.name || '',
        ]);
      }
    }
    downloadCSV(`journal-${from}_to_${to}.csv`, rows);
  };

  return (
    <div>
      {/* ───────────── Inline manual-entry form (no modal) ───────────── */}
      {canManage && (
        <div className="bg-slate-800 border border-slate-700 rounded mb-3">
          <button
            onClick={() => setFormCollapsed(c => !c)}
            className="w-full px-3 py-2 flex items-center justify-between border-b border-slate-700 hover:bg-slate-700/30"
          >
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" /> New Manual Journal Entry
            </h3>
            <span className="text-xs text-slate-400">{formCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>

          {!formCollapsed && (
            <div className="p-3 space-y-2">
              {/* Date / Memo / Narration */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Memo</label>
                  <input
                    value={formMemo}
                    onChange={e => setFormMemo(e.target.value)}
                    placeholder="Short label"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs text-slate-400 mb-1">Narration</label>
                  <input
                    value={formNarration}
                    onChange={e => setFormNarration(e.target.value)}
                    placeholder="Detailed description (optional)"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Lines table */}
              <div className="border border-slate-700 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-slate-700/60 text-slate-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Account</th>
                      <th className="px-2 py-1.5 text-right" style={{ width: '120px' }}>Debit</th>
                      <th className="px-2 py-1.5 text-right" style={{ width: '120px' }}>Credit</th>
                      <th className="px-2 py-1.5 text-left">Memo</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formLines.map((ln, idx) => (
                      <tr key={idx} className="border-t border-slate-700">
                        <td className="px-1 py-1">
                          <select
                            value={ln.accountId}
                            onChange={e => updateLine(idx, { accountId: e.target.value })}
                            className={inputCls}
                          >
                            <option value="">— pick —</option>
                            {activeAccounts.map(a => (
                              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number" min="0" step="0.01"
                            value={ln.debit}
                            onChange={e => updateLine(idx, {
                              debit: e.target.value,
                              credit: parseFloat(e.target.value) > 0 ? '' : ln.credit,
                            })}
                            placeholder="0.00"
                            className={`${inputCls} text-right`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number" min="0" step="0.01"
                            value={ln.credit}
                            onChange={e => updateLine(idx, {
                              credit: e.target.value,
                              debit: parseFloat(e.target.value) > 0 ? '' : ln.debit,
                            })}
                            placeholder="0.00"
                            className={`${inputCls} text-right`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={ln.memo}
                            onChange={e => updateLine(idx, { memo: e.target.value })}
                            placeholder="Optional"
                            className={inputCls}
                          />
                        </td>
                        <td className="px-1 py-1 text-right">
                          {formLines.length > 2 && (
                            <button
                              onClick={() => setFormLines(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-rose-300"
                              title="Remove line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-2 py-1 border-t border-slate-700">
                  <button
                    onClick={() => setFormLines(prev => [...prev, newLine()])}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200"
                  >
                    <Plus className="w-3 h-3" /> Add line
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex gap-3">
                  <span className="text-slate-400">Debit: <span className="text-white font-medium">{formatCurrency(draftTotals.debit)}</span></span>
                  <span className="text-slate-400">Credit: <span className="text-white font-medium">{formatCurrency(draftTotals.credit)}</span></span>
                  <span className={`font-medium ${Math.abs(draftTotals.diff) < 0.01 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {Math.abs(draftTotals.diff) < 0.01 ? 'Balanced ✓' : `Diff: ${draftTotals.diff.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetForm}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm text-slate-200"
                  >
                    <RotateIcon className="w-4 h-4" /> Reset
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting || Math.abs(draftTotals.diff) >= 0.01}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white"
                  >
                    <Save className="w-4 h-4" /> {submitting ? 'Posting…' : 'Post Entry'}
                  </button>
                </div>
              </div>

              {formError && <p className="text-rose-400 text-xs">{formError}</p>}
            </div>
          )}
        </div>
      )}

      {/* ───────────── Filters + List ───────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value as any)}
          className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white"
        >
          <option value="">All sources</option>
          <option value="sale">Sale</option>
          <option value="return">Return</option>
          <option value="manual">Manual</option>
          <option value="payment">Payment</option>
          <option value="purchase">Purchase</option>
          <option value="opening">Opening</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <span className="text-slate-400 text-xs">From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white"/>
        </label>
        <label className="flex items-center gap-1 text-sm">
          <span className="text-slate-400 text-xs">To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white"/>
        </label>
        <button onClick={load} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">Apply</button>
        <span className="text-xs text-slate-500 ml-auto">{entries.length} entries</span>
        <button
          onClick={exportCSV}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {error && <p className="text-rose-400 text-sm mb-2">{error}</p>}

      <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/60 text-slate-300 text-xs uppercase">
            <tr>
              <th className="w-6"></th>
              <th className="px-2 py-1.5 text-left">Voucher #</th>
              <th className="px-2 py-1.5 text-left">Date</th>
              <th className="px-2 py-1.5 text-left">Memo</th>
              <th className="px-2 py-1.5 text-left">Source</th>
              <th className="px-2 py-1.5 text-right">Total</th>
              <th className="px-2 py-1.5 text-center">Status</th>
              <th className="px-2 py-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={6} cols={8} />
            ) : entries.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-6 text-slate-400">No entries.</td></tr>
            ) : entries.map(e => {
              const open = expanded === e.id;
              return (
                <>
                  <tr key={e.id} className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => setExpanded(open ? null : e.id)}>
                    <td className="px-1 py-1.5 text-slate-400">
                      {open ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs text-blue-300">{e.voucherNumber || '—'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{format(new Date(e.date), 'd MMM yyyy HH:mm')}</td>
                    <td className="px-2 py-1.5">{e.memo || '—'}</td>
                    <td className="px-2 py-1.5 text-xs text-slate-400">{SOURCE_LABEL[e.source.kind]}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(e.totalDebit)}</td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {e.reversed
                        ? <span className="text-rose-300">Reversed</span>
                        : <span className="text-emerald-300">Posted</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={ev => { ev.stopPropagation(); printEntry(e); }}
                          title="Print voucher"
                          className="p-1 text-slate-400 hover:text-blue-300"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canManage && !e.reversed && e.source.kind === 'manual' && (
                          <button
                            onClick={ev => { ev.stopPropagation(); reverse(e.id); }}
                            title="Reverse"
                            className="p-1 text-slate-400 hover:text-rose-300"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr key={e.id + '-detail'} className="bg-slate-900/40">
                      <td></td>
                      <td colSpan={7} className="px-2 py-2">
                        <table className="w-full text-xs">
                          <thead className="text-slate-400">
                            <tr>
                              <th className="text-left py-1">Account</th>
                              <th className="text-left py-1">Memo</th>
                              <th className="text-right py-1">Debit</th>
                              <th className="text-right py-1">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {e.lines.map((ln, i) => {
                              const acc = accountById.get(ln.accountId);
                              return (
                                <tr key={i}>
                                  <td className="py-0.5 text-slate-300">
                                    <span className="font-mono text-blue-300">{ln.accountCode || acc?.code || ''}</span>{' '}
                                    {ln.accountName || acc?.name || ''}
                                  </td>
                                  <td className="py-0.5 text-slate-400">{ln.memo || ''}</td>
                                  <td className="py-0.5 text-right">{ln.debit ? formatCurrency(ln.debit) : ''}</td>
                                  <td className="py-0.5 text-right">{ln.credit ? formatCurrency(ln.credit) : ''}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {e.auditLog && e.auditLog.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700">
                            <p className="text-[10px] uppercase text-slate-500 mb-1">Audit log</p>
                            <ul className="space-y-0.5 text-xs">
                              {e.auditLog.map((a, i) => (
                                <li key={i} className="text-slate-400">
                                  <span className={`font-medium ${
                                    a.action === 'reverse' ? 'text-rose-300' :
                                    a.action === 'edit' ? 'text-amber-300' : 'text-emerald-300'
                                  }`}>{a.action}</span>
                                  {' · '}
                                  {a.at ? format(new Date(a.at), 'd MMM yyyy HH:mm') : ''}
                                  {a.by?.name ? ` · by ${a.by.name}` : ''}
                                  {a.note ? ` · ${a.note}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {e.locked && (
                          <p className="mt-2 text-[11px] text-slate-500">
                            🔒 Locked at {e.lockedAt ? format(new Date(e.lockedAt), 'd MMM yyyy HH:mm') : ''} — only reversible via offsetting entry.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
