import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../contexts/StoreContext';
import {
  ShoppingCart, Search, Minus, Plus, X, Receipt, Flame, ScanBarcode,
  Phone, Volume2, VolumeX, Tag, Pause, Play, CreditCard, Wallet,
  Banknote, Layers, Pencil, Check, User,
} from 'lucide-react';
import { format } from 'date-fns';
import ReceiptPrinter from './ReceiptPrinter';
import { Product } from '../types';

// ─────────────────────────────────────────────
// Local Types
// ─────────────────────────────────────────────

interface POSItem {
  lineId: string;
  product: Product;
  quantity: number;
  unitPrice: number;        // may be overridden
  originalPrice: number;    // always product.salePrice
  priceOverride: boolean;
  itemDiscountType: 'none' | 'fixed' | 'percentage';
  itemDiscountValue: number;
}

type PayMethod = 'cash' | 'card' | 'wallet';

interface PayEntry {
  method: PayMethod;
  amount: string;
}

interface HeldCart {
  id: string;
  label: string;
  savedAt: string;
  items: POSItem[];
  customerPhone: string;
  customerName: string;
  cartDiscountType: 'fixed' | 'percentage';
  cartDiscountValue: number;
}

// ─────────────────────────────────────────────
// Pure Helpers
// ─────────────────────────────────────────────

/** Round to 2 decimal places — avoids float drift */
const r2 = (n: number) => Math.round(n * 100) / 100;

function lineCalc(item: POSItem) {
  const subtotal = r2(item.unitPrice * item.quantity);
  let discount = 0;
  if (item.itemDiscountType === 'fixed') {
    discount = r2(Math.min(item.itemDiscountValue, subtotal));
  } else if (item.itemDiscountType === 'percentage') {
    discount = r2(subtotal * Math.min(item.itemDiscountValue, 100) / 100);
  }
  return { subtotal, discount, total: r2(subtotal - discount) };
}

const HELD_KEY = 'pos_held_carts';
const loadHeld = (): HeldCart[] => {
  try { return JSON.parse(localStorage.getItem(HELD_KEY) || '[]'); } catch { return []; }
};
const saveHeld = (carts: HeldCart[]) =>
  localStorage.setItem(HELD_KEY, JSON.stringify(carts));

