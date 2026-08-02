import { Permission, RolePermissions, UserRole } from '../types';

// All available permissions in the system
export const PERMISSIONS: Permission[] = [
  // Dashboard
  { id: 'dashboard.view', name: 'dashboard.view', label: 'View Dashboard', labelAr: 'عرض لوحة التحكم', description: 'Can view dashboard and analytics' },
  
  // POS / Sales
  { id: 'pos.create', name: 'pos.create', label: 'Create Sales', labelAr: 'إنشاء مبيعات', description: 'Can create new sales transactions' },
  { id: 'pos.view', name: 'pos.view', label: 'View Sales History', labelAr: 'عرض سجل المبيعات', description: 'Can view past sales transactions' },
  { id: 'pos.refund', name: 'pos.refund', label: 'Process Refunds', labelAr: 'معالجة الاسترداد', description: 'Can process refunds and returns' },
  { id: 'pos.discount', name: 'pos.discount', label: 'Apply Discounts', labelAr: 'تطبيق الخصومات', description: 'Can apply discounts to sales' },
  { id: 'pos.price_override', name: 'pos.price_override', label: 'Override Item Price', labelAr: 'تجاوز سعر المنتج', description: 'Can change product price at billing time' },
  
  // Inventory
  { id: 'inventory.view', name: 'inventory.view', label: 'View Inventory', labelAr: 'عرض المخزون', description: 'Can view product inventory' },
  { id: 'inventory.add', name: 'inventory.add', label: 'Add Products', labelAr: 'إضافة منتجات', description: 'Can add new products' },
  { id: 'inventory.edit', name: 'inventory.edit', label: 'Edit Products', labelAr: 'تعديل المنتجات', description: 'Can edit existing products' },
  { id: 'inventory.delete', name: 'inventory.delete', label: 'Delete Products', labelAr: 'حذف المنتجات', description: 'Can delete products' },
  
  // Categories
  { id: 'categories.manage', name: 'categories.manage', label: 'Manage Categories', labelAr: 'إدارة الفئات', description: 'Can add, edit, and delete categories' },
  
  // Reports
  { id: 'reports.view', name: 'reports.view', label: 'View Reports', labelAr: 'عرض التقارير', description: 'Can view sales and inventory reports' },
  { id: 'reports.export', name: 'reports.export', label: 'Export Reports', labelAr: 'تصدير التقارير', description: 'Can export reports to CSV/PDF' },
  
  // Users & Roles
  { id: 'users.view', name: 'users.view', label: 'View Users', labelAr: 'عرض المستخدمين', description: 'Can view user list' },
  { id: 'users.add', name: 'users.add', label: 'Add Users', labelAr: 'إضافة مستخدمين', description: 'Can create new users' },
  { id: 'users.edit', name: 'users.edit', label: 'Edit Users', labelAr: 'تعديل المستخدمين', description: 'Can edit user details and roles' },
  { id: 'users.delete', name: 'users.delete', label: 'Delete Users', labelAr: 'حذف المستخدمين', description: 'Can delete users' },
  { id: 'users.permissions', name: 'users.permissions', label: 'Manage Permissions', labelAr: 'إدارة الصلاحيات', description: 'Can assign and modify user permissions' },
  
  // Returns
  { id: 'returns.create', name: 'returns.create', label: 'Process Returns', labelAr: 'معالجة المرتجعات', description: 'Can process product returns and refunds' },
  { id: 'returns.view', name: 'returns.view', label: 'View Returns', labelAr: 'عرض المرتجعات', description: 'Can view return history' },

  // Customers
  { id: 'customers.view', name: 'customers.view', label: 'View Customers', labelAr: 'عرض العملاء', description: 'Can view customer list' },
  { id: 'customers.history', name: 'customers.history', label: 'View Customer History', labelAr: 'عرض سجل العميل', description: 'Can view buying history per customer' },

  // Accounts (Chart of Accounts + Journal Entries)
  { id: 'accounts.view', name: 'accounts.view', label: 'View Accounts', labelAr: 'عرض الحسابات', description: 'Can view chart of accounts' },
  { id: 'accounts.ledger', name: 'accounts.ledger', label: 'View Ledger & Trial Balance', labelAr: 'عرض دفتر الأستاذ', description: 'Can view per-account ledger and trial balance' },
  { id: 'accounts.manage', name: 'accounts.manage', label: 'Manage Accounts', labelAr: 'إدارة الحسابات', description: 'Can create, edit, delete accounts and post manual journal entries' },

  // Payments
  { id: 'payments.view', name: 'payments.view', label: 'View Payments', labelAr: 'عرض المدفوعات', description: 'Can view payment vouchers' },
  { id: 'payments.create', name: 'payments.create', label: 'Receive Payments', labelAr: 'استلام المدفوعات', description: 'Can record incoming/outgoing payments' },
  { id: 'payments.cancel', name: 'payments.cancel', label: 'Cancel Payments', labelAr: 'إلغاء المدفوعات', description: 'Can cancel/reverse a posted payment voucher' },

  // Purchases
  { id: 'purchases.view', name: 'purchases.view', label: 'View Purchases', labelAr: 'عرض المشتريات', description: 'Can view purchase invoices' },
  { id: 'purchases.create', name: 'purchases.create', label: 'Record Purchases', labelAr: 'تسجيل المشتريات', description: 'Can record purchase invoices from suppliers' },
  { id: 'purchases.cancel', name: 'purchases.cancel', label: 'Cancel Purchases', labelAr: 'إلغاء المشتريات', description: 'Can cancel/reverse a posted purchase' },

  // Period (day-end close / fiscal lock)
  { id: 'period.close', name: 'period.close', label: 'Close Accounting Period', labelAr: 'إغلاق الفترة المحاسبية', description: 'Can lock the books through a given date' },
  { id: 'period.reopen', name: 'period.reopen', label: 'Reopen Accounting Period', labelAr: 'إعادة فتح الفترة', description: 'Can roll back a period close' },

  // Settings
  { id: 'settings.view', name: 'settings.view', label: 'View Settings', labelAr: 'عرض الإعدادات', description: 'Can view shop settings' },
  { id: 'settings.edit', name: 'settings.edit', label: 'Edit Settings', labelAr: 'تعديل الإعدادات', description: 'Can modify shop settings' },
];

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: Object.fromEntries(PERMISSIONS.map(p => [p.id, true])),
  
  // Cashier: POS / retail flow only. No accounting.
  cashier: {
    'dashboard.view': true,
    'pos.create': true,
    'pos.view': true,
    'pos.refund': false,
    'pos.discount': true,
    'pos.price_override': false,
    'inventory.view': true,
    'inventory.add': false,
    'inventory.edit': false,
    'inventory.delete': false,
    'categories.manage': false,
    'reports.view': true,
    'reports.export': false,
    'users.view': false,
    'users.add': false,
    'users.edit': false,
    'users.delete': false,
    'users.permissions': false,
    'returns.create': true,
    'returns.view': true,
    'customers.view': true,
    'customers.history': true,
    'accounts.view': false,
    'accounts.ledger': false,
    'accounts.manage': false,
    'payments.view': false,
    'payments.create': false,
    'payments.cancel': false,
    'purchases.view': false,
    'purchases.create': false,
    'purchases.cancel': false,
    'period.close': false,
    'period.reopen': false,
    'settings.view': true,
    'settings.edit': false,
  },

  staff: {
    'dashboard.view': true,
    'pos.create': true,
    'pos.view': true,
    'pos.refund': false,
    'pos.discount': false,
    'pos.price_override': false,
    'inventory.view': true,
    'inventory.add': false,
    'inventory.edit': false,
    'inventory.delete': false,
    'categories.manage': false,
    'reports.view': false,
    'reports.export': false,
    'users.view': false,
    'users.add': false,
    'users.edit': false,
    'users.delete': false,
    'users.permissions': false,
    'returns.create': false,
    'returns.view': false,
    'customers.view': false,
    'customers.history': false,
    'accounts.view': false,
    'accounts.ledger': false,
    'accounts.manage': false,
    'payments.view': false,
    'payments.create': false,
    'payments.cancel': false,
    'purchases.view': false,
    'purchases.create': false,
    'purchases.cancel': false,
    'period.close': false,
    'period.reopen': false,
    'settings.view': false,
    'settings.edit': false,
  },

  // Accountant: accounting / wholesale flow only. No POS, no retail.
  accountant: {
    'dashboard.view': false,
    'pos.create': false,
    'pos.view': false,
    'pos.refund': false,
    'pos.discount': false,
    'pos.price_override': false,
    'inventory.view': false,
    'inventory.add': false,
    'inventory.edit': false,
    'inventory.delete': false,
    'categories.manage': false,
    'reports.view': false,
    'reports.export': false,
    'users.view': false,
    'users.add': false,
    'users.edit': false,
    'users.delete': false,
    'users.permissions': false,
    'returns.create': false,
    'returns.view': false,
    'customers.view': false,
    'customers.history': false,
    'accounts.view': true,
    'accounts.ledger': true,
    'accounts.manage': true,
    'payments.view': true,
    'payments.create': true,
    'payments.cancel': true,
    'purchases.view': true,
    'purchases.create': true,
    'purchases.cancel': true,
    'period.close': true,
    'period.reopen': true,
    'settings.view': false,
    'settings.edit': false,
  },
};

