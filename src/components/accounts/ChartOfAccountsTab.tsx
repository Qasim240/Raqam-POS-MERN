import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { ChartAccount, AccountType } from '../../types';
import { accountApi } from '../../services/api';
import { Search, X, Eye, Save, RotateCcw, Printer } from 'lucide-react';
import AccountLedgerModal from './AccountLedgerModal';
import { format } from 'date-fns';

interface Draft {
  seriesCode: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string;
  controlAccount: boolean;
  allowPosting: boolean;
  openingDebit: string;
  openingCredit: string;
  openingDate: string;
  mobile: string;
  city: string;
  notes: string;
  accountRights: string;
  isActive: boolean;
}

const emptyDraft: Draft = {
  seriesCode: '',
  code: '',
  name: '',
  type: 'asset',
  parentId: '',
  controlAccount: false,
  allowPosting: true,
  openingDebit: '',
  openingCredit: '',
  openingDate: '',
  mobile: '',
  city: '',
  notes: '',
  accountRights: '',
  isActive: true,
};

const fromAccount = (a: ChartAccount): Draft => ({
  seriesCode: a.seriesCode || '',
  code: a.code,
  name: a.name,
  type: a.type,
  parentId: a.parentId || '',
  controlAccount: !!a.controlAccount,
  allowPosting: a.allowPosting !== false,
  openingDebit: a.openingDebit ? String(a.openingDebit) : '',
  openingCredit: a.openingCredit ? String(a.openingCredit) : '',
  openingDate: a.openingDate ? a.openingDate.slice(0, 10) : '',
  mobile: a.mobile || '',
  city: a.city || '',
  notes: a.notes || '',
  accountRights: a.accountRights || '',
  isActive: a.isActive,
});

const isDirty = (d: Draft, a: ChartAccount) =>
  d.seriesCode.trim() !== (a.seriesCode || '') ||
  d.code.trim() !== a.code ||
  d.name.trim() !== a.name ||
  d.type !== a.type ||
  (d.parentId || '') !== (a.parentId || '') ||
  d.controlAccount !== !!a.controlAccount ||
  d.allowPosting !== (a.allowPosting !== false) ||
  (parseFloat(d.openingDebit) || 0) !== a.openingDebit ||
  (parseFloat(d.openingCredit) || 0) !== a.openingCredit ||
  (d.openingDate || '') !== (a.openingDate ? a.openingDate.slice(0, 10) : '') ||
  d.mobile.trim() !== (a.mobile || '') ||
  d.city.trim() !== (a.city || '') ||
  d.notes !== (a.notes || '') ||
  d.accountRights.trim() !== (a.accountRights || '') ||
  d.isActive !== a.isActive;

// Common input styling — visible bordered box on dark theme.
const inputCls =
  'w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500';

// Number of empty draft rows shown for batch entry (matches Forms-style UI)
const EMPTY_ROWS = 1;
const EMPTY_KEYS = Array.from({ length: EMPTY_ROWS }, (_, i) => `new-${i}`);