const newLineId = () =>
  `ln-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function POS() {
  const {
    products, categories, addSale,
    shopSettings, todaySales, hotSellingProducts,
    currentUser, hasPermission,
    posSearch, setPosSearch,
    sales, setCurrentPage, setSelectedCustomerPhone,
  } = useStore();

  // ── Cart ──────────────────────────────────
  const [items, setItems]                   = useState<POSItem[]>([]);
  const [customerPhone, setCustomerPhone]   = useState('');
  const [customerName, setCustomerName]     = useState('');
  const [autoMerge, setAutoMerge]           = useState(true);
  const [cartDiscType, setCartDiscType]     = useState<'fixed' | 'percentage'>('fixed');
  const [cartDiscValue, setCartDiscValue]   = useState(0);

  // ── Held Carts ────────────────────────────
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(loadHeld);

  // ── Tax ───────────────────────────────────
  const [taxMode, setTaxMode] = useState<'none' | 'inclusive' | 'exclusive'>('none');
  const [taxRate, setTaxRate] = useState(0);

  // ── UI ────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lastSale, setLastSale]                 = useState<any>(null);
  const [showPayModal, setShowPayModal]         = useState(false);

  // price override UI
  const [overrideLine, setOverrideLine]   = useState<string | null>(null);
  const [overrideInput, setOverrideInput] = useState('');

  // item discount UI
  const [discountLine, setDiscountLine] = useState<string | null>(null);

  // ── Payment ───────────────────────────────
  const [payMode, setPayMode]           = useState<'single' | 'split' | 'partial'>('single');
  const [singleMethod, setSingleMethod] = useState<PayMethod>('cash');
  const [singleAmount, setSingleAmount] = useState('');
  const [splitEntries, setSplitEntries] = useState<PayEntry[]>([
    { method: 'cash', amount: '' },
    { method: 'card', amount: '' },
  ]);
  const [partialPaid, setPartialPaid]       = useState('');
  const [udharCustomer, setUdharCustomer]   = useState('');

  // ── Barcode ───────────────────────────────
  const [barcodeMode, setBarcodeMode]   = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFlash, setBarcodeFlash] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanHistory, setScanHistory]   = useState<{ name: string; time: string; success: boolean }[]>([]);
  const scanTimeout     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastInputTime   = useRef(0);

  // ─────────────────────────────────────────
  // Computed totals (memoised)
  // ─────────────────────────────────────────

  const computed = useMemo(() => {
    const lineItems = items.map(item => ({ item, ...lineCalc(item) }));
    const linesTotal = r2(lineItems.reduce((s, l) => s + l.total, 0));

    let cartDisc = 0;
    if (cartDiscType === 'fixed') cartDisc = r2(Math.min(cartDiscValue, linesTotal));
    else cartDisc = r2(linesTotal * Math.min(cartDiscValue, 100) / 100);

    const afterDiscount = r2(linesTotal - cartDisc);

    let taxAmount = 0;
    let grandTotal = afterDiscount;
    if (taxMode === 'exclusive' && taxRate > 0) {
      taxAmount  = r2(afterDiscount * taxRate / 100);
      grandTotal = r2(afterDiscount + taxAmount);
    } else if (taxMode === 'inclusive' && taxRate > 0) {
      taxAmount = r2(afterDiscount - afterDiscount / (1 + taxRate / 100));
      // grandTotal stays the same (tax already inside)
    }

    return { lineItems, linesTotal, cartDisc, afterDiscount, taxAmount, grandTotal };
  }, [items, cartDiscType, cartDiscValue, taxMode, taxRate]);

  const { lineItems, linesTotal, cartDisc, taxAmount, grandTotal } = computed;

  const splitTotal    = useMemo(() => r2(splitEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)), [splitEntries]);
  const singleAmtNum  = parseFloat(singleAmount) || 0;
  const partialPaidNum = parseFloat(partialPaid) || 0;

  const formatCurrency = (v: number) =>
    `${shopSettings.currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Past sales for the phone currently entered (for returning-customer hint)
  const pastCustomerSales = useMemo(() => {
    const phone = customerPhone.trim();
    if (phone.length < 4) return [] as typeof sales;
    return sales.filter(s => (s.customerPhone || '').trim() === phone);
  }, [sales, customerPhone]);

  // Auto-fill name from latest known sale when a known phone is entered
  useEffect(() => {
    if (pastCustomerSales.length === 0 || customerName.trim()) return;
    const latestWithName = pastCustomerSales.find(s => s.customerName && s.customerName.trim());
    if (latestWithName?.customerName) setCustomerName(latestWithName.customerName);
  }, [pastCustomerSales]); // eslint-disable-line

  // ─────────────────────────────────────────
  // Cart Functions
  // ─────────────────────────────────────────

  const addProductToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return;
    setItems(prev => {
      // Scenario 8: merge only when autoMerge ON + same product + same (non-overridden) price
      if (autoMerge) {
        const existing = prev.find(
          l => l.product.id === product.id &&
               !l.priceOverride &&
               l.unitPrice === product.salePrice
        );
        if (existing) {
          const newQty = existing.quantity + 1;
          if (newQty > product.stock) return prev;
          return prev.map(l =>
            l.lineId === existing.lineId ? { ...l, quantity: newQty } : l
          );
        }
      }
      // New line — Scenario 7: same product different price → separate line
      return [...prev, {
        lineId: newLineId(),
        product,
        quantity: 1,
        unitPrice: product.salePrice,
        originalPrice: product.salePrice,
        priceOverride: false,
        itemDiscountType: 'none',
        itemDiscountValue: 0,
      }];
    });
  }, [autoMerge]);

  // Scenario 9: remove single line without affecting others
  const removeLine = (lineId: string) => {
    setItems(prev => prev.filter(l => l.lineId !== lineId));
    if (overrideLine === lineId) setOverrideLine(null);
    if (discountLine === lineId) setDiscountLine(null);
  };

  const updateQty = (lineId: string, qty: number) => {
    setItems(prev => prev.map(l => {
      if (l.lineId !== lineId) return l;
      return { ...l, quantity: Math.max(1, Math.min(qty, l.product.stock)) };
    }));
  };

  // Scenario 4: price override (permission-gated)
  const applyPriceOverride = (lineId: string) => {
    const price = parseFloat(overrideInput);
    if (isNaN(price) || price < 0) return;
    setItems(prev => prev.map(l =>
      l.lineId === lineId
        ? { ...l, unitPrice: r2(price), priceOverride: r2(price) !== l.originalPrice }
        : l
    ));
    setOverrideLine(null);
    setOverrideInput('');
  };

  // Scenario 5: item-level discount
  const applyItemDiscount = (
    lineId: string,
    type: 'none' | 'fixed' | 'percentage',
    value: number
  ) => {
    setItems(prev => prev.map(l =>
      l.lineId === lineId
        ? { ...l, itemDiscountType: type, itemDiscountValue: value }
        : l
    ));
  };

  // ─────────────────────────────────────────
  // Held Carts  (Scenarios 10 & 11)
  // ─────────────────────────────────────────

  const holdCart = useCallback(() => {
    if (items.length === 0) return;
    const held: HeldCart = {
      id: `hold-${Date.now()}`,
      label: `Cart ${heldCarts.length + 1} — ${format(new Date(), 'HH:mm')}`,
      savedAt: new Date().toISOString(),
      items,
      customerPhone,
      customerName,
      cartDiscountType: cartDiscType,
      cartDiscountValue: cartDiscValue,
    };
    const updated = [...heldCarts, held];
    setHeldCarts(updated);
    saveHeld(updated);
    clearCartState();
  }, [items, heldCarts, customerPhone, customerName, cartDiscType, cartDiscValue]); // eslint-disable-line

  const resumeCart = (id: string) => {
    const held = heldCarts.find(c => c.id === id);
    if (!held) return;
    if (items.length > 0) holdCart();   // auto-hold current cart
    setItems(held.items);
    setCustomerPhone(held.customerPhone);
    setCustomerName(held.customerName || '');
    setCartDiscType(held.cartDiscountType);
    setCartDiscValue(held.cartDiscountValue);
    const updated = heldCarts.filter(c => c.id !== id);
    setHeldCarts(updated);
    saveHeld(updated);
  };

  const deleteHeldCart = (id: string) => {
    const updated = heldCarts.filter(c => c.id !== id);
    setHeldCarts(updated);
    saveHeld(updated);
  };

  const clearCartState = () => {
    setItems([]);
    setCustomerPhone('');
    setCustomerName('');
    setCartDiscValue(0);
    setCartDiscType('fixed');
    setOverrideLine(null);
    setDiscountLine(null);
  };

  // ─────────────────────────────────────────
  // Payment
  // ─────────────────────────────────────────

  const openPayment = () => {
    if (items.length === 0) return;
    setSingleAmount(grandTotal.toString());
    setShowPayModal(true);
  };

  const closePayment = () => {
    setShowPayModal(false);
    setSingleAmount('');
    setPartialPaid('');
    setUdharCustomer('');
  };

  // Scenario 1/2/3 — validation
  const canComplete = (() => {
    if (items.length === 0) return false;
    if (payMode === 'single') {
      if (singleMethod === 'cash') return singleAmtNum >= grandTotal;
      return true; // card/wallet = exact amount
    }
    if (payMode === 'split')   return Math.abs(splitTotal - grandTotal) < 0.005;
    if (payMode === 'partial') return partialPaidNum > 0 && partialPaidNum < grandTotal;
    return false;
  })();

  const handleCompletePayment = () => {
    if (!canComplete) return;

    // Scenario 3: change rounded to 2dp
    let cashReceived = 0;
    let change = 0;
    let creditAmount = 0;
    const paymentMethods: { method: string; amount: number }[] = [];

    if (payMode === 'single') {
      if (singleMethod === 'cash') {
        cashReceived = singleAmtNum;
        change       = r2(singleAmtNum - grandTotal);
      } else {
        cashReceived = grandTotal;
      }
      paymentMethods.push({ method: singleMethod, amount: grandTotal });
    } else if (payMode === 'split') {
      // Scenario 1: split payment
      cashReceived = splitTotal;
      splitEntries.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        if (amt > 0) paymentMethods.push({ method: e.method, amount: r2(amt) });
      });
    } else if (payMode === 'partial') {
      // Scenario 2: partial + udhaar
      cashReceived  = partialPaidNum;
      creditAmount  = r2(grandTotal - partialPaidNum);
      paymentMethods.push({ method: 'cash', amount: partialPaidNum });
    }

    // Build sale items (Scenarios 4 & 5)
    const saleItems = lineItems.map(({ item, discount }) => ({
      productId:     item.product.id,
      name:          item.product.name,
      price:         item.unitPrice,
      quantity:      item.quantity,
      sku:           item.product.sku,
      originalPrice: item.priceOverride ? item.originalPrice : undefined,
      itemDiscount:  discount > 0 ? discount : undefined,
    }));

    const totalItemDiscount = lineItems.reduce((s, l) => s + l.discount, 0);

    const saleData: any = {
      date:          new Date().toISOString(),
      items:         saleItems,
      subtotal:      r2(linesTotal + totalItemDiscount), // pre-item-discount subtotal
      discountType:  cartDiscType,
      discountValue: cartDiscValue,
      discountAmount: cartDisc,
      total:         grandTotal,
      cashReceived,
      change,
      cashierId:    currentUser?.id   || 'unknown',
      cashierName:  currentUser?.name || 'Unknown',
      customerPhone: customerPhone.trim() || '',
      customerName:  customerName.trim()  || '',
      // Extended fields — always send paymentMethods so accounting routes correctly
      // (single-card and single-wallet sales need this too, not just splits).
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
      creditAmount:   creditAmount > 0 ? creditAmount  : undefined,
      creditCustomer: creditAmount > 0 ? udharCustomer : undefined,
      taxAmount:      taxAmount > 0   ? taxAmount  : undefined,
      taxMode:        taxMode !== 'none' ? taxMode   : undefined,
      taxRate:        taxRate > 0     ? taxRate   : undefined,
    };

    addSale(saleData);
    setLastSale({ ...saleData, id: 'sale-' + Date.now() });
    clearCartState();
    closePayment();
  };

  // ─────────────────────────────────────────
  // Barcode Scanner  (Scenario 13)
  // ─────────────────────────────────────────

  const playBeep = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = success ? 1200 : 300;
      gain.gain.value     = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.1 : 0.3));
    } catch { /* AudioContext unavailable */ }
  }, [soundEnabled]);

  const processBarcode = useCallback((code: string) => {
    const trimmed = code.trim();
    if (trimmed.length < 2) return;

    // Scenario 13: barcode lookup with fallback matching
    const product = products.find(p =>
      p.barcode === trimmed ||
      p.sku     === trimmed ||
      p.barcode === trimmed.replace(/^0+/, '') ||
      p.sku?.toLowerCase() === trimmed.toLowerCase()
    );
    const time = format(new Date(), 'HH:mm:ss');

    if (product && product.stock > 0) {
      addProductToCart(product);
      setBarcodeFlash(product.name);
      playBeep(true);
      setScanHistory(prev => [{ name: product.name, time, success: true }, ...prev].slice(0, 10));
      setTimeout(() => setBarcodeFlash(''), 1500);
    } else {
      // Scenario 13: warn — not found or out of stock
      const msg = product ? `Out of stock: ${product.name}` : `Not found: "${trimmed}"`;
      setBarcodeFlash(msg);
      playBeep(false);
      setScanHistory(prev => [{ name: msg, time, success: false }, ...prev].slice(0, 10));
      setTimeout(() => setBarcodeFlash(''), 2500);
    }
    setBarcodeInput('');
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  }, [products, addProductToCart, playBeep]);

  const handleBarcodeChange = useCallback((value: string) => {
    const now = Date.now();
    setBarcodeInput(value);
    if (scanTimeout.current) clearTimeout(scanTimeout.current);
    const delta     = now - lastInputTime.current;
    lastInputTime.current = now;
    const isScanner = delta < 50 && value.length > 1;
    if (value.length >= 3) {
      scanTimeout.current = setTimeout(() => {
        if (isScanner || value.length >= 6) processBarcode(value);
      }, 200);
    }
  }, [processBarcode]);

  const handleBarcodeKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
      const val = (e.target as HTMLInputElement).value;
      if (val.trim().length >= 2) processBarcode(val);
    }
  }, [processBarcode]);

  useEffect(() => {
    if (!barcodeMode) return;
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
    const refocus = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tag    = target.tagName;
      const isOtherInput = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
                           && target !== barcodeInputRef.current;
      const isButton     = tag === 'BUTTON' || !!target.closest('button');
      if (!isOtherInput && !isButton)
        setTimeout(() => barcodeInputRef.current?.focus(), 10);
    };
    document.addEventListener('click', refocus);
    return () => {
      document.removeEventListener('click', refocus);
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
    };
  }, [barcodeMode]);

  // ─────────────────────────────────────────
  // Misc
  // ─────────────────────────────────────────

  const filteredProducts = products.filter(p => {
    const q = posSearch.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) ||
                        p.sku.toLowerCase().includes(q) ||
                        (p.barcode && p.barcode.includes(posSearch));
    const matchCat = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const canOverridePrice = hasPermission('pos.price_override');
  const canDiscount      = hasPermission('pos.discount');

  // ─────────────────────────────────────────
  // Receipt screen
  // ─────────────────────────────────────────

  if (lastSale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block bg-green-500/20 p-4 rounded-full mb-4">
              <Receipt className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {lastSale.creditAmount ? 'Sale + Udhaar Recorded!' : 'Payment Successful!'}
            </h1>
            <p className="text-slate-400">Transaction completed</p>
            {lastSale.creditAmount > 0 && (
              <p className="mt-2 text-orange-400 font-semibold">
                Credit (Udhaar): {formatCurrency(lastSale.creditAmount)}
                {lastSale.creditCustomer ? ` — ${lastSale.creditCustomer}` : ''}
              </p>
            )}
          </div>
          <ReceiptPrinter sale={lastSale} />
          <div className="mt-6 text-center">
            <button
              onClick={() => setLastSale(null)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              ← Back to POS
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // Main POS Layout
  // ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col lg:flex-row lg:p-4 gap-4 p-4">

      {/* ══ Products Panel ══════════════════════════════════════ */}
      <div className="flex-1">
        <div className="mb-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Point of Sale</h1>
            <button
              onClick={() => setBarcodeMode(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                barcodeMode ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <ScanBarcode className="w-5 h-5" />
              {barcodeMode ? 'Scanner ON' : 'Scanner OFF'}
            </button>
          </div>

          {/* Barcode panel (Scenario 13) */}
          {barcodeMode && (
            <div className="mb-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">Barcode Scanner Active</span>
                </div>
                <button
                  onClick={() => setSoundEnabled(v => !v)}
                  className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  {soundEnabled
                    ? <Volume2 className="w-4 h-4 text-green-400" />
                    : <VolumeX className="w-4 h-4 text-slate-500" />}
                </button>
              </div>

              {barcodeInput && (
                <p className="text-green-300 font-mono text-sm mt-1">Reading: {barcodeInput}</p>
              )}
              {barcodeFlash && (
                <p className={`font-semibold text-sm mt-1 ${
                  barcodeFlash.startsWith('Not') || barcodeFlash.startsWith('Out')
                    ? 'text-red-400' : 'text-green-300'
                }`}>
                  {barcodeFlash}
                </p>
              )}

              <div className="mt-2 relative">
                <ScanBarcode className="absolute left-3 top-2.5 w-4 h-4 text-green-500" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => handleBarcodeChange(e.target.value)}
                  onKeyDown={handleBarcodeKey}
                  placeholder="Scan barcode or type SKU + Enter…"
                  autoFocus
                  className="w-full pl-9 pr-9 py-2 bg-slate-700 border border-green-500/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                />
                {barcodeInput && (
                  <button
                    onClick={() => {
                      handleBarcodeChange('');
                      barcodeInputRef.current?.focus();
                    }}
                    title="Clear"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {scanHistory.length > 0 && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  <p className="text-xs text-slate-500 font-medium">Recent scans:</p>
                  {scanHistory.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={s.success ? 'text-green-300' : 'text-red-400'}>{s.name}</span>
                      <span className="text-slate-600 ml-auto">{s.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search + Category filter */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode…"
                value={posSearch}
                onChange={e => setPosSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {posSearch && (
                <button
                  onClick={() => setPosSearch('')}
                  title="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === '' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >All</button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
                    selectedCategory === cat.name ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Today's summary */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Today's Sales</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(todaySales.reduce((s, t) => s + t.total, 0))}
                </p>
                <p className="text-xs text-slate-400 mt-1">{todaySales.length} {todaySales.length === 1 ? 'transaction' : 'transactions'}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Date</p>
                <p className="text-lg font-bold">{format(new Date(), 'd MMM yyyy')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 mb-4">
          {filteredProducts.map(product => {
            const outOfStock = product.stock === 0;
            return (
              <div
                key={product.id}
                onClick={() => { if (!outOfStock) addProductToCart(product); }}
                className={`p-3 rounded-lg border transition-colors text-left flex flex-col ${
                  outOfStock
                    ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                    : 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-700 cursor-pointer'
                }`}
              >
                <p className="font-semibold text-sm line-clamp-2">{product.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {product.sku}
                  {product.barcode && <span className="ml-1 text-slate-500">| {product.barcode}</span>}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-blue-400 font-bold text-sm">{formatCurrency(product.salePrice)}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    product.stock < 10 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {product.stock} in stock
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); addProductToCart(product); }}
                  disabled={outOfStock}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    outOfStock
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            );
          })}
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-slate-400"><p>No products found</p></div>
        )}

        {/* Hot sellers */}
        {hotSellingProducts.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-sm">Hot Sellers</h3>
            </div>
            <div className="space-y-1">
              {hotSellingProducts.slice(0, 3).map((item, idx) => (
                <p key={item.product.id} className="text-xs text-slate-400">
                  {idx + 1}. {item.product.name} — {item.sold} sold
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ Cart Panel — only when needed ═══════════════════════ */}
      {(items.length > 0 || heldCarts.length > 0) && (
      <div className="w-full lg:w-96 flex flex-col gap-3">

        {/* Cart header */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <h2 className="text-xl font-bold">Cart</h2>
              <span className="bg-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {items.reduce((s, l) => s + l.quantity, 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Scenario 8: merge toggle */}
              <button
                onClick={() => setAutoMerge(v => !v)}
                title={autoMerge ? 'Auto-merge ON' : 'Auto-merge OFF (each add = new line)'}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  autoMerge ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'bg-slate-700 text-slate-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {autoMerge ? 'Merge' : 'Separate'}
              </button>

              {/* Scenario 10: hold cart */}
              <button
                onClick={holdCart}
                disabled={items.length === 0}
                title="Hold cart and start new one"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" /> Hold
              </button>
            </div>
          </div>

          {/* Scenario 10 & 11: held cart list */}
          {heldCarts.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 font-medium mb-1">Held carts ({heldCarts.length})</p>
              {heldCarts.map(held => (
                <div key={held.id} className="flex items-center gap-2 bg-slate-700/60 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{held.label}</p>
                    <p className="text-xs text-slate-500">{held.items.length} item(s)</p>
                  </div>
                  <button
                    onClick={() => resumeCart(held.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600/80 hover:bg-blue-600 rounded text-xs text-white transition-colors"
                  >
                    <Play className="w-3 h-3" /> Resume
                  </button>
                  <button
                    onClick={() => deleteHeldCart(held.id)}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
        <>
        {/* Customer phone + name */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Customer</span>
            <span className="text-xs text-slate-500">(optional)</span>
          </div>
          <div className="relative">
            <input
              type="tel"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="Phone — e.g. 0300-1234567"
              className="w-full px-3 pr-9 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {customerPhone && (
              <button
                onClick={() => { setCustomerPhone(''); setCustomerName(''); }}
                title="Clear"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full px-3 pr-9 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {customerName && (
              <button
                onClick={() => setCustomerName('')}
                title="Clear"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Returning customer hint */}
          {pastCustomerSales.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300 flex-1 min-w-0">
                Returning customer · {pastCustomerSales.length} {pastCustomerSales.length === 1 ? 'visit' : 'visits'}
                {' · last '}{format(new Date(pastCustomerSales[0].date), 'd MMM')}
                {' · spent '}{formatCurrency(pastCustomerSales.reduce((s, x) => s + x.total, 0))}
              </p>
              <button
                onClick={() => {
                  setSelectedCustomerPhone(customerPhone.trim());
                  setCurrentPage('customers');
                }}
                className="text-xs text-blue-300 hover:text-blue-200 underline whitespace-nowrap"
              >
                View history
              </button>
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex-1 overflow-y-auto max-h-[480px]">
          {items.length > 0 ? (
            <div className="space-y-3">
              {lineItems.map(({ item, discount, total }) => (
                <div key={item.lineId} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">

                  {/* Name + remove */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-slate-400">{item.product.sku}</p>
                    </div>
                    {/* Scenario 9: remove single item */}
                    <button
                      onClick={() => removeLine(item.lineId)}
                      className="text-red-400 hover:text-red-300 ml-2 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Price row — Scenario 4: price override */}
                  <div className="flex items-center justify-between mb-2">
                    {overrideLine === item.lineId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          autoFocus
                          value={overrideInput}
                          onChange={e => setOverrideInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') applyPriceOverride(item.lineId);
                            if (e.key === 'Escape') setOverrideLine(null);
                          }}
                          className="w-24 px-2 py-1 bg-slate-600 border border-blue-500 rounded text-white text-sm focus:outline-none"
                          min="0" step="0.01"
                        />
                        <button
                          onClick={() => applyPriceOverride(item.lineId)}
                          className="p-1 bg-green-600 rounded text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setOverrideLine(null)}
                          className="p-1 bg-slate-600 rounded text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${item.priceOverride ? 'text-yellow-400' : 'text-blue-400'}`}>
                          {formatCurrency(item.unitPrice)}
                        </span>
                        {item.priceOverride && (
                          <span className="text-xs text-slate-500 line-through">
                            {formatCurrency(item.originalPrice)}
                          </span>
                        )}
                        {canOverridePrice && (
                          <button
                            onClick={() => {
                              setOverrideLine(item.lineId);
                              setOverrideInput(item.unitPrice.toString());
                            }}
                            title="Override price"
                            className="p-0.5 text-slate-500 hover:text-yellow-400 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-slate-400">= {formatCurrency(total)}</span>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center bg-slate-600 rounded-lg">
                      <button
                        onClick={() => updateQty(item.lineId, item.quantity - 1)}
                        className="p-1 hover:bg-slate-500 rounded-l-lg"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQty(item.lineId, parseInt(e.target.value) || 1)}
                        className="w-12 text-center bg-transparent border-none text-white text-sm outline-none"
                        min="1" max={item.product.stock}
                      />
                      <button
                        onClick={() => updateQty(item.lineId, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="p-1 hover:bg-slate-500 disabled:opacity-50 rounded-r-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">Max: {item.product.stock}</span>
                  </div>

                  {/* Scenario 5: item-level discount */}
                  {canDiscount && (
                    discountLine === item.lineId ? (
                      <div className="flex items-center gap-1 mt-1">
                        <select
                          value={item.itemDiscountType}
                          onChange={e => applyItemDiscount(item.lineId, e.target.value as any, item.itemDiscountValue)}
                          className="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-xs text-white focus:outline-none"
                        >
                          <option value="none">No disc.</option>
                          <option value="fixed">Fixed</option>
                          <option value="percentage">%</option>
                        </select>
                        {item.itemDiscountType !== 'none' && (
                          <input
                            type="number"
                            value={item.itemDiscountValue || ''}
                            onChange={e => applyItemDiscount(item.lineId, item.itemDiscountType, parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-xs text-white focus:outline-none"
                            min="0"
                          />
                        )}
                        <button
                          onClick={() => setDiscountLine(null)}
                          className="p-1 text-green-400 hover:text-green-300"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDiscountLine(item.lineId)}
                        className={`flex items-center gap-1 text-xs mt-1 transition-colors ${
                          discount > 0 ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        {discount > 0 ? `Item disc: -${formatCurrency(discount)}` : 'Add item discount'}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 py-12">
              <p>Cart is empty</p>
            </div>
          )}
        </div>

        {/* Scenario 5: Cart-level discount */}
        {items.length > 0 && canDiscount && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <h3 className="font-bold mb-3 text-sm">Cart Discount</h3>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setCartDiscType('fixed')}
                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                  cartDiscType === 'fixed' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >Fixed</button>
              <button
                onClick={() => setCartDiscType('percentage')}
                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                  cartDiscType === 'percentage' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >%</button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={cartDiscValue || ''}
                onChange={e => {
                  const v = Math.max(0, parseFloat(e.target.value) || 0);
                  setCartDiscValue(cartDiscType === 'percentage' ? Math.min(100, v) : v);
                }}
                placeholder="0"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="px-3 py-2 bg-slate-700 rounded-lg text-slate-300 text-sm">
                {cartDiscType === 'percentage' ? '%' : shopSettings.currency}
              </span>
            </div>
            {cartDisc > 0 && (
              <p className="text-green-400 text-xs mt-2">Cart saving: {formatCurrency(cartDisc)}</p>
            )}
          </div>
        )}

        {/* Scenario 6: Tax toggle */}
        {items.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">Tax</h3>
              <div className="flex gap-1">
                {(['none', 'inclusive', 'exclusive'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setTaxMode(mode)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taxMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {mode === 'none' ? 'None' : mode === 'inclusive' ? 'Incl.' : 'Excl.'}
                  </button>
                ))}
              </div>
            </div>
            {taxMode !== 'none' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={taxRate || ''}
                  onChange={e => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Rate %"
                  className="w-24 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none"
                />
                <span className="text-sm text-slate-400">%</span>
                {taxAmount > 0 && (
                  <span className="text-xs text-slate-400 ml-auto">
                    Tax: {formatCurrency(taxAmount)}{taxMode === 'inclusive' ? ' (incl.)' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Totals summary */}
        {items.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Items subtotal:</span>
              <span>{formatCurrency(linesTotal)}</span>
            </div>
            {lineItems.some(l => l.discount > 0) && (
              <div className="flex justify-between text-sm text-orange-400">
                <span>Item discounts:</span>
                <span>-{formatCurrency(lineItems.reduce((s, l) => s + l.discount, 0))}</span>
              </div>
            )}
            {cartDisc > 0 && (
              <div className="flex justify-between text-sm text-red-400">
                <span>Cart discount:</span>
                <span>-{formatCurrency(cartDisc)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>Tax ({taxRate}%{taxMode === 'inclusive' ? ' incl.' : ''}):</span>
                <span>{taxMode === 'exclusive' ? '+' : ''}{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="border-t border-slate-600 pt-2 flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-400">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        )}

        {/* Proceed button */}
        <button
          onClick={openPayment}
          disabled={items.length === 0}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-lg"
        >
          Proceed to Payment
        </button>
        </>
        )}
      </div>
      )}

      {/* ══ Payment Modal ════════════════════════════════════════ */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md max-h-[92vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold">Payment</h2>
              <button onClick={closePayment} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer */}
              {customerPhone && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 text-sm">Customer: {customerPhone}</span>
                </div>
              )}

              {/* Amount due */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 text-center">
                <p className="text-slate-400 text-sm mb-1">Amount Due</p>
                <p className="text-4xl font-bold text-green-400">{formatCurrency(grandTotal)}</p>
                {taxAmount > 0 && (
                  <p className="text-xs text-slate-500 mt-1">incl. tax {formatCurrency(taxAmount)}</p>
                )}
              </div>

              {/* Payment mode tabs */}
              <div className="flex gap-2">
                {(['single', 'split', 'partial'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPayMode(mode)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      payMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {mode === 'single' ? 'Single' : mode === 'split' ? 'Split' : 'Partial / Udhaar'}
                  </button>
                ))}
              </div>

              {/* ─── Single Payment ─────────────────── */}
              {payMode === 'single' && (
                <div className="space-y-4">
                  {/* Method selector */}
                  <div className="flex gap-2">
                    {(['cash', 'card', 'wallet'] as PayMethod[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setSingleMethod(m)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                          singleMethod === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {m === 'cash'   && <Banknote className="w-4 h-4" />}
                        {m === 'card'   && <CreditCard className="w-4 h-4" />}
                        {m === 'wallet' && <Wallet className="w-4 h-4" />}
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>

                  {singleMethod === 'cash' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Cash Received ({shopSettings.currency})
                        </label>
                        <input
                          type="number"
                          value={singleAmount}
                          onChange={e => setSingleAmount(e.target.value)}
                          autoFocus
                          placeholder="0"
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        />
                      </div>
                      {/* Quick amounts */}
                      <div className="grid grid-cols-4 gap-2">
                        {[500, 1000, 2000, 5000].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setSingleAmount(amt.toString())}
                            className="py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors"
                          >
                            {amt >= 1000 ? `${amt / 1000}K` : amt}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setSingleAmount(grandTotal.toString())}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
                      >
                        Exact Amount
                      </button>

                      {/* Scenario 3: change with correct rounding */}
                      {singleAmtNum > 0 && (
                        <div className={`rounded-lg p-3 border ${
                          singleAmtNum >= grandTotal
                            ? 'bg-green-500/10 border-green-500/40'
                            : 'bg-red-500/10 border-red-500/40'
                        }`}>
                          <p className="text-xs text-slate-400">Change</p>
                          <p className={`text-2xl font-bold ${
                            singleAmtNum >= grandTotal ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {singleAmtNum >= grandTotal
                              ? formatCurrency(r2(singleAmtNum - grandTotal))
                              : `Short: ${formatCurrency(r2(grandTotal - singleAmtNum))}`}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-center">
                      <p className="text-slate-300 text-sm">
                        Charge {formatCurrency(grandTotal)} via {singleMethod}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">No change for {singleMethod} payments</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Scenario 1: Split Payment ──────── */}
              {payMode === 'split' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Distribute {formatCurrency(grandTotal)} across methods
                  </p>

                  {splitEntries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={entry.method}
                        onChange={e => {
                          const updated = [...splitEntries];
                          updated[idx] = { ...entry, method: e.target.value as PayMethod };
                          setSplitEntries(updated);
                        }}
                        className="px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="wallet">Wallet</option>
                      </select>
                      <input
                        type="number"
                        value={entry.amount}
                        onChange={e => {
                          const updated = [...splitEntries];
                          updated[idx] = { ...entry, amount: e.target.value };
                          setSplitEntries(updated);
                        }}
                        placeholder="Amount"
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {splitEntries.length > 2 && (
                        <button
                          onClick={() => setSplitEntries(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => setSplitEntries(prev => [...prev, { method: 'cash', amount: '' }])}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
                  >
                    + Add method
                  </button>

                  {/* Split total indicator */}
                  <div className={`rounded-lg p-3 border text-sm ${
                    Math.abs(splitTotal - grandTotal) < 0.005
                      ? 'bg-green-500/10 border-green-500/40'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total entered:</span>
                      <span className={Math.abs(splitTotal - grandTotal) < 0.005 ? 'text-green-400 font-bold' : 'text-white'}>
                        {formatCurrency(splitTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-400">Remaining:</span>
                      <span className={r2(grandTotal - splitTotal) <= 0 ? 'text-green-400' : 'text-yellow-400'}>
                        {formatCurrency(Math.max(0, r2(grandTotal - splitTotal)))}
                      </span>
                    </div>
                  </div>

                  {/* Auto-fill remainder */}
                  {splitTotal < grandTotal && (
                    <button
                      onClick={() => {
                        const rem = r2(grandTotal - splitTotal);
                        const updated = [...splitEntries];
                        let fillIdx = -1;
                        for (let i = updated.length - 1; i >= 0; i--) {
                          if (!updated[i].amount || parseFloat(updated[i].amount) === 0) {
                            fillIdx = i;
                            break;
                          }
                        }
                        if (fillIdx >= 0) {
                          updated[fillIdx] = { ...updated[fillIdx], amount: rem.toString() };
                        } else {
                          updated.push({ method: 'cash', amount: rem.toString() });
                        }
                        setSplitEntries(updated);
                      }}
                      className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
                    >
                      Fill remaining {formatCurrency(r2(grandTotal - splitTotal))}
                    </button>
                  )}
                </div>
              )}

              {/* ─── Scenario 2: Partial + Udhaar ───── */}
              {payMode === 'partial' && (
                <div className="space-y-4">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <p className="text-orange-300 text-sm font-medium">Partial Payment + Udhaar (Credit)</p>
                    <p className="text-orange-300/70 text-xs mt-1">
                      Customer pays part now; remainder recorded as credit
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Amount Paid Now ({shopSettings.currency})
                    </label>
                    <input
                      type="number"
                      value={partialPaid}
                      onChange={e => setPartialPaid(e.target.value)}
                      autoFocus
                      placeholder="0"
                      min="0"
                      max={grandTotal - 0.01}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                    />
                  </div>

                  {partialPaidNum > 0 && (
                    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Paid now:</span>
                        <span className="text-green-400 font-semibold">{formatCurrency(partialPaidNum)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-600 pt-2">
                        <span className="text-slate-400">Udhaar (credit):</span>
                        <span className="text-orange-400 font-bold">
                          {formatCurrency(r2(grandTotal - partialPaidNum))}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <User className="w-3.5 h-3.5 inline mr-1" />
                      Customer Name (for credit ledger)
                    </label>
                    <input
                      type="text"
                      value={udharCustomer}
                      onChange={e => setUdharCustomer(e.target.value)}
                      placeholder="Customer name…"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Complete button */}
              <button
                onClick={handleCompletePayment}
                disabled={!canComplete}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-base"
              >
                {payMode === 'partial'
                  ? `Complete — Pay ${formatCurrency(partialPaidNum)} + Udhaar ${formatCurrency(r2(grandTotal - partialPaidNum))}`
                  : `Complete Sale — ${formatCurrency(grandTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