// Role labels
export const ROLE_LABELS: Record<UserRole, { label: string; labelAr: string; color: string }> = {
  admin: { label: 'Administrator', labelAr: 'مدير النظام', color: 'bg-red-100 text-red-800' },
  cashier: { label: 'Cashier', labelAr: 'أمين الصندوق', color: 'bg-blue-100 text-blue-800' },
  staff: { label: 'Staff', labelAr: 'موظف', color: 'bg-green-100 text-green-800' },
  accountant: { label: 'Accountant', labelAr: 'محاسب', color: 'bg-purple-100 text-purple-800' },
};

// Required permission per page (used for permission-aware routing in App.tsx
// and the auto-redirect effect in StoreContext when currentPage becomes inaccessible).
export const PAGE_PERMISSION: Record<string, string | null> = {
  dashboard: 'dashboard.view',
  pos: 'pos.create',
  inventory: 'inventory.view',
  categories: 'categories.manage',
  reports: 'reports.view',
  'day-end-report': 'reports.view',
  'monthly-report': 'reports.view',
  returns: 'returns.view',
  customers: 'customers.view',
  accounts: 'accounts.view',
  purchases: 'purchases.view',
  users: 'users.view',
  settings: 'settings.view',
  login: null,
};

// Default landing page per role.
export const initialPageForRole = (role: UserRole): string => {
  if (role === 'accountant') return 'accounts';
  if (role === 'cashier' || role === 'staff') return 'pos';
  return 'dashboard';
};

