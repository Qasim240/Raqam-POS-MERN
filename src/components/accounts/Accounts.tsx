import { useEffect, useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { BookOpen, AlertTriangle } from 'lucide-react';
import ChartOfAccountsTab from './ChartOfAccountsTab';
import JournalEntriesTab from './JournalEntriesTab';
import TrialBalanceTab from './TrialBalanceTab';
import PaymentsTab from './PaymentsTab';
import DayEndTab from './DayEndTab';

type Tab = 'chart' | 'payments' | 'dayend' | 'journal' | 'trial';

export default function Accounts() {
  const { hasPermission, selectedPartyAccountId } = useStore();
  const [tab, setTab] = useState<Tab>('chart');

  // If a customer was deep-linked here for payment, jump straight to Payments tab
  useEffect(() => {
    if (selectedPartyAccountId) setTab('payments');
  }, [selectedPartyAccountId]);

  if (!hasPermission('accounts.view')) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <p className="text-slate-300">You don't have permission to view accounts.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; gate?: string }[] = [
    { id: 'chart', label: 'Chart of Accounts' },
    { id: 'payments', label: 'Payments', gate: 'payments.view' },
    { id: 'dayend', label: 'Day End', gate: 'accounts.ledger' },
    { id: 'journal', label: 'Journal' },
    { id: 'trial', label: 'Trial Balance', gate: 'accounts.ledger' },
  ];

  const visible = tabs.filter(t => !t.gate || hasPermission(t.gate));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold">Accounts</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-700 mb-3">
        {visible.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'chart' && <ChartOfAccountsTab />}
      {tab === 'payments' && hasPermission('payments.view') && <PaymentsTab />}
      {tab === 'dayend' && hasPermission('accounts.ledger') && <DayEndTab />}
      {tab === 'journal' && <JournalEntriesTab />}
      {tab === 'trial' && hasPermission('accounts.ledger') && <TrialBalanceTab />}
    </div>
  );
}
