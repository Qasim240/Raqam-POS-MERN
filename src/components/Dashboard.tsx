import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import {
  TrendingUp, Package, AlertTriangle, Receipt, Flame,
  RotateCcw, X, ArrowRight, ChevronRight, ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { Product, Sale, SaleReturn } from '../types';

type ModalType = 'sales' | 'lowstock' | 'transactions' | 'returns' | null;

export default function Dashboard() {
  const {
    todaySalesAmount, totalProducts, lowStockCount,
    todaySales, recentSales, hotSellingProducts,
    shopSettings, products, returns, setCurrentPage,
  } = useStore();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [, setSelectedSale] = useState<Sale | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  const formatCurrency = (value: number) =>
    `${shopSettings.currency} ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Returns stats
  const todayReturns = returns.filter((r) => {
    const d = new Date(r.date);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const todayRefundAmount = todayReturns.reduce((sum, r) => sum + r.refundAmount, 0);

  // Low stock products
  const lowStockProducts = products.filter((p) => p.stock <= (shopSettings.lowStockThreshold || 5));

  const closeModal = () => {
    setActiveModal(null);
    setSelectedSale(null);
    setSelectedReturn(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-slate-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats Grid — 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {/* Today's Sales */}
        <button
          onClick={() => setActiveModal('sales')}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 border border-blue-500/20 text-left hover:from-blue-500 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-900/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium">Today's Sales</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(todaySalesAmount)}</p>
              <p className="text-blue-200 text-xs mt-2">{todaySales.length} transactions</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-300 opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-blue-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View sales</span><ChevronRight className="w-3 h-3" />
          </div>
        </button>

        {/* Total Products */}
        <button
          onClick={() => setCurrentPage('inventory')}
          className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 border border-green-500/20 text-left hover:from-green-500 hover:to-green-600 hover:shadow-lg hover:shadow-green-900/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium">Total Products</p>
              <p className="text-3xl font-bold mt-2">{totalProducts}</p>
              <p className="text-green-200 text-xs mt-2">In inventory</p>
            </div>
            <Package className="w-12 h-12 text-green-300 opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-green-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Go to inventory</span><ChevronRight className="w-3 h-3" />
          </div>
        </button>

        {/* Low Stock Alert */}
        <button
          onClick={() => setActiveModal('lowstock')}
          className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg p-6 border border-yellow-500/20 text-left hover:from-yellow-500 hover:to-yellow-600 hover:shadow-lg hover:shadow-yellow-900/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-200 text-sm font-medium">Low Stock Items</p>
              <p className="text-3xl font-bold mt-2">{lowStockCount}</p>
              <p className="text-yellow-200 text-xs mt-2">Need restocking</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-yellow-300 opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-yellow-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View items</span><ChevronRight className="w-3 h-3" />
          </div>
        </button>

        {/* All Transactions */}
        <button
          onClick={() => setActiveModal('transactions')}
          className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 border border-purple-500/20 text-left hover:from-purple-500 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-900/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">Total Transactions</p>
              <p className="text-3xl font-bold mt-2">{recentSales.length}</p>
              <p className="text-purple-200 text-xs mt-2">All time</p>
            </div>
            <Receipt className="w-12 h-12 text-purple-300 opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-purple-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View transactions</span><ChevronRight className="w-3 h-3" />
          </div>
        </button>

        {/* Today's Returns */}
        <button
          onClick={() => setActiveModal('returns')}
          className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 border border-orange-500/20 text-left hover:from-orange-500 hover:to-orange-600 hover:shadow-lg hover:shadow-orange-900/30 transition-all group col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm font-medium">Today's Returns</p>
              <p className="text-3xl font-bold mt-2">{todayReturns.length}</p>
              <p className="text-orange-200 text-xs mt-2">{formatCurrency(todayRefundAmount)} refunded</p>
            </div>
            <RotateCcw className="w-12 h-12 text-orange-300 opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-orange-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View returns</span><ChevronRight className="w-3 h-3" />
          </div>
        </button>
      </div>

      {/* Hot Selling & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Selling Products */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold">Hot Selling Products</h2>
          </div>
          {hotSellingProducts.length > 0 ? (
            <div className="space-y-3">
              {hotSellingProducts.map((item, idx) => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-xs text-slate-400">{item.product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-400">{item.sold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No sales yet</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold">Recent Transactions</h2>
            </div>
            <button
              onClick={() => setActiveModal('transactions')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.slice(0, 5).map((sale) => (
                <button
                  key={sale.id}
                  onClick={() => { setSelectedSale(sale); setActiveModal('transactions'); }}
                  className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 text-left transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">Order #{sale.id.slice(-6)}</p>
                    <p className="text-sm font-bold text-green-400">{formatCurrency(sale.total)}</p>
                  </div>
                  <p className="text-xs text-slate-400">{format(new Date(sale.date), 'MMM d, yyyy HH:mm')}</p>
                  <p className="text-xs text-slate-400 mt-1">{sale.items.length} item{sale.items.length > 1 ? 's' : ''}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No transactions yet</p>
          )}
        </div>
      </div>

      {/* ─── Modal Overlay ─────────────────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeModal}>
          <div
            className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                {activeModal === 'sales' && <><TrendingUp className="w-5 h-5 text-blue-400" /><h2 className="text-lg font-bold">Today's Sales</h2></>}
                {activeModal === 'lowstock' && <><AlertTriangle className="w-5 h-5 text-yellow-400" /><h2 className="text-lg font-bold">Low Stock Items</h2></>}
                {activeModal === 'transactions' && <><Receipt className="w-5 h-5 text-purple-400" /><h2 className="text-lg font-bold">Recent Transactions</h2></>}
                {activeModal === 'returns' && <><RotateCcw className="w-5 h-5 text-orange-400" /><h2 className="text-lg font-bold">Today's Returns</h2></>}
              </div>
              <div className="flex items-center gap-2">
                {/* Navigate to full page button */}
                {activeModal === 'sales' && (
                  <button onClick={() => { closeModal(); setCurrentPage('reports'); }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Reports
                  </button>
                )}
                {activeModal === 'lowstock' && (
                  <button onClick={() => { closeModal(); setCurrentPage('inventory'); }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Inventory
                  </button>
                )}
                {activeModal === 'transactions' && (
                  <button onClick={() => { closeModal(); setCurrentPage('reports'); }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Reports
                  </button>
                )}
                {activeModal === 'returns' && (
                  <button onClick={() => { closeModal(); setCurrentPage('returns'); }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> All Returns
                  </button>
                )}
                <button onClick={closeModal} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-3">

              {/* ── Today's Sales ── */}
              {activeModal === 'sales' && (
                todaySales.length === 0
                  ? <EmptyState icon={<TrendingUp className="w-10 h-10" />} text="No sales today yet" />
                  : todaySales.map((sale) => (
                    <SaleRow
                      key={sale.id}
                      sale={sale}
                      formatCurrency={formatCurrency}
                      onReturn={() => { closeModal(); setCurrentPage('returns'); }}
                    />
                  ))
              )}

              {/* ── Low Stock ── */}
              {activeModal === 'lowstock' && (
                lowStockProducts.length === 0
                  ? <EmptyState icon={<Package className="w-10 h-10" />} text="All products are well stocked" />
                  : lowStockProducts.map((product) => (
                    <LowStockRow
                      key={product.id}
                      product={product}
                      threshold={shopSettings.lowStockThreshold || 5}
                      onEdit={() => { closeModal(); setCurrentPage('inventory'); }}
                    />
                  ))
              )}

              {/* ── All Transactions ── */}
              {activeModal === 'transactions' && (
                recentSales.length === 0
                  ? <EmptyState icon={<Receipt className="w-10 h-10" />} text="No transactions yet" />
                  : recentSales.map((sale) => (
                    <SaleRow
                      key={sale.id}
                      sale={sale}
                      formatCurrency={formatCurrency}
                      onReturn={() => { closeModal(); setCurrentPage('returns'); }}
                    />
                  ))
              )}

              {/* ── Today's Returns ── */}
              {activeModal === 'returns' && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Returns Today</p>
                      <p className="text-2xl font-bold text-orange-400">{todayReturns.length}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs">Total Refunded</p>
                      <p className="text-2xl font-bold text-red-400">{formatCurrency(todayRefundAmount)}</p>
                    </div>
                  </div>

                  {todayReturns.length === 0
                    ? <EmptyState icon={<RotateCcw className="w-10 h-10" />} text="No returns today" />
                    : todayReturns.map((ret) => (
                      <ReturnRow
                        key={ret.id}
                        ret={ret}
                        formatCurrency={formatCurrency}
                        selected={selectedReturn?.id === ret.id}
                        onSelect={() => setSelectedReturn(selectedReturn?.id === ret.id ? null : ret)}
                      />
                    ))
                  }

                  <button
                    onClick={() => { closeModal(); setCurrentPage('returns'); }}
                    className="w-full mt-2 py-2.5 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Process New Return
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-12 text-slate-500">
      <div className="flex justify-center mb-3 opacity-30">{icon}</div>
      <p>{text}</p>
    </div>
  );
}

function SaleRow({
  sale,
  formatCurrency,
  onReturn,
}: {
  sale: Sale;
  formatCurrency: (v: number) => string;
  onReturn: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
      <button
        className="w-full p-4 text-left hover:bg-slate-700/70 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Order #{sale.id.slice(-6)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {format(new Date(sale.date), 'MMM d, yyyy HH:mm')} — {sale.cashierName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-green-400">{formatCurrency(sale.total)}</span>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-600 px-4 pb-4 pt-3 space-y-2">
          {/* Items */}
          <div className="space-y-1">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-300">{item.name} <span className="text-slate-500">×{item.quantity}</span></span>
                <span className="text-slate-300">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="border-t border-slate-600/50 pt-2 flex justify-between text-sm">
            <span className="text-slate-400">Total</span>
            <span className="font-bold text-green-400">{formatCurrency(sale.total)}</span>
          </div>
          {/* Action */}
          <button
            onClick={onReturn}
            className="w-full mt-1 py-2 bg-orange-600/80 hover:bg-orange-600 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Process Return for This Sale
          </button>
        </div>
      )}
    </div>
  );
}

function LowStockRow({
  product,
  threshold,
  onEdit,
}: {
  product: Product;
  threshold: number;
  onEdit: () => void;
}) {
  const isOut = product.stock === 0;
  return (
    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isOut ? 'bg-red-500' : 'bg-yellow-500'}`} />
        <div>
          <p className="font-medium text-sm">{product.name}</p>
          <p className="text-xs text-slate-400">{product.sku}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`font-bold text-sm ${isOut ? 'text-red-400' : 'text-yellow-400'}`}>
            {isOut ? 'Out of stock' : `${product.stock} left`}
          </p>
          <p className="text-xs text-slate-500">threshold: {threshold}</p>
        </div>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
        >
          Edit <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ReturnRow({
  ret,
  formatCurrency,
  selected,
  onSelect,
}: {
  ret: SaleReturn;
  formatCurrency: (v: number) => string;
  selected: boolean;
  onSelect: () => void;
}) {
  const STATUS_STYLES: Record<string, string> = {
    approved: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    rejected: 'bg-red-500/20 text-red-400',
  };
  return (
    <div className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
      <button className="w-full p-4 text-left hover:bg-slate-700/70 transition-colors" onClick={onSelect}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Return #{ret.id.slice(-6)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Sale #{ret.saleId.slice(-6)} — {ret.processedByName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[ret.status]}`}>{ret.status}</span>
            <span className="font-bold text-red-400">{formatCurrency(ret.refundAmount)}</span>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selected ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </button>

      {selected && (
        <div className="border-t border-slate-600 px-4 pb-4 pt-3 space-y-2">
          {ret.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-300">{item.name} <span className="text-slate-500">×{item.quantity}</span></span>
              <span className="text-red-400">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          {ret.notes && (
            <p className="text-xs text-slate-400 bg-slate-700 rounded p-2 mt-1">Note: {ret.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
