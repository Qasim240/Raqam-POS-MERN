import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function Categories() {
  const {
    categories,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
    hasPermission,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (categories.some(c => c.name.toLowerCase() === formData.name.toLowerCase() && c.id !== editingId)) {
      alert('Category already exists');
      return;
    }

    if (editingId) {
      updateCategory(editingId, formData.name);
      setEditingId(null);
    } else {
      addCategory(formData.name);
    }

    setFormData({ name: '' });
    setShowForm(false);
  };

  const handleEdit = (category: any) => {
    setFormData({ name: category.name });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '' });
  };

  const getProductCount = (categoryId: string) => {
    return products.filter(p => p.category === categories.find(c => c.id === categoryId)?.name).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Categories</h1>
          <p className="text-slate-400">Total: {categories.length} categories</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const productCount = getProductCount(category.id);
          return (
            <div
              key={category.id}
              className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{category.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{productCount} products</p>
                </div>
                <div className="flex gap-2">
                  {hasPermission('categories.manage') && (
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('inventory.delete') && (
                    <button
                      onClick={() => {
                        if (productCount > 0) {
                          alert('Cannot delete category with products');
                          return;
                        }
                        if (confirm(`Delete ${category.name}?`)) {
                          deleteCategory(category.id);
                        }
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                      title="Delete"
                      disabled={productCount > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Products in Category */}
              {productCount > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Products:</p>
                  <div className="space-y-1">
                    {products.filter(p => p.category === category.name).slice(0, 3).map(product => (
                      <p key={product.id} className="text-xs text-slate-300">{product.name}</p>
                    ))}
                    {productCount > 3 && (
                      <p className="text-xs text-slate-400">+{productCount - 3} more...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No categories yet. Create one to get started!</p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Category' : 'Add New Category'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Shirts"
                  autoFocus
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
                  {editingId ? 'Update' : 'Add'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
