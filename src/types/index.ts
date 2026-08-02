export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  category: string;
  sku: string;
  barcode?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock?: number;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  originalPrice?: number;   // set when price was overridden
  itemDiscount?: number;    // per-line discount amount
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  total: number;
  cashReceived: number;
  change: number;
  cashierId: string;
  cashierName: string;
  customerPhone?: string;
  customerName?: string;
  // extended billing fields
  paymentMethods?: { method: string; amount: number }[];
  creditAmount?: number;
  creditCustomer?: string;
  taxAmount?: number;
  taxMode?: 'inclusive' | 'exclusive';
  taxRate?: number;
}

// User Roles and Permissions
export type UserRole = 'admin' | 'cashier' | 'staff' | 'accountant';

export interface Permission {
  id: string;
  name: string;
  label: string;
  labelAr: string;
  description: string;
}

export interface RolePermissions {
  [key: string]: boolean;
}

export interface User {
  id: string;
  name: string;
  nameAr?: string;
  email: string;
  password?: string;
  role: UserRole;
  permissions: RolePermissions;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface ShopSettings {
  shopName: string;
  shopNameAr?: string;
  shopAddress: string;
  shopAddressAr?: string;
  shopPhone: string;
  shopEmail: string;
  currency: string;
  lowStockThreshold: number;
  receiptFooter: string;
  receiptFooterAr?: string;
  logo?: string;
  defaultCashAccountId?: string | null;
  defaultBankAccountId?: string | null;
  defaultSalesIncomeAccountId?: string | null;
  defaultSalesReturnAccountId?: string | null;
  defaultCustomerReceivableAccountId?: string | null;
  defaultInventoryAccountId?: string | null;
  accountingClosedThroughDate?: string | null;
}

// ─── Chart of Accounts ───────────────────────────────────
export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'income'
  | 'expense'
  | 'customer'
  | 'supplier'
  | 'cash'
  | 'bank';

export interface ChartAccount {
  id: string;
  code: string;
  seriesCode?: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  controlAccount: boolean;
  allowPosting: boolean;
  openingDebit: number;
  openingCredit: number;
  openingDate?: string | null;
  mobile?: string;
  city?: string;
  notes?: string;
  accountRights?: string;
  isActive: boolean;
  isSystem: boolean;
  currentBalance?: number;
}

export type JournalSourceKind = 'sale' | 'return' | 'manual' | 'opening' | 'payment' | 'purchase';
export type VoucherType = 'SV' | 'RV' | 'JV' | 'CV' | 'BV' | 'PV' | 'OV';

export interface JournalLine {
  accountId: string;
  accountCode?: string;
  accountName?: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalAuditEntry {
  action: 'create' | 'edit' | 'reverse';
  by: { id: string; name: string };
  at: string | null;
  note: string;
}

export interface JournalEntry {
  id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  date: string;
  memo?: string;
  narration?: string;
  lines: JournalLine[];
  source: { kind: JournalSourceKind; refId: string | null };
  postedBy?: { id: string; name: string };
  locked: boolean;
  lockedAt?: string | null;
  reversed: boolean;
  reversedBy?: string | null;
  auditLog: JournalAuditEntry[];
  totalDebit: number;
  totalCredit: number;
  createdAt?: string | null;
}

export interface LedgerLine {
  entryId: string;
  date: string;
  memo: string;
  source: { kind: JournalSourceKind; refId: string | null };
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountLedger {
  account: ChartAccount;
  opening: number;
  closing: number;
  totalDebit: number;
  totalCredit: number;
  lines: LedgerLine[];
}

export interface TrialBalanceRow {
  account: ChartAccount;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalance {
  asOf: string | null;
  rows: TrialBalanceRow[];
  totals: {
    debit: number;
    credit: number;
    balanced: boolean;
    netAsset: number;
    netLiabIncome: number;
  };
}

// ─── Payment Vouchers ────────────────────────────────────
export type PaymentDirection = 'received' | 'paid';
export type PaymentMethodKind = 'cash' | 'bank';

export interface PaymentAllocation {
  refKind: 'sale' | 'purchase';
  refId: string | null;
  amount: number;
  note?: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  direction: PaymentDirection;
  partyAccountId: string | null;
  partyName: string;
  partyPhone: string;
  method: PaymentMethodKind;
  methodAccountId: string | null;
  bankName: string;
  amount: number;
  notes: string;
  allocations: PaymentAllocation[];
  postedBy?: { id: string; name: string };
  journalEntryId: string | null;
  cancelled: boolean;
  cancelledAt?: string | null;
  cancelledBy?: { id: string; name: string };
  reversalEntryId?: string | null;
  createdAt?: string | null;
}

export interface OutstandingPartyRow {
  account: ChartAccount;
  balance: number;
}

// ─── Period close ───────────────────────────────────────
export interface PeriodCloseLog {
  id: string;
  action: 'close' | 'reopen';
  throughDate: string | null;
  by: { id: string; name: string };
  note: string;
  at: string | null;
}

export interface PeriodStatus {
  closedThroughDate: string | null;
}

// ─── Day End (ledger-based) ─────────────────────────────
export interface DayEndCashBucket {
  inflow: number;
  outflow: number;
  opening: number;
  closing: number;
  accounts: Array<{
    account: ChartAccount;
    opening: number;
    inflow: number;
    outflow: number;
    closing: number;
  }>;
}

export interface DayEndIncomeBucket {
  credit: number;
  debit: number;
  net: number;
}

export interface DayEndPartyBucket {
  increase: number;
  decrease: number;
  net: number;
}

export interface DayEndSnapshot {
  date: string;
  cash: DayEndCashBucket;
  bank: DayEndCashBucket;
  sales: DayEndIncomeBucket;
  salesReturn: DayEndIncomeBucket;
  expense: DayEndIncomeBucket;
  customerReceivable: DayEndPartyBucket;
  supplierPayable: DayEndPartyBucket;
  netCashMovement: number;
  netBankMovement: number;
}

// ─── Purchases ───────────────────────────────────────────
export type PurchasePaymentMethod = 'cash' | 'bank' | 'none';

export interface PurchaseItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface Purchase {
  id: string;
  voucherNumber: string;
  date: string;
  supplierAccountId: string | null;
  supplierName: string;
  supplierPhone: string;
  supplierInvoiceNo: string;
  items: PurchaseItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paid: number;
  paidMethod: PurchasePaymentMethod;
  paidMethodAccountId: string | null;
  balance: number;
  notes: string;
  createdBy?: { id: string; name: string };
  journalEntryId: string | null;
  cancelled: boolean;
  cancelledAt?: string | null;
  cancelledBy?: { id: string; name: string };
  reversalEntryId?: string | null;
  createdAt?: string | null;
}

export interface ReturnItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
}

export type ReturnReason = 'defective' | 'wrong_item' | 'customer_change' | 'damaged' | 'other';

export interface ExchangeItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
}

export interface SaleReturn {
  id: string;
  saleId: string;
  date: string;
  items: ReturnItem[];
  subtotal: number;
  refundAmount: number;
  reason: ReturnReason;
  notes?: string;
  processedBy: string;
  processedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  type?: 'return' | 'exchange';
  exchangeItems?: ExchangeItem[];
  exchangeTotal?: number;
  balanceDue?: number;
}

export type Page = 'dashboard' | 'pos' | 'inventory' | 'categories' | 'reports' | 'day-end-report' | 'monthly-report' | 'settings' | 'users' | 'returns' | 'customers' | 'accounts' | 'purchases' | 'login';
