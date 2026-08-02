import { Product, Category, Sale, User, ShopSettings, SaleReturn, ChartAccount, JournalEntry, AccountLedger, TrialBalance, PaymentVoucher, OutstandingPartyRow, Purchase, PeriodStatus, PeriodCloseLog, DayEndSnapshot } from '../types';

// API base. Default is the relative '/api' path, which the Vite dev server
// proxies to the local backend (see vite.config.ts → server.proxy). This keeps
// everything same-origin so the app works through a single tunnel with no CORS.
// Override with VITE_API_BASE in client/.env.local only if you want to point at
// a separately-tunnelled backend.
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Skip the localtunnel / ngrok-free browser interstitial so the API
    // returns JSON instead of the tunnel's reminder HTML page.
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }

  return json;
}

// ─── Products ────────────────────────────────────────────

export const productApi = {
  getAll: () =>
    request<{ success: boolean; data: Product[] }>('/products').then((r) => r.data),

  create: (product: Omit<Product, 'id' | 'sku'>) =>
    request<{ success: boolean; data: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }).then((r) => r.data),

  update: (id: string, updates: Partial<Product>) =>
    request<{ success: boolean; data: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then((r) => r.data),

  remove: (id: string) =>
    request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' }),
};

// ─── Categories ──────────────────────────────────────────

export const categoryApi = {
  getAll: () =>
    request<{ success: boolean; data: Category[] }>('/categories').then((r) => r.data),

  create: (name: string, nameAr?: string) =>
    request<{ success: boolean; data: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, nameAr }),
    }).then((r) => r.data),

  update: (id: string, name: string, nameAr?: string) =>
    request<{ success: boolean; data: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, nameAr }),
    }).then((r) => r.data),

  remove: (id: string) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
};

// ─── Sales ───────────────────────────────────────────────

export const saleApi = {
  getAll: () =>
    request<{ success: boolean; data: Sale[] }>('/sales').then((r) => r.data),

  create: (sale: Omit<Sale, 'id'>) =>
    request<{ success: boolean; data: Sale }>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }).then((r) => r.data),

  getById: (id: string) =>
    request<{ success: boolean; data: Sale }>(`/sales/${id}`).then((r) => r.data),

  getByCustomerPhone: (phone: string) =>
    request<{ success: boolean; data: Sale[] }>(`/sales/customer/${encodeURIComponent(phone)}`).then((r) => r.data),
};

// ─── Users ───────────────────────────────────────────────

