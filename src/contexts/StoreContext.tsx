import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Product, Category, Sale, CartItem, Page, User, SaleItem, ShopSettings, UserRole, RolePermissions, SaleReturn, ChartAccount } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../config/permissions';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout as reduxLogout } from '../store/slices/authSlice';
import { productApi, categoryApi, saleApi, userApi, settingsApi, returnApi, accountApi } from '../services/api';

interface StoreContextType {
  // Auth
  isLoggedIn: boolean;
  currentUser: User | null;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  hasPermission: (permission: string) => boolean;

  // Navigation
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  selectedCustomerPhone: string | null;
  setSelectedCustomerPhone: (phone: string | null) => void;
  selectedPartyAccountId: string | null;
  setSelectedPartyAccountId: (id: string | null) => void;

  // Shop Settings
  shopSettings: ShopSettings;
  updateShopSettings: (settings: Partial<ShopSettings>) => void;

  // Users Management
  users: User[];
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'permissions'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  updateUserPermissions: (id: string, permissions: RolePermissions) => void;
  deleteUser: (id: string) => void;
  updateUserRole: (id: string, role: UserRole) => void;

  // Data
  products: Product[];
  categories: Category[];
  sales: Sale[];
  addProduct: (product: Omit<Product, 'id' | 'sku'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addSale: (sale: Omit<Sale, 'id'>) => void;

  // Returns
  returns: SaleReturn[];
  addReturn: (returnData: Omit<SaleReturn, 'id'>) => void;

  // Chart of Accounts
  accounts: ChartAccount[];
  refreshAccounts: () => Promise<void>;

  // POS
  cart: CartItem[];
  posSearch: string;
  setPosSearch: (query: string) => void;
  addToCart: (product: Product) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotalItems: number;

  // Discount
  discountType: 'fixed' | 'percentage';
  setDiscountType: (type: 'fixed' | 'percentage') => void;
  discountValue: number;
  setDiscountValue: (value: number) => void;
  discountAmount: number;
  cartTotal: number;

  // UI States
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  cashReceived: number;
  setCashReceived: (amount: number) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  completeSale: (cashAmount: number) => Omit<Sale, 'id'> | null;

  // Filters
  inventorySearch: string;
  setInventorySearch: (query: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (category: string) => void;

  // Stats
  todaySales: Sale[];
  todaySalesAmount: number;
  totalProducts: number;
  lowStockCount: number;
  recentSales: Sale[];
  hotSellingProducts: { product: Product; sold: number; revenue: number }[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'QuickMart Store',
  shopNameAr: 'متجر كويك مارت',
  shopAddress: 'Faisalabad, Pakistan',
  shopAddressAr: 'فيصل آباد، باكستان',
  shopPhone: '+92-300-1234567',
  shopEmail: 'info@quickmart.com',
  currency: 'PKR',
  lowStockThreshold: 5,
  receiptFooter: 'Thank you for shopping with us!',
  receiptFooterAr: 'شكراً لتسوقك معنا!'
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const authState = useAppSelector((state) => state.auth);
  const appDispatch = useAppDispatch();

  // Auth state derived from Redux
  const isLoggedIn = authState.isLoggedIn;
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (authState.user) {
      const role = (authState.user.role || 'admin') as UserRole;
      return {
        id: authState.user.id,
        name: authState.user.name,
        email: authState.user.email,
        password: '',
        role,
        permissions: authState.user.permissions || DEFAULT_ROLE_PERMISSIONS[role],
        createdAt: new Date().toISOString(),
        isActive: true,
      };
    }
    return null;
  });
  // Persist the active page across reloads. The permission-aware effect in
  // App.tsx bounces the user off any restored page they can't access.
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('currentPage') as Page | null;
    return saved && saved !== 'login' ? saved : 'dashboard';
  });
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [selectedPartyAccountId, setSelectedPartyAccountId] = useState<string | null>(null);

  // Remember the active page so a reload returns the user to where they were.
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Sync Redux auth user into StoreContext currentUser
  useEffect(() => {
    if (authState.user && authState.isLoggedIn) {
      const role = (authState.user.role || 'admin') as UserRole;
      setCurrentUser({
        id: authState.user.id,
        name: authState.user.name,
        email: authState.user.email,
        password: '',
        role,
        permissions: authState.user.permissions || DEFAULT_ROLE_PERMISSIONS[role],
        createdAt: new Date().toISOString(),
        isActive: true,
      });
    } else {
      setCurrentUser(null);
    }
  }, [authState.user, authState.isLoggedIn]);

  const [shopSettings, setShopSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);

  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [customerPhone, setCustomerPhone] = useState('');

  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Load data from API when logged in
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const loadData = async () => {
      try {
        const [productsData, categoriesData, salesData, usersData, settingsData, returnsData, accountsData] = await Promise.all([
          productApi.getAll().catch(() => []),
          categoryApi.getAll().catch(() => []),
          saleApi.getAll().catch(() => []),
          userApi.getAll().catch(() => []),
          settingsApi.get().catch(() => null),
          returnApi.getAll().catch(() => []),
          accountApi.getAll().catch(() => []),
        ]);

        setProducts(productsData);
        setCategories(categoriesData);
        setSales(salesData);
        setUsers(usersData);
        setReturns(returnsData);
        setAccounts(accountsData);
        if (settingsData) {
          setShopSettings(settingsData);
        }

      } catch (err) {
        console.error('Failed to load data from API:', err);
        // Fallback to localStorage
        const savedProducts = localStorage.getItem('products');
        const savedCategories = localStorage.getItem('categories');
        const savedSales = localStorage.getItem('sales');
        const savedUsers = localStorage.getItem('users');
        const savedShopSettings = localStorage.getItem('shopSettings');

        if (savedProducts) setProducts(JSON.parse(savedProducts));
        if (savedCategories) setCategories(JSON.parse(savedCategories));
        if (savedSales) setSales(JSON.parse(savedSales));
        if (savedUsers) setUsers(JSON.parse(savedUsers));
        if (savedShopSettings) setShopSettings(JSON.parse(savedShopSettings));

      }
    };

    loadData();
  }, [isLoggedIn]);

  // Permission check
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.permissions[permission] === true;
  };

  // Login is now handled by Redux + RTK Query in Login.tsx
  const login = (email: string, password: string): User | null => {
    const foundUser = users.find(u => u.email === email && u.password === password && u.isActive);
    if (foundUser) {
      setCurrentUser(foundUser);
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      return foundUser;
    }
    return null;
  };

  const logout = () => {
    appDispatch(reduxLogout());
    setCurrentUser(null);
    setCurrentPage('dashboard');
    setCart([]);
    localStorage.removeItem('currentUser');
  };

  const refreshAccounts = useCallback(async () => {
    try {
      const data = await accountApi.getAll();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to refresh accounts', err);
    }
  }, []);

  // ─── User Management ────────────────────────────────────

  const addUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt' | 'permissions'>) => {
    try {
      const newUser = await userApi.create({
        ...userData,
        password: userData.password || '123456',
      });
      setUsers((prev) => [...prev, newUser]);
    } catch (err) {
      console.error('Failed to create user:', err);
      // Fallback: local only
      const newUser: User = {
        ...userData,
        id: 'u' + Date.now(),
        createdAt: new Date().toISOString(),
        permissions: DEFAULT_ROLE_PERMISSIONS[userData.role],
      };
      setUsers((prev) => [...prev, newUser]);
    }
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    try {
      const updatedUser = await userApi.update(id, updates);
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
      if (currentUser?.id === id) {
        setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
      if (currentUser?.id === id) {
        setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
      }
    }
  }, [currentUser?.id]);

  const updateUserPermissions = useCallback(async (id: string, permissions: RolePermissions) => {
    try {
      const updatedUser = await userApi.updatePermissions(id, permissions);
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
      if (currentUser?.id === id) {
        setCurrentUser((prev) => (prev ? { ...prev, permissions } : null));
      }
    } catch (err) {
      console.error('Failed to update permissions:', err);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, permissions } : u)));
      if (currentUser?.id === id) {
        setCurrentUser((prev) => (prev ? { ...prev, permissions } : null));
      }
    }
  }, [currentUser?.id]);

  const deleteUser = useCallback(async (id: string) => {
    if (id === currentUser?.id) return;
    try {
      await userApi.remove(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }, [currentUser?.id]);

  const updateUserRole = useCallback(async (id: string, role: UserRole) => {
    const newPermissions = DEFAULT_ROLE_PERMISSIONS[role];
    try {
      const updatedUser = await userApi.updateRole(id, role, newPermissions);
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
      if (currentUser?.id === id) {
        setCurrentUser((prev) => (prev ? { ...prev, role, permissions: newPermissions } : null));
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role, permissions: newPermissions } : u)));
      if (currentUser?.id === id) {
        setCurrentUser((prev) => (prev ? { ...prev, role, permissions: newPermissions } : null));
      }
    }
  }, [currentUser?.id]);

  // ─── Shop Settings ──────────────────────────────────────

  const updateShopSettings = useCallback(async (updates: Partial<ShopSettings>) => {
    const newSettings = { ...shopSettings, ...updates };
    setShopSettings(newSettings);
    try {
      await settingsApi.update(updates);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [shopSettings]);

  // ─── Products ───────────────────────────────────────────

  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'sku'>) => {
    try {
      const newProduct = await productApi.create(productData);
      setProducts((prev) => [...prev, newProduct]);
    } catch (err) {
      console.error('Failed to create product:', err);
      const newProduct: Product = {
        ...productData,
        id: 'p' + Date.now(),
        sku: 'QM-' + productData.name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4),
      };
      setProducts((prev) => [...prev, newProduct]);
    }
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProduct = await productApi.update(id, updates);
      setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)));
    } catch (err) {
      console.error('Failed to update product:', err);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await productApi.remove(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete product:', err);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  }, []);

  // ─── Categories ─────────────────────────────────────────

  const addCategory = useCallback(async (name: string) => {
    try {
      const newCategory = await categoryApi.create(name);
      setCategories((prev) => [...prev, newCategory]);
    } catch (err) {
      console.error('Failed to create category:', err);
      const newCategory: Category = { id: 'cat' + Date.now(), name };
      setCategories((prev) => [...prev, newCategory]);
    }
  }, []);

  const updateCategory = useCallback(async (id: string, name: string) => {
    try {
      const updatedCategory = await categoryApi.update(id, name);
      setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)));
    } catch (err) {
      console.error('Failed to update category:', err);
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await categoryApi.remove(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete category:', err);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  // ─── Sales ──────────────────────────────────────────────

  const addSale = useCallback(async (saleData: Omit<Sale, 'id'>) => {
    try {
      const newSale = await saleApi.create(saleData);
      setSales((prev) => [newSale, ...prev]);
      // Refresh products to get updated stock from server
      try {
        const updatedProducts = await productApi.getAll();
        setProducts(updatedProducts);
      } catch {
        // If refresh fails, update stock locally
        setProducts((prev) => {
          const updated = [...prev];
          saleData.items.forEach((item) => {
            const idx = updated.findIndex((p) => p.id === item.productId);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], stock: Math.max(0, updated[idx].stock - item.quantity) };
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to create sale:', err);
      // Fallback: local only
      const newSale: Sale = { ...saleData, id: 'sale-' + Date.now() };
      setSales((prev) => [newSale, ...prev]);
      setProducts((prev) => {
        const updated = [...prev];
        saleData.items.forEach((item) => {
          const idx = updated.findIndex((p) => p.id === item.productId);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], stock: Math.max(0, updated[idx].stock - item.quantity) };
          }
        });
        return updated;
      });
    }
  }, []);

  // ─── Returns ────────────────────────────────────────────

  const addReturn = useCallback(async (returnData: Omit<SaleReturn, 'id'>) => {
    try {
      const newReturn = await returnApi.create(returnData);
      setReturns((prev) => [newReturn, ...prev]);
      // Refresh products to get updated stock (return restores stock on server)
      try {
        const updatedProducts = await productApi.getAll();
        setProducts(updatedProducts);
      } catch {
        // Restore stock locally if refresh fails
        setProducts((prev) => {
          const updated = [...prev];
          returnData.items.forEach((item) => {
            const idx = updated.findIndex((p) => p.id === item.productId);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], stock: updated[idx].stock + item.quantity };
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to create return:', err);
      const newReturn: SaleReturn = { ...returnData, id: 'ret-' + Date.now() };
      setReturns((prev) => [newReturn, ...prev]);
      setProducts((prev) => {
        const updated = [...prev];
        returnData.items.forEach((item) => {
          const idx = updated.findIndex((p) => p.id === item.productId);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], stock: updated[idx].stock + item.quantity };
          }
        });
        return updated;
      });
    }
  }, []);

  // ─── Cart ───────────────────────────────────────────────

  const addToCart = (product: Product) => {
    const existing = cart.findIndex((item) => item.product.id === product.id);
    if (existing !== -1) {
      const updatedCart = [...cart];
      updatedCart[existing].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const product = products.find((p) => p.id === productId);
    if (!product || quantity > product.stock) return;
    setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setDiscountType('fixed');
    setCustomerPhone('');
  };

  // Calculate discount amount
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  const discountAmount = discountType === 'percentage' ? (cartSubtotal * discountValue) / 100 : discountValue;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  const completeSale = (cashAmount: number): Omit<Sale, 'id'> | null => {
    if (cart.length === 0) return null;

    const saleItems: SaleItem[] = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.salePrice,
      quantity: item.quantity,
      sku: item.product.sku,
    }));

    const change = Math.max(0, cashAmount - cartTotal);

    const newSaleData: Omit<Sale, 'id'> = {
      date: new Date().toISOString(),
      items: saleItems,
      subtotal: cartSubtotal,
      discountType,
      discountValue,
      discountAmount,
      total: cartTotal,
      cashReceived: cashAmount,
      change,
      cashierId: currentUser?.id || 'unknown',
      cashierName: currentUser?.name || 'Unknown',
      customerPhone: customerPhone || '',
    };

    addSale(newSaleData);
    clearCart();
    setShowPaymentModal(false);
    setCashReceived(0);

    return newSaleData;
  };

  // Today's sales
  const todaySales = sales.filter((s) => {
    const saleDate = new Date(s.date);
    const today = new Date();
    return (
      saleDate.getDate() === today.getDate() &&
      saleDate.getMonth() === today.getMonth() &&
      saleDate.getFullYear() === today.getFullYear()
    );
  });

  const todaySalesAmount = todaySales.reduce((sum, s) => sum + s.total, 0);

  // Hot selling products (last 30 days)
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const productSalesMap = new Map<string, { product: Product; sold: number; revenue: number }>();
  sales.forEach((sale) => {
    const saleDate = new Date(sale.date);
    if (saleDate >= last30Days) {
      sale.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          if (productSalesMap.has(item.productId)) {
            const entry = productSalesMap.get(item.productId)!;
            entry.sold += item.quantity;
            entry.revenue += item.price * item.quantity;
          } else {
            productSalesMap.set(item.productId, {
              product,
              sold: item.quantity,
              revenue: item.price * item.quantity,
            });
          }
        }
      });
    }
  });
  const hotSellingProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.stock <= (shopSettings.lowStockThreshold || 5)).length;
  const recentSales = sales.slice(0, 10);

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value: StoreContextType = {
    isLoggedIn,
    currentUser,
    login,
    logout,
    hasPermission,
    currentPage,
    setCurrentPage,
    selectedCustomerPhone,
    setSelectedCustomerPhone,
    selectedPartyAccountId,
    setSelectedPartyAccountId,
    shopSettings,
    updateShopSettings,
    users,
    addUser,
    updateUser,
    updateUserPermissions,
    deleteUser,
    updateUserRole,
    products,
    categories,
    sales,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addSale,
    returns,
    addReturn,
    accounts,
    refreshAccounts,
    cart,
    posSearch,
    setPosSearch,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartTotalItems,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    discountAmount,
    cartTotal,
    showPaymentModal,
    setShowPaymentModal,
    cashReceived,
    setCashReceived,
    customerPhone,
    setCustomerPhone,
    completeSale,
    inventorySearch,
    setInventorySearch,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    todaySales,
    todaySalesAmount,
    totalProducts,
    lowStockCount,
    recentSales,
    hotSellingProducts,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
