import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'sonner';
import { useStore } from '../../contexts/StoreContext';
import { accountApi, paymentVoucherApi } from '../../services/api';
import { OutstandingPartyRow, PaymentVoucher, PaymentMethodKind } from '../../types';
import { format } from 'date-fns';
import { Save, RotateCcw, X, Search, Printer, UserPlus } from 'lucide-react';
import { printVoucher } from '../../utils/printVoucher';
import { Skeleton, SkeletonTableRows } from '../ui/Skeleton';

const baseInput =
  'w-full px-2 py-1.5 bg-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none border';
// Field className that turns the border red on error.
const fieldCls = (hasError?: boolean) =>
  `${baseInput} ${hasError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-600 focus:border-blue-500'}`;

const ErrorText = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-rose-400 text-[11px] mt-0.5">{msg}</p> : null;

// ── Validation schema ──────────────────────────────────
const schema = yup.object({
  partyAccountId: yup.string().required('Select a customer'),
  method: yup.mixed<PaymentMethodKind>().oneOf(['cash', 'bank']).required(),
  methodAccountId: yup.string().required('Select where the money lands'),
  bankName: yup.string().default(''),
  amount: yup
    .number()
    .typeError('Enter a valid amount')
    .positive('Amount must be greater than 0')
    .required('Amount is required'),
  date: yup.string().required('Date is required'),
  notes: yup.string().default(''),
});

type ReceiveForm = yup.InferType<typeof schema>;

const ADD_BANK = '__ADD_BANK__';