export const userApi = {
  getAll: () =>
    request<{ success: boolean; data: User[] }>('/users').then((r) => r.data),

  create: (user: Omit<User, 'id' | 'createdAt' | 'permissions'> & { password: string }) =>
    request<{ success: boolean; data: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }).then((r) => r.data),

  update: (id: string, updates: Partial<User>) =>
    request<{ success: boolean; data: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then((r) => r.data),

  remove: (id: string) =>
    request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),

  updateRole: (id: string, role: string, permissions: Record<string, boolean>) =>
    request<{ success: boolean; data: User }>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, permissions }),
    }).then((r) => r.data),

  updatePermissions: (id: string, permissions: Record<string, boolean>) =>
    request<{ success: boolean; data: User }>(`/users/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }).then((r) => r.data),
};

// ─── Settings ────────────────────────────────────────────

export const settingsApi = {
  get: () =>
    request<{ success: boolean; data: ShopSettings }>('/settings').then((r) => r.data),

  update: (settings: Partial<ShopSettings>) =>
    request<{ success: boolean; data: ShopSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }).then((r) => r.data),
};

// ─── Reports ────────────────────────────────────────────

export interface DailyReportData {
  date: string;
  summary: {
    totalTransactions: number;
    totalSales: number;
    totalSubtotal: number;
    totalDiscount: number;
    totalCashReceived: number;
    totalChange: number;
    totalItemsSold: number;
    totalReturns: number;
    totalRefundAmount: number;
    netSales: number;
    avgTransactionValue: number;
  };
  productBreakdown: {
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
  }[];
  cashierBreakdown: {
    cashierId: string;
    cashierName: string;
    transactions: number;
    total: number;
  }[];
  hourlyBreakdown: {
    hour: number;
    transactions: number;
    total: number;
  }[];
  sales: Sale[];
}

export interface MonthlyReportData {
  month: number;
  year: number;
  monthName: string;
  summary: {
    totalTransactions: number;
    totalSales: number;
    totalSubtotal: number;
    totalDiscount: number;
    totalCashReceived: number;
    totalItemsSold: number;
    totalReturns: number;
    totalRefundAmount: number;
    netSales: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    avgDailySales: number;
    avgTransactionValue: number;
    activeDays: number;
  };
  dailyBreakdown: {
    day: number;
    date: string;
    transactions: number;
    total: number;
    itemsSold: number;
  }[];
  productBreakdown: {
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    purchasePrice: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  cashierBreakdown: {
    cashierId: string;
    cashierName: string;
    transactions: number;
    total: number;
  }[];
  bestDays: { day: number; date: string; transactions: number; total: number; itemsSold: number }[];
  worstDays: { day: number; date: string; transactions: number; total: number; itemsSold: number }[];
}

export const reportApi = {
  getDaily: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return request<{ success: boolean; data: DailyReportData }>(`/reports/daily${query}`).then((r) => r.data);
  },

  getMonthly: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<{ success: boolean; data: MonthlyReportData }>(`/reports/monthly${query}`).then((r) => r.data);
  },
};

// ─── Chart of Accounts ───────────────────────────────────

export const accountApi = {
  getAll: (params?: { type?: string; active?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.active !== undefined) qs.set('active', String(params.active));
    const tail = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ success: boolean; data: ChartAccount[] }>(`/accounts${tail}`).then((r) => r.data);
  },

  getById: (id: string) =>
    request<{ success: boolean; data: ChartAccount }>(`/accounts/${id}`).then((r) => r.data),

  create: (account: Omit<ChartAccount, 'id' | 'isSystem' | 'currentBalance'>) =>
    request<{ success: boolean; data: ChartAccount }>('/accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    }).then((r) => r.data),

  update: (id: string, updates: Partial<Omit<ChartAccount, 'id' | 'isSystem'>>) =>
    request<{ success: boolean; data: ChartAccount }>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then((r) => r.data),

  remove: (id: string, hard = false) =>
    request<{ success: boolean }>(`/accounts/${id}${hard ? '?hard=true' : ''}`, {
      method: 'DELETE',
    }),

  getLedger: (id: string, range?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (range?.from) qs.set('from', range.from);
    if (range?.to) qs.set('to', range.to);
    const tail = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ success: boolean; data: AccountLedger }>(`/accounts/${id}/ledger${tail}`).then((r) => r.data);
  },

  getTrialBalance: (asOf?: string) => {
    const tail = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
    return request<{ success: boolean; data: TrialBalance }>(`/accounts/trial-balance${tail}`).then((r) => r.data);
  },

  getOutstandingParties: (type: 'customer' | 'supplier' = 'customer') =>
    request<{ success: boolean; data: OutstandingPartyRow[] }>(`/accounts/parties/outstanding?type=${type}`).then((r) => r.data),

  getDayEnd: (date?: string) => {
    const tail = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<{ success: boolean; data: DayEndSnapshot }>(`/accounts/day-end${tail}`).then((r) => r.data);
  },

  quickAddCustomer: (payload: { phone?: string; name: string; openingDebit?: number }) =>
    request<{ success: boolean; data: ChartAccount }>('/accounts/customers/quick', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.data),

  quickAddSupplier: (payload: { phone?: string; name: string; openingCredit?: number }) =>
    request<{ success: boolean; data: ChartAccount }>('/accounts/suppliers/quick', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.data),
};

// ─── Period close ────────────────────────────────────────

export const periodApi = {
  status: () =>
    request<{ success: boolean; data: PeriodStatus }>('/period/status').then((r) => r.data),

  history: (limit = 100) =>
    request<{ success: boolean; data: PeriodCloseLog[] }>(`/period/history?limit=${limit}`).then((r) => r.data),

  close: (date: string, note?: string) =>
    request<{ success: boolean; data: PeriodStatus }>('/period/close', {
      method: 'POST',
      body: JSON.stringify({ date, note: note || '' }),
    }).then((r) => r.data),

  reopen: (date: string | null, note?: string) =>
    request<{ success: boolean; data: PeriodStatus }>('/period/reopen', {
      method: 'POST',
      body: JSON.stringify({ date, note: note || '' }),
    }).then((r) => r.data),
};

// ─── Payment Vouchers ────────────────────────────────────

export const paymentVoucherApi = {
  getAll: (params?: { direction?: 'received' | 'paid'; partyAccountId?: string; from?: string; to?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.direction) qs.set('direction', params.direction);
    if (params?.partyAccountId) qs.set('partyAccountId', params.partyAccountId);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.limit) qs.set('limit', String(params.limit));
    const tail = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ success: boolean; data: PaymentVoucher[] }>(`/payment-vouchers${tail}`).then((r) => r.data);
  },

  getById: (id: string) =>
    request<{ success: boolean; data: PaymentVoucher }>(`/payment-vouchers/${id}`).then((r) => r.data),

  create: (voucher: {
    date?: string;
    direction: 'received' | 'paid';
    partyAccountId: string;
    method: 'cash' | 'bank';
    methodAccountId: string;
    bankName?: string;
    amount: number;
    notes?: string;
    allocations?: { refKind?: 'sale' | 'purchase'; refId?: string | null; amount: number; note?: string }[];
  }) =>
    request<{ success: boolean; data: PaymentVoucher }>('/payment-vouchers', {
      method: 'POST',
      body: JSON.stringify(voucher),
    }).then((r) => r.data),

  cancel: (id: string) =>
    request<{ success: boolean; data: PaymentVoucher }>(`/payment-vouchers/${id}/cancel`, {
      method: 'POST',
    }).then((r) => r.data),
};

// ─── Purchases ───────────────────────────────────────────

export const purchaseApi = {
  getAll: (params?: { supplierAccountId?: string; from?: string; to?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.supplierAccountId) qs.set('supplierAccountId', params.supplierAccountId);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.limit) qs.set('limit', String(params.limit));
    const tail = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ success: boolean; data: Purchase[] }>(`/purchases${tail}`).then((r) => r.data);
  },

  getById: (id: string) =>
    request<{ success: boolean; data: Purchase }>(`/purchases/${id}`).then((r) => r.data),

  create: (purchase: {
    date?: string;
    supplierAccountId: string;
    supplierInvoiceNo?: string;
    items: { productId: string; quantity: number; unitCost: number }[];
    discountAmount?: number;
    taxAmount?: number;
    paid?: number;
    paidMethod?: 'cash' | 'bank' | 'none';
    paidMethodAccountId?: string | null;
    notes?: string;
  }) =>
    request<{ success: boolean; data: Purchase }>('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchase),
    }).then((r) => r.data),

  cancel: (id: string) =>
    request<{ success: boolean; data: Purchase }>(`/purchases/${id}/cancel`, {
      method: 'POST',
    }).then((r) => r.data),
};

// ─── Journal Entries ────────────────────────────────────

export const journalEntryApi = {
  getAll: (params?: { source?: string; from?: string; to?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.source) qs.set('source', params.source);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.limit) qs.set('limit', String(params.limit));
    const tail = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ success: boolean; data: JournalEntry[] }>(`/journal-entries${tail}`).then((r) => r.data);
  },

  create: (entry: { date?: string; memo?: string; narration?: string; lines: { accountId: string; debit: number; credit: number; memo?: string }[] }) =>
    request<{ success: boolean; data: JournalEntry }>('/journal-entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    }).then((r) => r.data),

  reverse: (id: string) =>
    request<{ success: boolean; data: JournalEntry }>(`/journal-entries/${id}/reverse`, {
      method: 'POST',
    }).then((r) => r.data),
};

// ─── Returns ────────────────────────────────────────────

export const returnApi = {
  getAll: () =>
    request<{ success: boolean; data: SaleReturn[] }>('/returns').then((r) => r.data),

  create: (returnData: Omit<SaleReturn, 'id'>) =>
    request<{ success: boolean; data: SaleReturn }>('/returns', {
      method: 'POST',
      body: JSON.stringify(returnData),
    }).then((r) => r.data),

  getById: (id: string) =>
    request<{ success: boolean; data: SaleReturn }>(`/returns/${id}`).then((r) => r.data),
};
