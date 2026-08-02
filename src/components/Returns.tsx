import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { RotateCcw, Search, Eye, Plus, X, Check, Package, AlertTriangle } from 'lucide-react';
import { Sale, SaleReturn, ReturnReason } from '../types';

const REASON_LABELS: Record<ReturnReason, string> = {
  defective: 'Defective Product',
  wrong_item: 'Wrong Item',
  customer_change: 'Customer Changed Mind',
  damaged: 'Damaged',
  other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  rejected: 'bg-red-500/20 text-red-400',
};

export default function Returns() {
  const { sales, returns, addReturn, currentUser, shopSettings, hasPermission } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  // Create return form state
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason>('customer_change');
  const [notes, setNotes] = useState('');

  const formatCurrency = (value: number) =>
    `${shopSettings.currency} ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Filter returns by search
  const filteredReturns = returns.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.saleId.toLowerCase().includes(q) ||
      r.processedByName.toLowerCase().includes(q) ||
      r.items.some((item) => item.name.toLowerCase().includes(q))
    );
  });

  // Search sales for return creation
  const filteredSales = saleSearch.trim()
    ? sales.filter((s) => {
        const q = saleSearch.toLowerCase();
        return (
          s.id.toLowerCase().includes(q) ||
          s.cashierName.toLowerCase().includes(q) ||
          s.items.some((item) => item.name.toLowerCase().includes(q))
        );
      })
    : sales.slice(0, 10);

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnItems({});
  };

  const handleToggleItem = (productId: string, maxQty: number) => {
    setReturnItems((prev) => {
      const copy = { ...prev };
      if (copy[productId]) {
        delete copy[productId];
      } else {
        copy[productId] = maxQty;
      }
      return copy;
    });
  };

  const handleItemQtyChange = (productId: string, qty: number, maxQty: number) => {
    if (qty < 1 || qty > maxQty) return;
    setReturnItems((prev) => ({ ...prev, [productId]: qty }));
  };

  const getRefundAmount = () => {
    if (!selectedSale) return 0;
    let subtotal = 0;
    selectedSale.items.forEach((item) => {
      const qty = returnItems[item.productId];
      if (qty) {
        subtotal += item.price * qty;
      }
    });
    return subtotal;
  };

  const handleSubmitReturn = () => {
    if (!selectedSale || Object.keys(returnItems).length === 0) return;

    const items = selectedSale.items
      .filter((item) => returnItems[item.productId] > 0)
      .map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: returnItems[item.productId],
        sku: item.sku,
      }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    addReturn({
      saleId: selectedSale.id,
      date: new Date().toISOString(),
      items,
      subtotal,
      refundAmount: subtotal,
      reason,
      notes: notes || undefined,
      processedBy: currentUser?.id || 'unknown',
      processedByName: currentUser?.name || 'Unknown',
      status: 'approved',
    });

    // Reset form
    setShowCreateModal(false);
    setSelectedSale(null);
    setReturnItems({});
    setReason('customer_change');
    setNotes('');
    setSaleSearch('');
  };

  const todayReturns = returns.filter((r) => {
    const d = new Date(r.date);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const todayRefundAmount = todayReturns.reduce((sum, r) => sum + r.refundAmount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <RotateCcw className="w-7 h-7 text-orange-400" />
            Returns & Refunds
          </h1>
          <p className="text-slate-400 mt-1">Process and track product returns</p>
        </div>
        {hasPermission('returns.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors text-white"
          >
            <Plus className="w-5 h-5" />
            New Return
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Returns</p>
          <p className="text-2xl font-bold text-white mt-1">{returns.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Today's Returns</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{todayReturns.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Today's Refund Total</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(todayRefundAmount)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search returns by ID, sale ID, item name..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Returns Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="px-4 py-3 text-left">Return ID</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Sale ID</th>
              <th className="px-4 py-3 text-left">Items</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-right">Refund</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left">Processed By</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.map((ret) => (
              <tr key={ret.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 text-slate-300">
                <td className="px-4 py-3 font-mono text-xs">{ret.id.slice(-8)}</td>
                <td className="px-4 py-3">{new Date(ret.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{ret.saleId.slice(-8)}</td>
                <td className="px-4 py-3">
                  {ret.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded">{REASON_LABELS[ret.reason]}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-400">
                  {formatCurrency(ret.refundAmount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[ret.status]}`}>
                    {ret.status}
                  </span>
                </td>
                <td className="px-4 py-3">{ret.processedByName}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => {
                      setSelectedReturn(ret);
                      setShowDetailModal(true);
                    }}
                    className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredReturns.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No returns found</p>
          </div>
        )}
      </div>

      {/* ─── Create Return Modal ──────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-400" />
                Process Return
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSale(null);
                  setReturnItems({});
                }}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Find Sale */}
              {!selectedSale && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Step 1: Find Original Sale</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={saleSearch}
                      onChange={(e) => setSaleSearch(e.target.value)}
                      placeholder="Search by sale ID, cashier name, or product name..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredSales.map((sale) => (
                      <button
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-medium font-mono text-sm">
                              Sale #{sale.id.slice(-8)}
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                              {new Date(sale.date).toLocaleString()} — {sale.cashierName}
                            </p>
                            <p className="text-slate-300 text-xs mt-1">
                              {sale.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                            </p>
                          </div>
                          <span className="text-green-400 font-semibold text-sm">
                            {formatCurrency(sale.total)}
                          </span>
                        </div>
                      </button>
                    ))}

                    {filteredSales.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No sales found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Select Items to Return */}
              {selectedSale && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">Step 2: Select Items to Return</h3>
                      <button
                        onClick={() => {
                          setSelectedSale(null);
                          setReturnItems({});
                        }}
                        className="text-sm text-orange-400 hover:text-orange-300"
                      >
                        Change Sale
                      </button>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-3 text-xs text-slate-400">
                      Sale #{selectedSale.id.slice(-8)} — {new Date(selectedSale.date).toLocaleString()} — Total: {formatCurrency(selectedSale.total)}
                    </div>

                    <div className="space-y-2">
                      {selectedSale.items.map((item) => {
                        const isSelected = !!returnItems[item.productId];
                        const returnQty = returnItems[item.productId] || 0;

                        return (
                          <div
                            key={item.productId}
                            className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-orange-500/10 border-orange-500/50'
                                : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                            }`}
                            onClick={() => handleToggleItem(item.productId, item.quantity)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-500'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{item.name}</p>
                                  <p className="text-slate-400 text-xs">
                                    {formatCurrency(item.price)} x {item.quantity} purchased
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-slate-400 text-xs">Qty:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={item.quantity}
                                    value={returnQty}
                                    onChange={(e) =>
                                      handleItemQtyChange(item.productId, parseInt(e.target.value) || 1, item.quantity)
                                    }
                                    className="w-16 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                  <span className="text-slate-400 text-xs">/ {item.quantity}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Reason & Notes */}
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Step 3: Return Details</h3>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Reason</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value as ReturnReason)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {Object.entries(REASON_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Additional notes about the return..."
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* Refund Summary */}
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm">Items to return: {Object.keys(returnItems).length}</p>
                        <p className="text-slate-300 text-sm">
                          Total quantity: {Object.values(returnItems).reduce((a, b) => a + b, 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Refund Amount</p>
                        <p className="text-2xl font-bold text-orange-400">{formatCurrency(getRefundAmount())}</p>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmitReturn}
                    disabled={Object.keys(returnItems).length === 0}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Process Return — {formatCurrency(getRefundAmount())}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─────────────────────────────────── */}
      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Return Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReturn(null);
                }}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Return ID</p>
                  <p className="text-white font-mono">{selectedReturn.id.slice(-8)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Sale ID</p>
                  <p className="text-white font-mono">{selectedReturn.saleId.slice(-8)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Date</p>
                  <p className="text-white">{new Date(selectedReturn.date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400">Processed By</p>
                  <p className="text-white">{selectedReturn.processedByName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Reason</p>
                  <p className="text-white">{REASON_LABELS[selectedReturn.reason]}</p>
                </div>
                <div>
                  <p className="text-slate-400">Status</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[selectedReturn.status]}`}>
                    {selectedReturn.status}
                  </span>
                </div>
              </div>

              {selectedReturn.notes && (
                <div>
                  <p className="text-slate-400 text-sm">Notes</p>
                  <p className="text-white text-sm bg-slate-700/50 rounded-lg p-3 mt-1">{selectedReturn.notes}</p>
                </div>
              )}

              <div>
                <p className="text-slate-400 text-sm mb-2">Returned Items</p>
                <div className="space-y-2">
                  {selectedReturn.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-white text-sm">{item.name}</p>
                          <p className="text-slate-400 text-xs">Qty: {item.quantity} x {formatCurrency(item.price)}</p>
                        </div>
                      </div>
                      <p className="text-red-400 font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 flex items-center justify-between">
                <p className="text-slate-300 font-medium">Refund Amount</p>
                <p className="text-xl font-bold text-orange-400">{formatCurrency(selectedReturn.refundAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
