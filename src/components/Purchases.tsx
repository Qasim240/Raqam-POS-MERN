import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { purchaseApi, accountApi } from '../services/api';
import { Purchase, PurchasePaymentMethod, Product } from '../types';
import { Truck, Plus, Save, RotateCcw, X, Search, AlertTriangle, ChevronDown, ChevronRight, Printer, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { printVoucher } from '../utils/printVoucher';
import { SkeletonTableRows } from './ui/Skeleton';

const inputCls =
  'w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500';

interface DraftLine {
  productId: string;
  productSearch: string;   // raw text in the search box
  name: string;
  sku: string;
  quantity: string;
  unitCost: string;
}

const newDraftLine = (): DraftLine => ({
  productId: '',
  productSearch: '',
  name: '',
  sku: '',
  quantity: '1',
  unitCost: '',
});

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Purchases() {
  const { products, accounts, refreshAccounts, hasPermission, shopSettings } = useStore();
  const canView = hasPermission('purchases.view');
  const canCreate = hasPermission('purchases.create');
  const canCancel = hasPermission('purchases.cancel');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newDraftLine()]);
  const [activeProductSearchIdx, setActiveProductSearchIdx] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [paid, setPaid] = useState('');
  const [paidMethod, setPaidMethod] = useState<PurchasePaymentMethod>('cash');
  const [paidMethodAccountId, setPaidMethodAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick-add supplier state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickPhone, setQuickPhone] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickOpening, setQuickOpening] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const supplierAccounts = useMemo(
    () => accounts.filter(a => a.type === 'supplier' && a.isActive),
    [accounts],
  );
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return supplierAccounts;
    return supplierAccounts.filter(
      a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || (a.mobile || '').toLowerCase().includes(q),
    );
  }, [supplierAccounts, supplierSearch]);

  const cashAccounts = useMemo(
    () => accounts.filter(a => a.isActive && a.allowPosting !== false && !a.controlAccount && (a.type === 'cash' || a.type === 'asset')),
    [accounts],
  );
  const bankAccounts = useMemo(
    () => accounts.filter(a => a.isActive && a.allowPosting !== false && !a.controlAccount && (a.type === 'bank' || a.type === 'asset')),
    [accounts],
  );

  const filteredProductsForLine = (idx: number): Product[] => {
    const q = (lines[idx]?.productSearch || '').trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q),
      )
      .slice(0, 12);
  };

  const subtotal = useMemo(
    () => r2(lines.reduce((s, l) => {
      const q = parseFloat(l.quantity) || 0;
      const c = parseFloat(l.unitCost) || 0;
      return s + q * c;
    }, 0)),
    [lines],
  );
  const disc = parseFloat(discountAmount) || 0;
  const tax = parseFloat(taxAmount) || 0;
  const total = r2(subtotal - disc + tax);
  const paidAmt = parseFloat(paid) || 0;
  const balanceDue = r2(total - paidAmt);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await purchaseApi.getAll({ limit: 100 });
      setPurchases(list);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    load();
    // eslint-disable-next-line
  }, [canView]);

  // Auto-pick first method account when method changes
  useEffect(() => {
    if (paidMethod === 'none') { setPaidMethodAccountId(''); return; }
    if (paidMethodAccountId) return;
    const list = paidMethod === 'cash' ? cashAccounts : bankAccounts;
    if (list.length > 0) setPaidMethodAccountId(list[0].id);
    // eslint-disable-next-line
  }, [paidMethod, cashAccounts.length, bankAccounts.length]);

  useEffect(() => {
    setPaidMethodAccountId('');
  }, [paidMethod]);

  // If paid amount becomes 0, force method to 'none'
  useEffect(() => {
    if ((parseFloat(paid) || 0) === 0 && paidMethod !== 'none') setPaidMethod('none');
    if ((parseFloat(paid) || 0) > 0 && paidMethod === 'none') setPaidMethod('cash');
    // eslint-disable-next-line
  }, [paid]);

  const setLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const addLine = () => setLines(prev => [...prev, newDraftLine()]);
  const removeLine = (idx: number) => {
    setLines(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const pickProduct = (idx: number, p: Product) => {
    setLine(idx, {
      productId: p.id,
      productSearch: `${p.sku || ''} ${p.name}`.trim(),
      name: p.name,
      sku: p.sku || '',
      unitCost: p.purchasePrice ? String(p.purchasePrice) : '',
    });
    setActiveProductSearchIdx(null);
  };

  const resetForm = () => {
    setSupplierId('');
    setSupplierSearch('');
    setSupplierInvoiceNo('');
    setLines([newDraftLine()]);
    setDiscountAmount('');
    setTaxAmount('');
    setPaid('');
    setPaidMethod('cash');
    setPaidMethodAccountId('');
    setNotes('');
    setDate(new Date().toISOString().slice(0, 10));
    setFormError(null);
  };

  const submit = async () => {
    setFormError(null);
    if (!supplierId) return setFormError('Pick a supplier');
    const cleanLines = lines.filter(l => l.productId && (parseFloat(l.quantity) || 0) > 0);
    if (cleanLines.length === 0) return setFormError('Add at least one item with a quantity');
    for (const l of cleanLines) {
      if ((parseFloat(l.unitCost) || 0) < 0) return setFormError('Unit cost cannot be negative');
    }
    if (paidAmt > total + 0.01) return setFormError('Paid amount exceeds total');
    if (paidAmt > 0 && !paidMethodAccountId) return setFormError('Pick a cash/bank account for the paid amount');

    setSubmitting(true);
    try {
      await purchaseApi.create({
        date: date ? new Date(date).toISOString() : undefined,
        supplierAccountId: supplierId,
        supplierInvoiceNo,
        items: cleanLines.map(l => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity) || 0,
          unitCost: parseFloat(l.unitCost) || 0,
        })),
        discountAmount: disc,
        taxAmount: tax,
        paid: paidAmt,
        paidMethod,
        paidMethodAccountId: paidAmt > 0 ? paidMethodAccountId : null,
        notes,
      });
      resetForm();
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPurchase = async (id: string) => {
    if (!confirm('Cancel this purchase? Stock will be rolled back and an offsetting entry posted.')) return;
    try {
      await purchaseApi.cancel(id);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Cancel failed');
    }
  };

  if (!canView) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <p className="text-slate-300">You don't have permission to view purchases.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold">Purchases</h1>
      </div>

      {/* New Purchase form */}
      {canCreate && (
        <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">New Purchase</h3>

          {/* Quick-add supplier panel */}
          {quickAddOpen && (
            <div className="mb-3 bg-slate-900/40 border border-blue-500/30 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-300 inline-flex items-center gap-1">
                  <UserPlus className="w-4 h-4" /> Add New Supplier
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
                    placeholder="e.g. ABC Textile"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone</label>
                  <input
                    value={quickPhone}
                    onChange={e => setQuickPhone(e.target.value)}
                    placeholder="Optional"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Opening balance owed to them</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={quickOpening}
                    onChange={e => setQuickOpening(e.target.value)}
                    placeholder="0.00"
                    className={`${inputCls} text-right`}
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
                  onClick={async () => {
                    setQuickError(null);
                    if (!quickName.trim()) {
                      setQuickError('Name is required');
                      return;
                    }
                    setQuickSubmitting(true);
                    try {
                      const newSupp = await accountApi.quickAddSupplier({
                        phone: quickPhone.trim() || undefined,
                        name: quickName.trim(),
                        openingCredit: parseFloat(quickOpening) || 0,
                      });
                      await refreshAccounts();
                      setSupplierId(newSupp.id);
                      setSupplierSearch(`${newSupp.code} — ${newSupp.name}`);
                      setQuickAddOpen(false);
                      setQuickPhone('');
                      setQuickName('');
                      setQuickOpening('');
                    } catch (err: any) {
                      setQuickError(err?.message || 'Failed to add supplier');
                    } finally {
                      setQuickSubmitting(false);
                    }
                  }}
                  disabled={quickSubmitting || !quickName.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white"
                >
                  <Save className="w-4 h-4" /> {quickSubmitting ? 'Adding…' : 'Add Supplier'}
                </button>
              </div>
            </div>
          )}

          {/* Header row */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
            <div className="md:col-span-3 relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-slate-400">Supplier</label>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddOpen(true);
                    setQuickPhone(supplierSearch.match(/^\d+$/) ? supplierSearch : '');
                    setQuickName(supplierSearch.match(/^\d+$/) ? '' : supplierSearch);
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
                  value={supplierSearch}
                  onChange={e => { setSupplierSearch(e.target.value); setSupplierId(''); }}
                  placeholder="Search supplier by name, code, or phone…"
                  className={`${inputCls} pl-8`}
                />
              </div>
              {supplierSearch && !supplierId && (
                <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.length === 0 ? (
                    <div className="px-2 py-2">
                      <div className="text-xs text-slate-400 mb-1">No matches.</div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddOpen(true);
                          setQuickPhone(supplierSearch.match(/^\d+$/) ? supplierSearch : '');
                          setQuickName(supplierSearch.match(/^\d+$/) ? '' : supplierSearch);
                          setQuickError(null);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                      >
                        <UserPlus className="w-3 h-3" /> Add "{supplierSearch}" as new supplier
                      </button>
                    </div>
                  ) : (
                    filteredSuppliers.slice(0, 12).map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSupplierId(s.id);
                          setSupplierSearch(`${s.code} — ${s.name}`);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-slate-700 text-sm text-white"
                      >
                        <span className="font-mono text-blue-300">{s.code}</span> {s.name}
                        {s.mobile && <span className="text-xs text-slate-400 ml-2">{s.mobile}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Supplier invoice #</label>
              <input
                value={supplierInvoiceNo}
                onChange={e => setSupplierInvoiceNo(e.target.value)}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
          </div>

          {/* Items grid */}
          <div className="border border-slate-700 rounded mb-2">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/60 text-slate-300 text-xs uppercase">
                <tr>
                  <th className="px-2 py-1.5 text-left">Product</th>
                  <th className="px-2 py-1.5 text-right" style={{ width: '90px' }}>Qty</th>
                  <th className="px-2 py-1.5 text-right" style={{ width: '120px' }}>Unit Cost</th>
                  <th className="px-2 py-1.5 text-right" style={{ width: '130px' }}>Line Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const lineTotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0);
                  const showDropdown = activeProductSearchIdx === idx && !l.productId;
                  return (
                    <tr key={idx} className="border-t border-slate-700">
                      <td className="px-2 py-1 relative">
                        <input
                          value={l.productSearch}
                          onChange={e => setLine(idx, { productSearch: e.target.value, productId: '' })}
                          onFocus={() => setActiveProductSearchIdx(idx)}
                          onBlur={() => setTimeout(() => setActiveProductSearchIdx(curr => curr === idx ? null : curr), 150)}
                          placeholder="Search product by name, SKU, or barcode…"
                          className={inputCls}
                        />
                        {showDropdown && (
                          <div className="absolute z-20 mt-1 w-[28rem] max-w-full bg-slate-800 border border-slate-700 rounded shadow-lg max-h-48 overflow-y-auto">
                            {filteredProductsForLine(idx).length === 0 ? (
                              <div className="px-2 py-2 text-xs text-slate-400">No products match.</div>
                            ) : (
                              filteredProductsForLine(idx).map(p => (
                                <button
                                  key={p.id}
                                  onMouseDown={() => pickProduct(idx, p)}
                                  className="w-full text-left px-2 py-1.5 hover:bg-slate-700 text-sm text-white"
                                >
                                  <span className="font-mono text-blue-300">{p.sku}</span> {p.name}
                                  <span className="text-xs text-slate-400 ml-2">stock: {p.stock}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number" min="1" step="1"
                          value={l.quantity}
                          onChange={e => setLine(idx, { quantity: e.target.value })}
                          className={`${inputCls} text-right`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number" min="0" step="0.01"
                          value={l.unitCost}
                          onChange={e => setLine(idx, { unitCost: e.target.value })}
                          placeholder="0.00"
                          className={`${inputCls} text-right`}
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-sm">
                        {l.productId ? formatCurrency(r2(lineTotal)) : ''}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {lines.length > 1 && (
                          <button
                            onClick={() => removeLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-300"
                            title="Remove line"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-2 py-1 border-t border-slate-700">
              <button
                onClick={addLine}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
              >
                <Plus className="w-3 h-3" /> Add line
              </button>
            </div>
          </div>

          {/* Totals + Payment row */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Discount</label>
              <input
                type="number" min="0" step="0.01"
                value={discountAmount}
                onChange={e => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} text-right`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tax</label>
              <input
                type="number" min="0" step="0.01"
                value={taxAmount}
                onChange={e => setTaxAmount(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} text-right`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Paid Now</label>
              <input
                type="number" min="0" step="0.01"
                value={paid}
                onChange={e => setPaid(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} text-right`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Method</label>
              <select
                value={paidMethod}
                onChange={e => setPaidMethod(e.target.value as PurchasePaymentMethod)}
                disabled={paidAmt === 0}
                className={inputCls}
              >
                <option value="none">— None —</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank / Card</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Account (paid from)</label>
              <select
                value={paidMethodAccountId}
                onChange={e => setPaidMethodAccountId(e.target.value)}
                disabled={paidMethod === 'none'}
                className={inputCls}
              >
                <option value="">— pick —</option>
                {(paidMethod === 'cash' ? cashAccounts : paidMethod === 'bank' ? bankAccounts : []).map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
            <div className="bg-slate-700/40 rounded px-3 py-2 text-sm space-y-0.5">
              <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {disc > 0 && <div className="flex justify-between text-orange-300"><span>Discount</span><span>-{formatCurrency(disc)}</span></div>}
              {tax > 0 && <div className="flex justify-between text-slate-300"><span>Tax</span><span>+{formatCurrency(tax)}</span></div>}
              <div className="flex justify-between font-bold border-t border-slate-600 pt-1"><span>Total</span><span className="text-emerald-300">{formatCurrency(total)}</span></div>
              {paidAmt > 0 && <div className="flex justify-between text-slate-300"><span>Paid now</span><span>{formatCurrency(paidAmt)}</span></div>}
              <div className={`flex justify-between font-semibold ${balanceDue > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                <span>Balance to supplier</span><span>{formatCurrency(Math.max(0, balanceDue))}</span>
              </div>
            </div>
          </div>

          {formError && <p className="text-rose-400 text-xs mt-2">{formError}</p>}

          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={resetForm}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm text-slate-200"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white"
            >
              <Save className="w-4 h-4" /> {submitting ? 'Saving…' : 'Save Purchase'}
            </button>
          </div>
        </div>
      )}

      {/* Recent purchases */}
      <div className="bg-slate-800 border border-slate-700 rounded">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Recent Purchases</h3>
          <span className="text-xs text-slate-500">{purchases.length}</span>
        </div>
        {loadError ? (
          <p className="px-3 py-6 text-sm text-rose-400">{loadError}</p>
        ) : !loading && purchases.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-400">No purchases yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/60 text-slate-300 text-xs uppercase">
                <tr>
                  <th className="w-6"></th>
                  <th className="px-2 py-1.5 text-left">Voucher</th>
                  <th className="px-2 py-1.5 text-left">Date</th>
                  <th className="px-2 py-1.5 text-left">Supplier</th>
                  <th className="px-2 py-1.5 text-left">Inv #</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                  <th className="px-2 py-1.5 text-right">Paid</th>
                  <th className="px-2 py-1.5 text-right">Balance</th>
                  <th className="px-2 py-1.5 text-center">Status</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonTableRows rows={6} cols={10} />}
                {!loading && purchases.map(p => {
                  const open = expanded === p.id;
                  return (
                    <>
                      <tr
                        key={p.id}
                        onClick={() => setExpanded(open ? null : p.id)}
                        className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                      >
                        <td className="px-1 py-1.5 text-slate-400">
                          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-xs text-blue-300">{p.voucherNumber || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs">{format(new Date(p.date), 'd MMM yyyy')}</td>
                        <td className="px-2 py-1.5 truncate max-w-[180px]">{p.supplierName}</td>
                        <td className="px-2 py-1.5 text-xs text-slate-300">{p.supplierInvoiceNo || '—'}</td>
                        <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(p.total)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-300">{p.paid > 0 ? formatCurrency(p.paid) : '—'}</td>
                        <td className={`px-2 py-1.5 text-right font-medium ${p.balance > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                          {p.balance > 0 ? formatCurrency(p.balance) : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs">
                          {p.cancelled ? <span className="text-rose-300">Cancelled</span> : <span className="text-emerald-300">Posted</span>}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                printVoucher({
                                  shopName: shopSettings.shopName,
                                  shopAddress: shopSettings.shopAddress,
                                  shopPhone: shopSettings.shopPhone,
                                  currency: shopSettings.currency,
                                  title: 'Purchase Voucher',
                                  voucherNumber: p.voucherNumber,
                                  date: format(new Date(p.date), 'd MMM yyyy'),
                                  partyName: p.supplierName,
                                  partyPhone: p.supplierPhone,
                                  narration: p.supplierInvoiceNo
                                    ? `Supplier invoice: ${p.supplierInvoiceNo}${p.notes ? ' — ' + p.notes : ''}`
                                    : (p.notes || undefined),
                                  lines: p.items.map(it => ({
                                    label: `${it.sku ? it.sku + ' — ' : ''}${it.name}`,
                                    qty: it.quantity,
                                    unitCost: it.unitCost,
                                    amount: it.lineTotal,
                                  })),
                                  summary: [
                                    { label: 'Subtotal', value: formatCurrency(p.subtotal) },
                                    ...(p.discountAmount > 0 ? [{ label: 'Discount', value: '-' + formatCurrency(p.discountAmount) }] : []),
                                    ...(p.taxAmount > 0 ? [{ label: 'Tax', value: '+' + formatCurrency(p.taxAmount) }] : []),
                                    { label: 'Total', value: formatCurrency(p.total) },
                                    ...(p.paid > 0 ? [{ label: `Paid (${p.paidMethod})`, value: formatCurrency(p.paid) }] : []),
                                    ...(p.balance > 0 ? [{ label: 'Balance to supplier', value: formatCurrency(p.balance) }] : []),
                                  ],
                                  footer: p.cancelled ? 'CANCELLED' : (p.createdBy?.name ? `Recorded by ${p.createdBy.name}` : undefined),
                                });
                              }}
                              title="Print voucher"
                              className="p-1 text-slate-400 hover:text-blue-300"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canCancel && !p.cancelled && (
                              <button
                                onClick={e => { e.stopPropagation(); cancelPurchase(p.id); }}
                                title="Cancel & reverse"
                                className="p-1 text-slate-400 hover:text-rose-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr key={p.id + '-detail'} className="bg-slate-900/40">
                          <td></td>
                          <td colSpan={9} className="px-2 py-2">
                            <table className="w-full text-xs">
                              <thead className="text-slate-400">
                                <tr>
                                  <th className="text-left py-1">Item</th>
                                  <th className="text-left py-1">SKU</th>
                                  <th className="text-right py-1">Qty</th>
                                  <th className="text-right py-1">Unit Cost</th>
                                  <th className="text-right py-1">Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.items.map((it, i) => (
                                  <tr key={i}>
                                    <td className="py-0.5 text-slate-300">{it.name}</td>
                                    <td className="py-0.5 font-mono text-blue-300">{it.sku}</td>
                                    <td className="py-0.5 text-right">{it.quantity}</td>
                                    <td className="py-0.5 text-right">{formatCurrency(it.unitCost)}</td>
                                    <td className="py-0.5 text-right">{formatCurrency(it.lineTotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {p.notes && <p className="mt-1 text-xs text-slate-400">Notes: {p.notes}</p>}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
