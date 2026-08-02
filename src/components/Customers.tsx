import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Contact, Search, X, Eye, Phone, ShoppingBag, RotateCcw, ChevronDown, ChevronRight, AlertTriangle, BookOpen, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { Sale, SaleReturn } from '../types';

const codeForCustomer = (phone: string) => `CUST-${phone.replace(/\D/g, '')}`;

interface CustomerRow {
  phone: string;
  name: string;
  totalSpent: number;
  visits: number;
  lastVisit: string;
  firstVisit: string;
  itemsBought: number;
}

export default function Customers() {
  const { sales, returns, accounts, shopSettings, hasPermission, selectedCustomerPhone, setSelectedCustomerPhone, setCurrentPage, setSelectedPartyAccountId } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    `${shopSettings.currency} ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Open the deep-linked customer (if any) when the page mounts
  useEffect(() => {
    if (selectedCustomerPhone) {
      setActivePhone(selectedCustomerPhone);
      setSelectedCustomerPhone(null);
    }
  }, [selectedCustomerPhone, setSelectedCustomerPhone]);

  // Build the per-customer aggregate list once from all sales
  const customers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow & { _salesByDate: Sale[] }>();
    for (const s of sales) {
      const phone = (s.customerPhone || '').trim();
      if (!phone) continue;
      const itemQty = s.items.reduce((sum, i) => sum + i.quantity, 0);
      const existing = map.get(phone);
      if (existing) {
        existing.totalSpent += s.total;
        existing.visits += 1;
        existing.itemsBought += itemQty;
        if (new Date(s.date) > new Date(existing.lastVisit)) existing.lastVisit = s.date;
        if (new Date(s.date) < new Date(existing.firstVisit)) existing.firstVisit = s.date;
        if (s.customerName && s.customerName.trim() && new Date(s.date) >= new Date(existing.lastVisit)) {
          existing.name = s.customerName.trim();
        } else if (!existing.name && s.customerName && s.customerName.trim()) {
          existing.name = s.customerName.trim();
        }
      } else {
        map.set(phone, {
          phone,
          name: (s.customerName || '').trim(),
          totalSpent: s.total,
          visits: 1,
          itemsBought: itemQty,
          lastVisit: s.date,
          firstVisit: s.date,
          _salesByDate: [],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => +new Date(b.lastVisit) - +new Date(a.lastVisit),
    );
  }, [sales]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      c => c.phone.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [customers, searchQuery]);

  const totalRevenue = useMemo(
    () => customers.reduce((sum, c) => sum + c.totalSpent, 0),
    [customers],
  );

  // Detail view data for the active customer
  const activeCustomer = activePhone ? customers.find(c => c.phone === activePhone) || null : null;
  const activeSales = useMemo<Sale[]>(() => {
    if (!activePhone) return [];
    return sales
      .filter(s => (s.customerPhone || '').trim() === activePhone)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [sales, activePhone]);
  const activeReturns = useMemo<SaleReturn[]>(() => {
    if (!activePhone) return [];
    const saleIds = new Set(activeSales.map(s => s.id));
    return returns.filter(r => saleIds.has(r.saleId));
  }, [returns, activeSales, activePhone]);
  const activeRefundTotal = activeReturns.reduce((s, r) => s + r.refundAmount, 0);

  if (!hasPermission('customers.view')) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <p className="text-slate-300">You don't have permission to view customers.</p>
      </div>
    );
  }

  const closeDetail = () => {
    setActivePhone(null);
    setExpandedSale(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Contact className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-bold">Customers</h1>
        </div>
        <p className="text-slate-400 text-sm">
          {customers.length} {customers.length === 1 ? 'customer' : 'customers'} · lifetime revenue {formatCurrency(totalRevenue)}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by phone or name…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            title="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {customers.length === 0
              ? 'No customers yet — phone numbers captured at POS will appear here.'
              : 'No customers match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50 text-slate-300 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-right">Visits</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-4 py-3 text-left">Last Visit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.phone}
                    className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => setActivePhone(c.phone)}
                  >
                    <td className="px-4 py-3 font-mono text-blue-300">{c.phone}</td>
                    <td className="px-4 py-3">{c.name || <span className="text-slate-500">—</span>}</td>
                    <td className="px-4 py-3 text-right">{c.visits}</td>
                    <td className="px-4 py-3 text-right">{c.itemsBought}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">
                      {formatCurrency(c.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{format(new Date(c.lastVisit), 'd MMM yyyy')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setActivePhone(c.phone); }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/80 hover:bg-blue-600 rounded text-xs text-white transition-colors"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        {hasPermission('accounts.ledger') && accounts.some(a => a.code === codeForCustomer(c.phone)) && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setCurrentPage('accounts');
                            }}
                            title="Open accounting ledger"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition-colors"
                          >
                            <BookOpen className="w-3 h-3" /> Account
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

      {/* Detail modal */}
      {activeCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <Contact className="w-5 h-5 text-blue-400" />
                  <h2 className="text-2xl font-bold">{activeCustomer.name || 'Unnamed customer'}</h2>
                </div>
                <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                  <Phone className="w-3.5 h-3.5" /> {activeCustomer.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasPermission('payments.create') && (() => {
                  const partyAcc = accounts.find(a => a.code === codeForCustomer(activeCustomer.phone));
                  if (!partyAcc) return null;
                  return (
                    <button
                      onClick={() => {
                        setSelectedPartyAccountId(partyAcc.id);
                        setCurrentPage('accounts');
                      }}
                      title="Receive Payment"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium text-white"
                    >
                      <Wallet className="w-4 h-4" /> Receive Payment
                    </button>
                  );
                })()}
                <button onClick={closeDetail} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-slate-700">
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-xs text-slate-400">Total spent</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(activeCustomer.totalSpent)}</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-xs text-slate-400">Visits</p>
                <p className="text-lg font-bold">{activeCustomer.visits}</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-xs text-slate-400">Items bought</p>
                <p className="text-lg font-bold">{activeCustomer.itemsBought}</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-xs text-slate-400">Refunded</p>
                <p className={`text-lg font-bold ${activeRefundTotal > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
                  {formatCurrency(activeRefundTotal)}
                </p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 col-span-2 sm:col-span-2">
                <p className="text-xs text-slate-400">First visit</p>
                <p className="text-sm font-medium">{format(new Date(activeCustomer.firstVisit), 'd MMM yyyy, HH:mm')}</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 col-span-2 sm:col-span-2">
                <p className="text-xs text-slate-400">Last visit</p>
                <p className="text-sm font-medium">{format(new Date(activeCustomer.lastVisit), 'd MMM yyyy, HH:mm')}</p>
              </div>
            </div>

            {/* Sales list */}
            <div className="p-6 space-y-3">
              <h3 className="font-semibold text-slate-300 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Purchase History
              </h3>
              {activeSales.length === 0 ? (
                <p className="text-slate-400 text-sm">No purchases.</p>
              ) : (
                activeSales.map(sale => {
                  const saleReturns = activeReturns.filter(r => r.saleId === sale.id);
                  const isOpen = expandedSale === sale.id;
                  return (
                    <div key={sale.id} className="bg-slate-700/40 rounded-lg border border-slate-600">
                      <button
                        onClick={() => setExpandedSale(isOpen ? null : sale.id)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-700/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isOpen
                            ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {format(new Date(sale.date), 'd MMM yyyy, HH:mm')}
                            </p>
                            <p className="text-xs text-slate-400">
                              {sale.items.reduce((s, i) => s + i.quantity, 0)} items · {sale.cashierName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-green-400">{formatCurrency(sale.total)}</p>
                          {saleReturns.length > 0 && (
                            <p className="text-xs text-orange-400 flex items-center gap-1 justify-end">
                              <RotateCcw className="w-3 h-3" />
                              {saleReturns.length} {saleReturns.length === 1 ? 'return' : 'returns'}
                            </p>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-600 p-3 space-y-2">
                          {/* Items */}
                          <div className="space-y-1">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                                <span className="truncate">{it.name} × {it.quantity}</span>
                                <span className="text-slate-400">{formatCurrency(it.price * it.quantity)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Totals */}
                          <div className="border-t border-slate-600 pt-2 text-xs space-y-1">
                            <div className="flex justify-between text-slate-400">
                              <span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span>
                            </div>
                            {sale.discountAmount > 0 && (
                              <div className="flex justify-between text-orange-400">
                                <span>Discount</span><span>-{formatCurrency(sale.discountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-white">
                              <span>Total</span><span className="text-green-400">{formatCurrency(sale.total)}</span>
                            </div>
                          </div>

                          {/* Linked returns */}
                          {saleReturns.length > 0 && (
                            <div className="border-t border-slate-600 pt-2 space-y-1">
                              <p className="text-xs text-orange-400 font-medium flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> Returns on this sale
                              </p>
                              {saleReturns.map(r => (
                                <div key={r.id} className="text-xs text-slate-300 flex justify-between">
                                  <span>
                                    {format(new Date(r.date), 'd MMM HH:mm')} · {r.items.reduce((s, i) => s + i.quantity, 0)} items
                                  </span>
                                  <span className="text-orange-400">-{formatCurrency(r.refundAmount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
