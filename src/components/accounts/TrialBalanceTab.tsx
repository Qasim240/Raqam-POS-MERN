import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { accountApi } from '../../services/api';
import { TrialBalance, AccountType } from '../../types';
import { Check, X as XIcon, Download } from 'lucide-react';
import { downloadCSV } from '../../utils/csv';
import { SkeletonLines } from '../ui/Skeleton';

const TYPE_GROUPS: { key: AccountType; label: string }[] = [
  { key: 'asset', label: 'Assets' },
  { key: 'liability', label: 'Liabilities' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expense' },
];

export default function TrialBalanceTab() {
  const { shopSettings } = useStore();
  const [data, setData] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const tb = await accountApi.getTrialBalance(asOf ? new Date(asOf).toISOString() : undefined);
      setData(tb);
    } catch (err: any) {
      setError(err?.message || 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const groupedRows = useMemo(() => {
    if (!data) return TYPE_GROUPS.map(g => ({ ...g, rows: [], debitSum: 0, creditSum: 0 }));
    return TYPE_GROUPS.map(g => {
      const rows = data.rows.filter(r => r.account.type === g.key);
      return {
        ...g,
        rows,
        debitSum: rows.reduce((s, r) => s + r.debit, 0),
        creditSum: rows.reduce((s, r) => s + r.credit, 0),
      };
    });
  }, [data]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <label className="flex items-center gap-1 text-sm">
          <span className="text-slate-400 text-xs">As of</span>
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white"/>
        </label>
        <button onClick={load} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">Apply</button>
        {data && (
          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
            data.totals.balanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            {data.totals.balanced ? <Check className="w-3 h-3"/> : <XIcon className="w-3 h-3"/>}
            {data.totals.balanced ? 'Books balanced' : 'Out of balance'}
          </span>
        )}
        <button
          onClick={() => {
            if (!data) return;
            const rows: (string | number)[][] = [
              ['Code', 'Account', 'Type', 'Debit', 'Credit'],
              ...data.rows.map(r => [
                r.account.code,
                r.account.name,
                r.account.type,
                r.debit || 0,
                r.credit || 0,
              ]),
              ['', '', 'TOTAL', data.totals.debit, data.totals.credit],
            ];
            downloadCSV(`trial-balance-${asOf || 'current'}.csv`, rows);
          }}
          disabled={!data || loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {loading && (
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <SkeletonLines lines={8} />
        </div>
      )}
      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {data && !loading && (
        <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/60 text-slate-300 text-xs uppercase">
              <tr>
                <th className="px-2 py-1.5 text-left">Code</th>
                <th className="px-2 py-1.5 text-left">Account</th>
                <th className="px-2 py-1.5 text-right">Debit</th>
                <th className="px-2 py-1.5 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(g => (
                <>
                  <tr key={`h-${g.key}`} className="bg-slate-700/30">
                    <td colSpan={4} className="px-2 py-1.5 text-xs uppercase font-bold text-slate-300">{g.label}</td>
                  </tr>
                  {g.rows.length === 0 ? (
                    <tr key={`e-${g.key}`}><td colSpan={4} className="px-2 py-1.5 text-xs text-slate-500 italic">— no accounts —</td></tr>
                  ) : g.rows.map(r => (
                    <tr key={r.account.id} className="border-t border-slate-700">
                      <td className="px-2 py-1 font-mono text-blue-300">{r.account.code}</td>
                      <td className="px-2 py-1">{r.account.name}</td>
                      <td className="px-2 py-1 text-right">{r.debit ? formatCurrency(r.debit) : ''}</td>
                      <td className="px-2 py-1 text-right">{r.credit ? formatCurrency(r.credit) : ''}</td>
                    </tr>
                  ))}
                  <tr key={`s-${g.key}`} className="border-t border-slate-700 bg-slate-700/20 font-medium">
                    <td colSpan={2} className="px-2 py-1 text-xs text-slate-400 text-right">{g.label} subtotal</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(g.debitSum)}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(g.creditSum)}</td>
                  </tr>
                </>
              ))}
              <tr className="border-t-2 border-slate-500 bg-slate-700/40 font-bold">
                <td colSpan={2} className="px-2 py-2 text-right">TOTAL</td>
                <td className="px-2 py-2 text-right">{formatCurrency(data.totals.debit)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(data.totals.credit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
