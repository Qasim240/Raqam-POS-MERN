import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Plus, Edit2, Trash2, Search, Download, AlertTriangle } from 'lucide-react';

export default function Inventory() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    inventorySearch,
    setInventorySearch,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    shopSettings,
    hasPermission,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
  });

  const formatCurrency = (value: number) => {
    return `${shopSettings.currency} ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category || formData.salePrice <= 0 || formData.stock < 0) {
      alert('Please fill all fields with valid values');
      return;
    }

    if (editingId) {
      updateProduct(editingId, {
        name: formData.name,
        category: formData.category,
        purchasePrice: formData.purchasePrice,
        salePrice: formData.salePrice,
        stock: formData.stock,
      });
      setEditingId(null);
    } else {
      addProduct({
        name: formData.name,
        category: formData.category,
        purchasePrice: formData.purchasePrice,
        salePrice: formData.salePrice,
        stock: formData.stock,
      });
    }

    setFormData({ name: '', category: '', purchasePrice: 0, salePrice: 0, stock: 0 });
    setShowForm(false);
  };

  const handleEdit = (product: any) => {
    setFormData({
      name: product.name,
      category: product.category,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      stock: product.stock,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', category: '', purchasePrice: 0, salePrice: 0, stock: 0 });
  };

  const exportCSV = () => {
    const headers = ['Name', 'Category', 'SKU', 'Purchase Price', 'Sale Price', 'Stock', 'Profit Margin'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.category,
      p.sku,
      p.purchasePrice,
      p.salePrice,
      p.stock,
      (((p.salePrice - p.purchasePrice) / p.purchasePrice) * 100).toFixed(2) + '%'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                          p.sku.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = filteredProducts.filter(p => p.stock < 10).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Inventory Management</h1>
          <p className="text-slate-400">Total: {filteredProducts.length} products</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          {hasPermission('inventory.add') && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-300">{lowStockCount} items with low stock</p>
            <p className="text-yellow-200 text-sm">Products with less than 10 units in stock need restocking</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategoryFilter('')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategoryFilter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.name)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
                selectedCategoryFilter === cat.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Product Name</th>
              <th className="px-4 py-3 text-left font-semibold">SKU</th>
              <th className="px-4 py-3 text-left font-semibold">Category</th>
              <th className="px-4 py-3 text-right font-semibold">Purchase</th>
              <th className="px-4 py-3 text-right font-semibold">Sale Price</th>
              <th className="px-4 py-3 text-right font-semibold">Margin</th>
              <th className="px-4 py-3 text-right font-semibold">Stock</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const margin = ((product.salePrice - product.purchasePrice) / product.purchasePrice) * 100;
              return (
                <tr
                  key={product.id}
                  className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-slate-400">{product.sku}</td>
                  <td className="px-4 py-3 text-slate-400">{product.category}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(product.purchasePrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-400">
                    {formatCurrency(product.salePrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400">{margin.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      product.stock < 10
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      {hasPermission('inventory.edit') && (
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('inventory.delete') && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${product.name}?`)) {
                              deleteProduct(product.id);
                            }
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No products found</p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cotton Polo Shirt"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase Price */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Purchase Price ({shopSettings.currency}) *
                </label>
                <input
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sale Price */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Sale Price ({shopSettings.currency}) *
                </label>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.salePrice > formData.purchasePrice && formData.purchasePrice > 0 && (
                  <p className="text-xs text-green-400 mt-1">
                    Profit margin: {(((formData.salePrice - formData.purchasePrice) / formData.purchasePrice) * 100).toFixed(1)}%
                  </p>
                )}
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  {editingId ? 'Update' : 'Add'} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
