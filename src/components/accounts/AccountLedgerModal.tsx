import { useEffect, useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { accountApi } from '../../services/api';
import { AccountLedger } from '../../types';
import { X, RotateCcw, Download } from 'lucide-react';
import { format } from 'date-fns';
import { downloadCSV } from '../../utils/csv';
import { Skeleton, SkeletonLines } from '../ui/Skeleton';

interface Props {
  accountId: string;
  onClose: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  sale: 'Sale',
  return: 'Return',
  manual: 'Manual',
  opening: 'Opening',
};

export default function AccountLedgerModal({ accountId, onClose }: Props) {
  const { shopSettings } = useStore();
  const [data, setData] = useState<AccountLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const ledger = await accountApi.getLedger(accountId, { from, to });
      setData(ledger);
    } catch (err: any) {
      setError(err?.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [accountId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div>
            <h3 className="font-bold text-lg">
              {data ? `${data.account.code} ${data.account.name}` : 'Loading…'}
            </h3>
            {data && (
              <p className="text-xs text-slate-400 capitalize">{data.account.type}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">From</span>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">To</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </label>
          <button
            onClick={load}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium"
          >
            <RotateCcw className="w-3 h-3" /> Reload
          </button>
          <button
            onClick={() => {
              if (!data) return;
              const rows: (string | number)[][] = [
                ['Date', 'Memo', 'Source', 'Debit', 'Credit', 'Balance'],
                ['Opening', '', '', '', '', data.opening],
                ...data.lines.map(ln => [
                  format(new Date(ln.date), 'yyyy-MM-dd HH:mm'),
                  ln.memo || '',
                  SOURCE_LABEL[ln.source.kind] || ln.source.kind,
                  ln.debit || 0,
                  ln.credit || 0,
                  ln.balance,
                ]),
                ['Closing', '', '', data.totalDebit, data.totalCredit, data.closing],
              ];
              downloadCSV(`ledger-${data.account.code}-${from}_to_${to}.csv`, rows);
            }}
            disabled={!data || loading}
            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-xs"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>

        <div className="p-4">
          {loading && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <SkeletonLines lines={6} />
            </div>
          )}
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          {data && !loading && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="bg-slate-700/40 rounded p-2">
                  <p className="text-slate-400">Opening</p>
                  <p className="font-bold">{formatCurrency(data.opening)}</p>
                </div>
                <div className="bg-slate-700/40 rounded p-2">
                  <p className="text-slate-400">Period Dr / Cr</p>
                  <p className="font-bold text-blue-300">
                    {formatCurrency(data.totalDebit)} / {formatCurrency(data.totalCredit)}
                  </p>
                </div>
                <div className="bg-slate-700/40 rounded p-2">
                  <p className="text-slate-400">Closing</p>
                  <p className="font-bold text-emerald-300">{formatCurrency(data.closing)}</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-700 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/60 text-slate-300 text-xs uppercase">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Date</th>
                      <th className="px-2 py-1.5 text-left">Memo</th>
                      <th className="px-2 py-1.5 text-left">Source</th>
                      <th className="px-2 py-1.5 text-right">Debit</th>
                      <th className="px-2 py-1.5 text-right">Credit</th>
                      <th className="px-2 py-1.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-slate-400">No entries in range.</td></tr>
                    ) : data.lines.map(ln => (
                      <tr key={ln.entryId + ln.date} className="border-t border-slate-700">
                        <td className="px-2 py-1.5 whitespace-nowrap">{format(new Date(ln.date), 'd MMM yyyy')}</td>
                        <td className="px-2 py-1.5">{ln.memo || '—'}</td>
                        <td className="px-2 py-1.5 text-xs text-slate-400">{SOURCE_LABEL[ln.source.kind] || ln.source.kind}</td>
                        <td className="px-2 py-1.5 text-right">{ln.debit ? formatCurrency(ln.debit) : ''}</td>
                        <td className="px-2 py-1.5 text-right">{ln.credit ? formatCurrency(ln.credit) : ''}</td>
                        <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(ln.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