export default function PaymentsTab() {
  const {
    accounts,
    refreshAccounts,
    hasPermission,
    shopSettings,
    selectedPartyAccountId,
    setSelectedPartyAccountId,
  } = useStore();
  const canCreate = hasPermission('payments.create');
  const canCancel = hasPermission('payments.cancel');

  const [outstanding, setOutstanding] = useState<OutstandingPartyRow[]>([]);
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer search is UI-only state; the selected id lives in the form.
  const [partySearch, setPartySearch] = useState('');
  const [addingBank, setAddingBank] = useState(false);

  // Quick-add customer state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickPhone, setQuickPhone] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickOpening, setQuickOpening] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const today = () => new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveForm>({
    resolver: yupResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      partyAccountId: '',
      method: 'cash',
      methodAccountId: '',
      bankName: '',
      amount: undefined as unknown as number,
      date: today(),
      notes: '',
    },
  });

  const method = watch('method');
  const partyAccountId = watch('partyAccountId');
  const bankNameValue = watch('bankName') || '';

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const customerAccounts = useMemo(
    () => accounts.filter(a => a.type === 'customer' && a.isActive),
    [accounts],
  );
  const cashAccounts = useMemo(
    () => accounts.filter(a => a.isActive && a.allowPosting !== false && !a.controlAccount && (a.type === 'cash' || a.type === 'asset')),
    [accounts],
  );
  const bankAccounts = useMemo(
    () => accounts.filter(a => a.isActive && a.allowPosting !== false && !a.controlAccount && (a.type === 'bank' || a.type === 'asset')),
    [accounts],
  );

  // Known bank names: bank-type account names + any used on past vouchers.
  const knownBankNames = useMemo(() => {
    const set = new Set<string>();
    accounts.filter(a => a.type === 'bank').forEach(a => set.add(a.name));
    vouchers.forEach(v => { if (v.bankName) set.add(v.bankName); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [accounts, vouchers]);

  const filteredCustomers = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return customerAccounts;
    return customerAccounts.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.mobile || '').toLowerCase().includes(q),
    );
  }, [customerAccounts, partySearch]);

  // Load outstanding + recent vouchers
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [outRows, vList] = await Promise.all([
        accountApi.getOutstandingParties('customer'),
        paymentVoucherApi.getAll({ direction: 'received', limit: 100 }),
      ]);
      setOutstanding(outRows);
      setVouchers(vList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  // Pre-fill when deep-linked from Customers page
  useEffect(() => {
    if (selectedPartyAccountId) {
      const acc = accounts.find(a => a.id === selectedPartyAccountId);
      setValue('partyAccountId', selectedPartyAccountId, { shouldValidate: true });
      if (acc) setPartySearch(`${acc.code} — ${acc.name}`);
      const row = outstanding.find(r => r.account.id === selectedPartyAccountId);
      if (row && row.balance > 0) setValue('amount', row.balance, { shouldValidate: true });
      setSelectedPartyAccountId(null);
    }
    // eslint-disable-next-line
  }, [selectedPartyAccountId, outstanding]);

  // Auto-pick a sensible method account when the method or account list changes.
  useEffect(() => {
    const list = method === 'cash' ? cashAccounts : bankAccounts;
    const current = getValues('methodAccountId');
    if (!list.find(a => a.id === current)) {
      setValue('methodAccountId', list[0]?.id || '');
    }
    if (method !== 'bank') {
      setValue('bankName', '');
      setAddingBank(false);
    }
    // eslint-disable-next-line
  }, [method, cashAccounts.length, bankAccounts.length]);

  const resetForm = () => {
    reset({
      partyAccountId: '',
      method: 'cash',
      methodAccountId: '',
      bankName: '',
      amount: undefined as unknown as number,
      date: today(),
      notes: '',
    });
    setPartySearch('');
    setAddingBank(false);
  };

  const onSubmit = async (data: ReceiveForm) => {
    try {
      const v = await paymentVoucherApi.create({
        date: data.date ? new Date(data.date).toISOString() : undefined,
        direction: 'received',
        partyAccountId: data.partyAccountId,
        method: data.method,
        methodAccountId: data.methodAccountId,
        bankName: data.method === 'bank' ? (data.bankName || '').trim() : undefined,
        amount: data.amount,
        notes: data.notes || '',
      });
      toast.success(`Payment received${v.voucherNumber ? ` · ${v.voucherNumber}` : ''}`);
      resetForm();
      await Promise.all([load(), refreshAccounts()]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to receive payment');
    }
  };

  const cancelVoucher = async (id: string) => {
    if (!confirm('Cancel this payment? An offsetting entry will be posted.')) return;
    try {
      await paymentVoucherApi.cancel(id);
      toast.success('Payment cancelled');
      await Promise.all([load(), refreshAccounts()]);
    } catch (err: any) {
      toast.error(err?.message || 'Cancel failed');
    }
  };

  const submitQuickAdd = async () => {
    setQuickError(null);
    if (!quickName.trim()) {
      setQuickError('Name is required');
      return;
    }
    setQuickSubmitting(true);
    try {
      const newCust = await accountApi.quickAddCustomer({
        phone: quickPhone.trim() || undefined,
        name: quickName.trim(),
        openingDebit: parseFloat(quickOpening) || 0,
      });
      await refreshAccounts();
      setValue('partyAccountId', newCust.id, { shouldValidate: true });
      setPartySearch(`${newCust.code} — ${newCust.name}`);
      if (parseFloat(quickOpening) > 0 && !getValues('amount')) {
        setValue('amount', parseFloat(quickOpening), { shouldValidate: true });
      }
      setQuickAddOpen(false);
      setQuickPhone('');
      setQuickName('');
      setQuickOpening('');
      toast.success(`Customer added · ${newCust.name}`);
      await load();
    } catch (err: any) {
      setQuickError(err?.message || 'Failed to add customer');
      toast.error(err?.message || 'Failed to add customer');
    } finally {
      setQuickSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Receive Payment form */}
      {canCreate && (
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Receive Payment</h3>

          {/* Quick-add customer panel */}
          {quickAddOpen && (
            <div className="mb-3 bg-slate-900/40 border border-blue-500/30 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-300 inline-flex items-center gap-1">
                  <UserPlus className="w-4 h-4" /> Add New Customer
                </h4>
                <button
                  onClick={() => { setQuickAddOpen(false); setQuickError(null); }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name *</label>
                  <input
                    autoFocus
                    value={quickName}
                    onChange={e => setQuickName(e.target.value)}
                    placeholder="e.g. Ali Fabrics"
                    className={fieldCls(!!quickError && !quickName.trim())}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone</label>
                  <input
                    value={quickPhone}
                    onChange={e => setQuickPhone(e.target.value)}
                    placeholder="Optional"
                    className={fieldCls()}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Opening balance owed</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={quickOpening}
                    onChange={e => setQuickOpening(e.target.value)}
                    placeholder="0.00"
                    className={`${fieldCls()} text-right`}
                  />
                </div>
              </div>
              {quickError && <p className="text-rose-400 text-xs mt-2">{quickError}</p>}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setQuickAddOpen(false); setQuickError(null); }}
                  disabled={quickSubmitting}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={submitQuickAdd}
                  disabled={quickSubmitting || !quickName.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white"
                >
                  <Save className="w-4 h-4" /> {quickSubmitting ? 'Adding…' : 'Add Customer'}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start">
              {/* Customer */}
              <div className="md:col-span-2 relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-slate-400">Customer</label>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddOpen(true);
                      setQuickPhone(partySearch.match(/^\d+$/) ? partySearch : '');
                      setQuickName(partySearch.match(/^\d+$/) ? '' : partySearch);
                      setQuickError(null);
                    }}
                    className="inline-flex items-center gap-0.5 text-[11px] text-blue-400 hover:text-blue-300"
                  >
                    <UserPlus className="w-3 h-3" /> Add new
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={partySearch}
                    onChange={e => { setPartySearch(e.target.value); setValue('partyAccountId', '', { shouldValidate: true }); }}
                    placeholder="Search customer…"
                    className={`${fieldCls(!!errors.partyAccountId)} pl-8`}
                  />
                </div>
                <ErrorText msg={errors.partyAccountId?.message} />
                {partySearch && !partyAccountId && (
                  <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-2 py-1.5">
                        <div className="text-xs text-slate-400 mb-1">No matches</div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddOpen(true);
                            setQuickPhone(partySearch.match(/^\d+$/) ? partySearch : '');
                            setQuickName(partySearch.match(/^\d+$/) ? '' : partySearch);
                            setQuickError(null);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                        >
                          <UserPlus className="w-3 h-3" /> Add "{partySearch}" as new customer
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.slice(0, 12).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setValue('partyAccountId', c.id, { shouldValidate: true });
                            setPartySearch(`${c.code} — ${c.name}`);
                          }}
                          className="w-full text-left px-2 py-1.5 hover:bg-slate-700 text-sm text-white"
                        >
                          <span className="font-mono text-blue-300">{c.code}</span> {c.name}
                          {c.mobile && <span className="text-xs text-slate-400 ml-2">{c.mobile}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Method */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Method</label>
                <select {...register('method')} className={fieldCls(!!errors.method)}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank / Card</option>
                </select>
                <ErrorText msg={errors.method?.message} />
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Account</label>
                <select {...register('methodAccountId')} className={fieldCls(!!errors.methodAccountId)}>
                  <option value="">— pick —</option>
                  {(method === 'cash' ? cashAccounts : bankAccounts).map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <ErrorText msg={errors.methodAccountId?.message} />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount</label>
                <input
                  type="number" min="0" step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  placeholder="0.00"
                  className={`${fieldCls(!!errors.amount)} text-right`}
                />
                <ErrorText msg={errors.amount?.message} />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <input type="date" {...register('date')} className={fieldCls(!!errors.date)} />
                <ErrorText msg={errors.date?.message} />
              </div>
            </div>

            {/* Bank name (only when method = bank) */}
            {method === 'bank' && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mt-2 items-start">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">
                    Bank Name <span className="text-slate-500">(optional)</span>
                  </label>
                  {addingBank ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={bankNameValue}
                        onChange={e => setValue('bankName', e.target.value)}
                        placeholder="Type bank name (e.g. HBL)"
                        className={fieldCls()}
                      />
                      <button
                        type="button"
                        onClick={() => { setAddingBank(false); setValue('bankName', ''); }}
                        title="Back to list"
                        className="px-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={knownBankNames.includes(bankNameValue) ? bankNameValue : ''}
                      onChange={e => {
                        if (e.target.value === ADD_BANK) {
                          setAddingBank(true);
                          setValue('bankName', '');
                        } else {
                          setValue('bankName', e.target.value);
                        }
                      }}
                      className={fieldCls()}
                    >
                      <option value="">— none —</option>
                      {knownBankNames.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                      <option value={ADD_BANK}>+ Add new bank…</option>
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Notes + actions */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mt-2 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <input {...register('notes')} placeholder="Optional" className={fieldCls()} />
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Saving…' : 'Receive'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Outstanding customers */}
        <div className="bg-slate-800 border border-slate-700 rounded">
          <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Customers with Balance</h3>
            <span className="text-xs text-slate-500">{outstanding.length}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : outstanding.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No outstanding balances.</p>
            ) : (
              outstanding.map(row => (
                <button
                  key={row.account.id}
                  onClick={() => {
                    setValue('partyAccountId', row.account.id, { shouldValidate: true });
                    setPartySearch(`${row.account.code} — ${row.account.name}`);
                    setValue('amount', row.balance, { shouldValidate: true });
                  }}
                  className="w-full text-left px-3 py-2 border-t border-slate-700 hover:bg-slate-700/40 first:border-t-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{row.account.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{row.account.code}</p>
                    </div>
                    <span className={`text-sm font-semibold ${row.balance > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {formatCurrency(row.balance)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recent vouchers */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded">
          <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Recent Receipts</h3>
            <span className="text-xs text-slate-500">{vouchers.length}</span>
          </div>
          {error ? (
            <p className="px-3 py-6 text-sm text-rose-400">{error}</p>
          ) : !loading && vouchers.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/60 text-slate-300 text-xs uppercase">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Voucher</th>
                    <th className="px-2 py-1.5 text-left">Date</th>
                    <th className="px-2 py-1.5 text-left">Customer</th>
                    <th className="px-2 py-1.5 text-left">Method</th>
                    <th className="px-2 py-1.5 text-right">Amount</th>
                    <th className="px-2 py-1.5 text-center">Status</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <SkeletonTableRows rows={6} cols={7} />}
                  {!loading && vouchers.map(v => (
                    <tr key={v.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 font-mono text-xs text-blue-300">{v.voucherNumber || '—'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-xs">{format(new Date(v.date), 'd MMM HH:mm')}</td>
                      <td className="px-2 py-1.5 truncate max-w-40">{v.partyName}</td>
                      <td className="px-2 py-1.5 capitalize text-xs text-slate-300">
                        {v.method}
                        {v.method === 'bank' && v.bankName && (
                          <span className="text-slate-500"> · {v.bankName}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(v.amount)}</td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {v.cancelled ? <span className="text-rose-300">Cancelled</span> : <span className="text-emerald-300">Posted</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => printVoucher({
                              shopName: shopSettings.shopName,
                              shopAddress: shopSettings.shopAddress,
                              shopPhone: shopSettings.shopPhone,
                              currency: shopSettings.currency,
                              title: v.direction === 'received' ? 'Receipt Voucher' : 'Payment Voucher',
                              voucherNumber: v.voucherNumber,
                              date: format(new Date(v.date), 'd MMM yyyy HH:mm'),
                              partyName: v.partyName,
                              partyPhone: v.partyPhone,
                              narration: v.notes,
                              lines: [{
                                label: v.direction === 'received'
                                  ? `Received via ${v.method.toUpperCase()}${v.bankName ? ' (' + v.bankName + ')' : ''}`
                                  : `Paid via ${v.method.toUpperCase()}${v.bankName ? ' (' + v.bankName + ')' : ''}`,
                                amount: v.amount,
                              }],
                              summary: [
                                { label: 'Total', value: `${shopSettings.currency} ${v.amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                              ],
                              footer: v.cancelled ? 'CANCELLED' : (v.postedBy?.name ? `Posted by ${v.postedBy.name}` : undefined),
                            })}
                            title="Print voucher"
                            className="p-1 text-slate-400 hover:text-blue-300"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canCancel && !v.cancelled && (
                            <button
                              onClick={() => cancelVoucher(v.id)}
                              title="Cancel & reverse"
                              className="p-1 text-slate-400 hover:text-rose-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
