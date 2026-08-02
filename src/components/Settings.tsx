import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Save, RotateCcw } from 'lucide-react';

export default function Settings() {
  const { shopSettings, updateShopSettings, accounts } = useStore();
  const [formData, setFormData] = useState(shopSettings);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof typeof shopSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleAccountField = (
    field:
      | 'defaultCashAccountId'
      | 'defaultBankAccountId'
      | 'defaultSalesIncomeAccountId'
      | 'defaultSalesReturnAccountId'
      | 'defaultCustomerReceivableAccountId'
      | 'defaultInventoryAccountId',
    value: string,
  ) => {
    setFormData(prev => ({ ...prev, [field]: value || null }));
    setSaved(false);
  };

  const postable = (a: typeof accounts[number]) => a.isActive && a.allowPosting !== false && !a.controlAccount;
  const cashAccounts = accounts.filter(a => postable(a) && (a.type === 'cash' || a.type === 'asset'));
  const bankAccounts = accounts.filter(a => postable(a) && (a.type === 'bank' || a.type === 'asset'));
  const incomeAccounts = accounts.filter(a => postable(a) && a.type === 'income');
  const receivableAccounts = accounts.filter(a => a.isActive && a.type === 'asset');
  const inventoryAccounts = accounts.filter(a => postable(a) && a.type === 'asset');

  const handleSave = () => {
    updateShopSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setFormData(shopSettings);
  };

  const isChanged = JSON.stringify(formData) !== JSON.stringify(shopSettings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-slate-400">Manage your shop information and preferences</p>
      </div>

      {/* Shop Settings */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl mb-8">
        <h2 className="text-2xl font-bold mb-6">Shop Information</h2>

        <div className="space-y-4">
          {/* Shop Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Shop Name
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => handleChange('shopName', e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">This will appear on your receipts</p>
          </div>

          {/* Shop Address */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Shop Address
            </label>
            <input
              type="text"
              value={formData.shopAddress}
              onChange={(e) => handleChange('shopAddress', e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Displayed on receipts</p>
          </div>

          {/* Shop Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Shop Phone
            </label>
            <input
              type="tel"
              value={formData.shopPhone}
              onChange={(e) => handleChange('shopPhone', e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Shown on receipts for customer reference</p>
          </div>

          {/* Shop Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Shop Email
            </label>
            <input
              type="email"
              value={formData.shopEmail}
              onChange={(e) => handleChange('shopEmail', e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Contact email address</p>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PKR">PKR - Pakistani Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AED">AED - UAE Dirham</option>
              <option value="SAR">SAR - Saudi Riyal</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">Used in all pricing and reports</p>
          </div>
        </div>

        {/* Accounting Defaults */}
        <div className="mt-8 pt-8 border-t border-slate-700">
          <h3 className="text-lg font-bold mb-1">Accounting Defaults</h3>
          <p className="text-xs text-slate-400 mb-4">Used when posting sales and returns to the ledger. Leave blank to skip auto-posting.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Cash Account</label>
              <select
                value={formData.defaultCashAccountId || ''}
                onChange={e => handleAccountField('defaultCashAccountId', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {cashAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Bank Account</label>
              <select
                value={formData.defaultBankAccountId || ''}
                onChange={e => handleAccountField('defaultBankAccountId', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Sales Income Account</label>
              <select
                value={formData.defaultSalesIncomeAccountId || ''}
                onChange={e => handleAccountField('defaultSalesIncomeAccountId', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {incomeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Sales Return Account</label>
              <select
                value={formData.defaultSalesReturnAccountId || ''}
                onChange={e => handleAccountField('defaultSalesReturnAccountId', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {incomeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Customer Receivable (parent for new customer accounts)</label>
              <select
                value={formData.defaultCustomerReceivableAccountId || ''}
                onChange={e => handleAccountField('defaultCustomerReceivableAccountId', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {receivableAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Inventory Account (used by purchases)</label>
              <select
                value={formData.defaultInventoryAccountId || ''}
                onChange={e => handleAccountField('defaultInventoryAccountId', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {inventoryAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-8 pt-8 border-t border-slate-700">
          <h3 className="text-lg font-bold mb-4">Receipt Preview</h3>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 font-mono text-xs text-center max-w-xs mx-auto">
            <p className="font-bold text-sm mb-2">{formData.shopName}</p>
            <p className="text-slate-400 mb-1">{formData.shopAddress}</p>
            <p className="text-slate-400 mb-1">{formData.shopPhone}</p>
            <p className="text-slate-400 mb-2">{formData.shopEmail}</p>
            <div className="border-t border-slate-500 pt-2 mt-2">
              <p>Currency: {formData.currency}</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mt-6 bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg text-sm">
            ✓ Settings saved successfully!
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-8">
          <button
            onClick={handleSave}
            disabled={!isChanged}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
          <button
            onClick={handleReset}
            disabled={!isChanged}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {/* About */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-bold mb-3">About QuickMart POS</h3>
          <p className="text-slate-400 text-sm">
            A modern, fast, and easy-to-use Point of Sale system designed for small to medium retail shops.
          </p>
        </div>

        {/* Version */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-bold mb-3">System Information</h3>
          <div className="space-y-2 text-sm text-slate-400">
            <p>Version: 1.0.0</p>
            <p>Platform: Web-based</p>
            <p>Data Storage: Local</p>
          </div>
        </div>
      </div>
    </div>
  );
}