// Permission groups for UI organization
export const PERMISSION_GROUPS = [
  {
    title: 'Dashboard',
    titleAr: 'لوحة التحكم',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('dashboard')),
  },
  {
    title: 'POS & Sales',
    titleAr: 'نقطة البيع والمبيعات',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('pos')),
  },
  {
    title: 'Inventory',
    titleAr: 'المخزون',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('inventory')),
  },
  {
    title: 'Categories',
    titleAr: 'الفئات',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('categories')),
  },
  {
    title: 'Reports',
    titleAr: 'التقارير',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('reports')),
  },
  {
    title: 'Returns',
    titleAr: 'المرتجعات',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('returns')),
  },
  {
    title: 'Customers',
    titleAr: 'العملاء',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('customers')),
  },
  {
    title: 'Accounts',
    titleAr: 'الحسابات',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('accounts')),
  },
  {
    title: 'Payments',
    titleAr: 'المدفوعات',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('payments')),
  },
  {
    title: 'Purchases',
    titleAr: 'المشتريات',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('purchases')),
  },
  {
    title: 'Period Close',
    titleAr: 'إغلاق الفترة',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('period')),
  },
  {
    title: 'User Management',
    titleAr: 'إدارة المستخدمين',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('users')),
  },
  {
    title: 'Settings',
    titleAr: 'الإعدادات',
    permissions: PERMISSIONS.filter(p => p.id.startsWith('settings')),
  },
];
