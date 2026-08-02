import { useStore } from '../contexts/StoreContext';
import { BarChart3, ShoppingCart, Package, Layers, FileText, Settings, LogOut, Menu, Users, Shield, RotateCcw, CalendarCheck, CalendarRange, Contact, BookOpen, Truck } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  adminOnly?: boolean;
}

export default function Sidebar() {
  const { currentPage, setCurrentPage, logout, currentUser, hasPermission } = useStore();
  const [isOpen, setIsOpen] = useState(true);

  // Three logical sections. Items are filtered by permission + adminOnly
  // (admin sees all sections; cashier/staff see POS section only;
  // accountant sees Accounting section only).
  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'POS & Retail',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, permission: 'dashboard.view' },
        { id: 'pos', label: 'POS / Billing', icon: ShoppingCart, permission: 'pos.create' },
        { id: 'inventory', label: 'Inventory', icon: Package, permission: 'inventory.view' },
        { id: 'categories', label: 'Categories', icon: Layers, permission: 'categories.manage' },
        { id: 'returns', label: 'Returns', icon: RotateCcw, permission: 'returns.view' },
        { id: 'customers', label: 'Customers', icon: Contact, permission: 'customers.view' },
        { id: 'reports', label: 'Reports', icon: FileText, permission: 'reports.view' },
        { id: 'day-end-report', label: 'Day End Report', icon: CalendarCheck, permission: 'reports.view' },
        { id: 'monthly-report', label: 'Monthly Report', icon: CalendarRange, permission: 'reports.view' },
      ],
    },
    {
      title: 'Accounting',
      items: [
        { id: 'accounts', label: 'Accounts', icon: BookOpen, permission: 'accounts.view' },
        { id: 'purchases', label: 'Purchases', icon: Truck, permission: 'purchases.view' },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'users', label: 'User Management', icon: Users, permission: 'users.view', adminOnly: true },
        { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
      ],
    },
  ];

  const visibleSections = sections
    .map(s => ({
      ...s,
      items: s.items.filter(item => {
        if (item.adminOnly && currentUser?.role !== 'admin') return false;
        if (item.permission && !hasPermission(item.permission)) return false;
        return true;
      }),
    }))
    .filter(s => s.items.length > 0);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-600 p-2 rounded-lg text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div className={cn(
        "transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 fixed lg:static w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 flex flex-col z-40"
      )}>
        
        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            QuickMart
          </h1>
          <p className="text-slate-400 text-sm mt-1">Point of Sale System</p>
        </div>

        {/* User Info */}
        {currentUser && (
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{currentUser.name}</p>
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  {currentUser.role === 'admin' && <Shield className="w-3 h-3 text-red-400" />}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                    currentUser.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                    currentUser.role === 'cashier' ? 'bg-blue-500/20 text-blue-400' :
                    currentUser.role === 'accountant' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-green-500/20 text-green-400'
                  )}>
                    {currentUser.role}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {visibleSections.map((section, idx) => (
            <div key={section.title} className={idx > 0 ? 'mt-4' : ''}>
              {/* Show the section header only when more than one section is visible
                  (otherwise it's noise — cashier and accountant each see one section). */}
              {visibleSections.length > 1 && (
                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id as any);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive && "text-white")} />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full shadow-lg" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-700/50 space-y-2">
          <div className="px-4 py-2 text-xs text-slate-500">
            <p>© 2024 QuickMart POS</p>
            <p>Faisalabad, Pakistan</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
