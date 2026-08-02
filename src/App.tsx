import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { store } from './store/store';
import { useAppSelector } from './store/hooks';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { PAGE_PERMISSION, initialPageForRole } from './config/permissions';
import { Page } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Categories from './components/Categories';
import Reports from './components/Reports';
import DayEndReport from './components/DayEndReport';
import MonthlyReport from './components/MonthlyReport';
import Settings from './components/Settings';
import UsersList from './components/users/UsersList';
import Returns from './components/Returns';
import Customers from './components/Customers';
import Accounts from './components/accounts/Accounts';
import Purchases from './components/Purchases';

function MainApp() {
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { currentPage, setCurrentPage, currentUser, hasPermission } = useStore();

  // Auto-redirect if currentPage is not allowed for the current user
  // (handles login, role/permission updates, and stale state).
  useEffect(() => {
    if (!currentUser) return;
    const required = PAGE_PERMISSION[currentPage];
    if (required && !hasPermission(required)) {
      setCurrentPage(initialPageForRole(currentUser.role) as Page);
    }
    // eslint-disable-next-line
  }, [currentUser?.role, currentUser?.permissions, currentPage]);

  if (!isLoggedIn) {
    return <Login />;
  }

  const renderPage = () => {
    // Permission gate. If currentPage isn't allowed, show a friendly placeholder
    // while the auto-redirect effect above bounces them to a permitted page.
    const required = PAGE_PERMISSION[currentPage];
    if (required && currentUser && !hasPermission(required)) {
      return (
        <div className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-slate-300">You don't have permission to view this page.</p>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <POS />;
      case 'inventory':
        return <Inventory />;
      case 'categories':
        return <Categories />;
      case 'reports':
        return <Reports />;
      case 'day-end-report':
        return <DayEndReport />;
      case 'monthly-report':
        return <MonthlyReport />;
      case 'settings':
        return <Settings />;
      case 'users':
        return <UsersList />;
      case 'returns':
        return <Returns />;
      case 'customers':
        return <Customers />;
      case 'accounts':
        return <Accounts />;
      case 'purchases':
        return <Purchases />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {renderPage()}
      </div>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <StoreProvider>
        <MainApp />
        {/* Lightweight themed toasts, app-wide */}
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#1e293b', // slate-800
              border: '1px solid #334155', // slate-700
              color: '#e2e8f0', // slate-200
            },
          }}
        />
      </StoreProvider>
    </Provider>
  );
}

export default App;