export default function ChartOfAccountsTab() {
  const { accounts, refreshAccounts, hasPermission, shopSettings } = useStore();
  const canManage = hasPermission('accounts.manage');
  const canLedger = hasPermission('accounts.ledger');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | AccountType>('');

  // drafts is now keyed by account id OR by 'new-0'..'new-N'
  const initialDrafts = (): Record<string, Draft> => {
    const init: Record<string, Draft> = {};
    for (const k of EMPTY_KEYS) init[k] = { ...emptyDraft };
    return init;
  };
  const [drafts, setDrafts] = useState<Record<string, Draft>>(initialDrafts);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [ledgerForId, setLedgerForId] = useState<string | null>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // Sync drafts with accounts. Preserve any drafts the user is editing.
  useEffect(() => {
    setDrafts(prev => {
      const next: Record<string, Draft> = {};
      // Keep all empty-row drafts as-is
      for (const k of EMPTY_KEYS) next[k] = prev[k] || { ...emptyDraft };
      // Re-sync existing accounts
      for (const a of accounts) {
        const existing = prev[a.id];
        next[a.id] = existing && isDirty(existing, a) ? existing : fromAccount(a);
      }
      return next;
    });
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter(a => {
      if (typeFilter && a.type !== typeFilter) return false;
      if (q && !a.code.toLowerCase().includes(q) && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accounts, search, typeFilter]);

  // Footer totals — computed from filtered visible rows + non-empty new rows
  const totals = useMemo(() => {
    let dr = 0, cr = 0;
    for (const a of filtered) {
      dr += a.openingDebit || 0;
      cr += a.openingCredit || 0;
    }
    for (const k of EMPTY_KEYS) {
      const d = drafts[k];
      if (!d) continue;
      dr += parseFloat(d.openingDebit) || 0;
      cr += parseFloat(d.openingCredit) || 0;
    }
    return { dr, cr };
  }, [filtered, drafts]);

  // Main / Head Title + Control Head — derived from focused row's parent chain
  const headerInfo = useMemo(() => {
    const id = focusedRowId;
    if (!id) return { mainHead: '', controlHead: '' };
    const draft = drafts[id];
    if (!draft) return { mainHead: '', controlHead: '' };
    if (!draft.parentId) {
      // The account itself is at root; main head is itself
      return {
        mainHead: draft.name || (id.startsWith('new-') ? '(new account)' : ''),
        controlHead: '',
      };
    }
    const parent = accountById.get(draft.parentId);
    if (!parent) return { mainHead: '', controlHead: '' };
    // Walk to root
    let cursor: ChartAccount | undefined = parent;
    let root: ChartAccount = parent;
    while (cursor && cursor.parentId) {
      const next = accountById.get(cursor.parentId);
      if (!next) break;
      root = next;
      cursor = next;
    }
    return {
      mainHead: `${root.code} — ${root.name}`,
      controlHead: `${parent.code} — ${parent.name}`,
    };
  }, [focusedRowId, drafts, accountById]);

  const setCell = (id: string, key: keyof Draft, value: string | boolean) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } as Draft }));
    setErrorById(prev => {
      if (!prev[id]) return prev;
      const c = { ...prev };
      delete c[id];
      return c;
    });
  };

  const buildPayload = (d: Draft) => ({
    seriesCode: d.seriesCode.trim(),
    code: d.code.trim(),
    name: d.name.trim(),
    type: d.type,
    parentId: d.parentId || null,
    controlAccount: d.controlAccount,
    allowPosting: d.controlAccount ? false : d.allowPosting,
    openingDebit: parseFloat(d.openingDebit) || 0,
    openingCredit: parseFloat(d.openingCredit) || 0,
    openingDate: d.openingDate ? new Date(d.openingDate).toISOString() : null,
    mobile: d.mobile.trim(),
    city: d.city.trim(),
    notes: d.notes,
    accountRights: d.accountRights.trim(),
    isActive: d.isActive,
  });

  const saveRow = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;

    if (!draft.code.trim() || !draft.name.trim()) {
      setErrorById(prev => ({ ...prev, [id]: 'Code and name are required' }));
      return;
    }

    setSavingId(id);
    try {
      if (id.startsWith('new-')) {
        await accountApi.create(buildPayload(draft));
        // Reset just this empty row
        setDrafts(prev => ({ ...prev, [id]: { ...emptyDraft } }));
      } else {
        await accountApi.update(id, buildPayload(draft));
      }
      setErrorById(prev => {
        if (!prev[id]) return prev;
        const c = { ...prev };
        delete c[id];
        return c;
      });
      await refreshAccounts();
    } catch (err: any) {
      setErrorById(prev => ({ ...prev, [id]: err?.message || 'Save failed' }));
    } finally {
      setSavingId(null);
    }
  };

  const resetRow = (id: string) => {
    if (id.startsWith('new-')) {
      setDrafts(prev => ({ ...prev, [id]: { ...emptyDraft } }));
    } else {
      const a = accounts.find(x => x.id === id);
      if (a) setDrafts(prev => ({ ...prev, [id]: fromAccount(a) }));
    }
    setErrorById(prev => {
      if (!prev[id]) return prev;
      const c = { ...prev };
      delete c[id];
      return c;
    });
  };

  const onEnter = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRow(id);
    }
  };

  const printChart = () => {
    const rows = filtered;
    if (rows.length === 0) return;
    const escape = (s: string) =>
      String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    const fmt = (n: number) =>
      n ? Number(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    const html = `<!DOCTYPE html>
<html><head><meta charset=utf-8>
<title>Chart of Accounts — ${escape(shopSettings.shopName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; padding: 16px; color: #111; }
  h1 { margin: 0 0 4px 0; font-size: 18px; }
  h2 { margin: 0; font-size: 12px; color: #555; font-weight: 400; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-weight: 600; font-size: 10px; text-transform: uppercase; }
  .r { text-align: right; }
  tr.total td { border-top: 2px solid #000; border-bottom: none; padding-top: 6px; font-weight: bold; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class=header>
  <h1>${escape(shopSettings.shopName)}</h1>
  ${shopSettings.shopAddress ? `<h2>${escape(shopSettings.shopAddress)}</h2>` : ''}
  <div style="margin-top:6px; font-size:14px; font-weight:600;">Chart of Accounts</div>
  <div style="font-size:10px; color:#888;">${format(new Date(), 'd MMM yyyy HH:mm')}</div>
</div>
<table>
<thead><tr>
  <th>S. Code</th><th>A/C Code</th><th>Account Description</th><th>Type</th>
  <th>Parent</th><th>City</th><th>Mobile</th>
  <th>Open. Date</th>
  <th class=r>Open. Debit</th><th class=r>Open. Credit</th>
  <th class=r>Balance</th>
  <th>Allow</th>
</tr></thead>
<tbody>
${rows.map(a => {
  const parent = a.parentId ? accountById.get(a.parentId) : null;
  return `<tr>
    <td>${escape(a.seriesCode || '')}</td>
    <td>${escape(a.code)}</td>
    <td>${escape(a.name)}</td>
    <td>${escape(a.type)}</td>
    <td>${parent ? escape(parent.code + ' — ' + parent.name) : ''}</td>
    <td>${escape(a.city || '')}</td>
    <td>${escape(a.mobile || '')}</td>
    <td>${a.openingDate ? format(new Date(a.openingDate), 'd MMM yyyy') : ''}</td>
    <td class=r>${fmt(a.openingDebit)}</td>
    <td class=r>${fmt(a.openingCredit)}</td>
    <td class=r>${fmt(a.currentBalance ?? 0)}</td>
    <td>${a.controlAccount ? 'Control' : (a.allowPosting !== false ? 'Yes' : 'No')}</td>
  </tr>`;
}).join('')}
<tr class=total>
  <td colspan=8 class=r>Totals</td>
  <td class=r>${fmt(totals.dr)}</td>
  <td class=r>${fmt(totals.cr)}</td>
  <td colspan=2></td>
</tr>
</tbody></table>
<script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 400); };</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=1100,height=900');
    if (!w) { alert('Pop-up blocked. Please allow pop-ups to print.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const renderRow = (id: string, account: ChartAccount | null, rowNumber: number) => {
    const draft = drafts[id] || (account ? fromAccount(account) : { ...emptyDraft });
    const dirty = account ? isDirty(draft, account) : (draft.code.trim() !== '' || draft.name.trim() !== '');
    const isNew = id.startsWith('new-');
    const isSaving = savingId === id;
    const disabled = !canManage || isSaving;
    const dr = parseFloat(draft.openingDebit) || 0;
    const cr = parseFloat(draft.openingCredit) || 0;

    const onFocus = () => setFocusedRowId(id);

    return (
      <tr
        key={id}
        className={`${isNew ? 'bg-slate-900/40' : 'hover:bg-slate-800/40'} ${isSaving ? 'opacity-60' : ''} ${focusedRowId === id ? 'bg-slate-700/30' : ''}`}
        onFocus={onFocus}
      >
        <td className="px-1 py-1.5 text-[10px] text-slate-500 text-center align-middle border-r border-slate-700" style={{ width: '32px' }}>
          {rowNumber}
        </td>
        <td className="px-1 py-1.5">
          <input
            value={draft.seriesCode}
            onChange={e => setCell(id, 'seriesCode', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            placeholder=""
            className={`${inputCls} font-mono`}
          />
        </td>
        <td className="px-1 py-1.5">
          <input
            value={draft.code}
            onChange={e => setCell(id, 'code', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            placeholder={isNew ? 'Code' : ''}
            className={`${inputCls} font-mono text-blue-300`}
          />
        </td>
        <td className="px-1 py-1.5">
          <input
            value={draft.name}
            onChange={e => setCell(id, 'name', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            placeholder={isNew ? 'Account name' : ''}
            className={inputCls}
          />
        </td>
        <td className="px-1 py-1.5">
          <select
            value={draft.type}
            onChange={e => setCell(id, 'type', e.target.value as AccountType)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            className={inputCls}
          >
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
            <option value="equity">Equity</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="customer">Customer</option>
            <option value="supplier">Supplier</option>
          </select>
        </td>
        <td className="px-1 py-1.5">
          <select
            value={draft.parentId}
            onChange={e => setCell(id, 'parentId', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            className={inputCls}
          >
            <option value="">— None —</option>
            {accounts.filter(a => a.id !== id && a.isActive).map(a => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </td>
        <td className="px-1 py-1.5">
          <input
            value={draft.city}
            onChange={e => setCell(id, 'city', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            placeholder=""
            className={inputCls}
          />
        </td>
        <td className="px-1 py-1.5">
          <input
            type="date"
            value={draft.openingDate}
            onChange={e => setCell(id, 'openingDate', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            className={inputCls}
          />
        </td>
        <td className="px-1 py-1.5">
          <input
            type="number" min="0" step="0.01"
            value={draft.openingDebit}
            onChange={e => setCell(id, 'openingDebit', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled || cr > 0}
            placeholder="0.00"
            className={`${inputCls} text-right ${cr > 0 ? 'opacity-50' : ''}`}
          />
        </td>
        <td className="px-1 py-1.5">
          <input
            type="number" min="0" step="0.01"
            value={draft.openingCredit}
            onChange={e => setCell(id, 'openingCredit', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled || dr > 0}
            placeholder="0.00"
            className={`${inputCls} text-right ${dr > 0 ? 'opacity-50' : ''}`}
          />
        </td>
        <td className="px-1 py-1.5">
          <input
            value={draft.mobile}
            onChange={e => setCell(id, 'mobile', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            placeholder=""
            className={inputCls}
          />
        </td>
        <td className="px-1 py-1.5">
          <select
            value={draft.controlAccount ? 'control' : (draft.allowPosting ? 'yes' : 'no')}
            onChange={e => {
              const v = e.target.value;
              if (v === 'control') {
                setCell(id, 'controlAccount', true);
                setCell(id, 'allowPosting', false);
              } else if (v === 'no') {
                setCell(id, 'controlAccount', false);
                setCell(id, 'allowPosting', false);
              } else {
                setCell(id, 'controlAccount', false);
                setCell(id, 'allowPosting', true);
              }
            }}
            disabled={disabled}
            className={inputCls}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="control">Control</option>
          </select>
        </td>
        <td className="px-1 py-1.5">
          <input
            value={draft.accountRights}
            onChange={e => setCell(id, 'accountRights', e.target.value)}
            onKeyDown={e => onEnter(e, id)}
            disabled={disabled}
            placeholder=""
            className={inputCls}
          />
        </td>
        <td className="px-1 py-1.5 text-right text-xs text-slate-300 whitespace-nowrap" style={{ width: '120px' }}>
          {!isNew && account?.currentBalance !== undefined ? formatCurrency(account.currentBalance) : ''}
        </td>
        <td className="px-1 py-1.5 text-center" style={{ width: '50px' }}>
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={e => setCell(id, 'isActive', e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 accent-blue-500"
          />
        </td>
        <td className="px-1 py-1.5" style={{ width: '180px' }}>
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            {dirty && canManage && (
              <>
                <button
                  onClick={() => saveRow(id)}
                  disabled={isSaving}
                  title="Save (Enter)"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs font-medium text-white"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  onClick={() => resetRow(id)}
                  disabled={isSaving}
                  title="Reset"
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {!isNew && canLedger && (
              <button
                onClick={() => setLedgerForId(id)}
                title="View ledger"
                className="p-1 text-slate-400 hover:text-blue-300"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {!isNew && account?.isSystem && (
              <span className="text-[10px] px-1 rounded bg-slate-700 text-slate-400">SYS</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search code or name…"
            className="w-full pl-8 pr-8 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-1 top-1.5 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All types</option>
          <option value="asset">Assets</option>
          <option value="liability">Liabilities</option>
          <option value="equity">Equity</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="customer">Customers</option>
          <option value="supplier">Suppliers</option>
        </select>
        <button
          onClick={printChart}
          disabled={filtered.length === 0}
          title="Print chart of accounts"
          className="inline-flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm"
        >
          <Printer className="w-4 h-4" /> Print Chart
        </button>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} of {accounts.length}</span>
      </div>

      {/* Grid */}
      <div className="bg-slate-800 border border-slate-700 rounded overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '1700px' }}>
          <thead className="bg-slate-700/60 text-slate-300 text-[11px] uppercase">
            <tr>
              <th className="px-1 py-1.5 text-center" style={{ width: '32px' }}>#</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '90px' }}>S. Code</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '110px' }}>A/C Code</th>
              <th className="px-1 py-1.5 text-left" style={{ minWidth: '200px' }}>Account Description</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '120px' }}>Type</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '180px' }}>Parent</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '120px' }}>City</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '130px' }}>Open. Date</th>
              <th className="px-1 py-1.5 text-right" style={{ width: '120px' }}>Open. Debit</th>
              <th className="px-1 py-1.5 text-right" style={{ width: '120px' }}>Open. Credit</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '130px' }}>Mobile</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '110px' }}>Allow</th>
              <th className="px-1 py-1.5 text-left" style={{ width: '130px' }}>Account Rights</th>
              <th className="px-1 py-1.5 text-right" style={{ width: '120px' }}>Balance</th>
              <th className="px-1 py-1.5 text-center" style={{ width: '50px' }}>Active</th>
              <th className="px-1 py-1.5 text-right" style={{ width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => renderRow(a.id, a, idx + 1))}
            {canManage && filtered.length > 0 && (
              <tr><td colSpan={16} className="border-t border-slate-600/60"></td></tr>
            )}
            {canManage && EMPTY_KEYS.map((k, idx) =>
              renderRow(k, null, filtered.length + idx + 1),
            )}
            {filtered.length === 0 && !canManage && (
              <tr>
                <td colSpan={16} className="text-center py-6 text-slate-400 text-sm">No accounts.</td>
              </tr>
            )}
          </tbody>
          {/* Totals footer */}
          <tfoot className="bg-slate-700/40 font-medium">
            <tr>
              <td colSpan={8} className="px-2 py-2 text-right text-slate-300 text-xs uppercase">Totals</td>
              <td className="px-2 py-2 text-right text-emerald-300">{formatCurrency(totals.dr)}</td>
              <td className="px-2 py-2 text-right text-rose-300">{formatCurrency(totals.cr)}</td>
              <td colSpan={6}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Main / Head Title + Control Head footer */}
      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-800 border border-slate-700 rounded p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-28">Main / Head Title:</span>
          <span className="flex-1 px-2 py-1 bg-slate-700/40 rounded text-white truncate">
            {headerInfo.mainHead || <span className="text-slate-500">— select a row —</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-28">Control Head:</span>
          <span className="flex-1 px-2 py-1 bg-slate-700/40 rounded text-white truncate">
            {headerInfo.controlHead || <span className="text-slate-500">—</span>}
          </span>
        </div>
      </div>

      {/* Errors */}
      {Object.entries(errorById).length > 0 && (
        <div className="mt-2 space-y-0.5">
          {Object.entries(errorById).map(([id, msg]) => (
            <div key={id} className="text-xs text-rose-400">
              {id.startsWith('new-')
                ? `New row #${parseInt(id.replace('new-', ''), 10) + 1}`
                : (accounts.find(a => a.id === id)?.code || id)}
              : {msg}
            </div>
          ))}
        </div>
      )}

      {ledgerForId && (
        <AccountLedgerModal accountId={ledgerForId} onClose={() => setLedgerForId(null)} />
      )}
    </div>
  );
}
