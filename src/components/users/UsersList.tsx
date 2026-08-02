import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { User, UserRole } from '../../types';
import { PERMISSIONS, ROLE_LABELS, PERMISSION_GROUPS, DEFAULT_ROLE_PERMISSIONS } from '../../config/permissions';
import { cn } from '../../utils/cn';

// Icons as SVG components
const Icons = {
  Users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Edit: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      <path d="m15 5 4 4"/>
    </svg>
  ),
  Trash: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      <line x1="10" x2="10" y1="11" y2="17"/>
      <line x1="14" x2="14" y1="11" y2="17"/>
    </svg>
  ),
  Shield: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  ),
  Save: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/>
      <path d="M7 3v4a1 1 0 0 0 1 1h7"/>
    </svg>
  ),
  X: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  UserCheck: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  UserX: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="17" x2="22" y1="8" y2="13"/>
      <line x1="22" x2="17" y1="8" y2="13"/>
    </svg>
  ),
  Key: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="m21 2-9.6 9.6"/>
      <path d="m15.5 7.5 3 3L22 7l-3-3"/>
    </svg>
  )
};

export default function UsersList() {
  const { users, currentUser, addUser, updateUser, deleteUser, updateUserRole, updateUserPermissions, hasPermission } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    email: '',
    password: '',
    role: 'staff' as UserRole
  });
  
  const [tempPermissions, setTempPermissions] = useState<Record<string, boolean>>({});

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    if (!formData.name || !formData.email || !formData.password) return;
    
    addUser({
      name: formData.name,
      nameAr: formData.nameAr,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      isActive: true
    });
    
    setShowAddModal(false);
    setFormData({ name: '', nameAr: '', email: '', password: '', role: 'staff' });
  };

  const handleEditUser = () => {
    if (!selectedUser || !formData.name) return;
    
    updateUser(selectedUser.id, {
      name: formData.name,
      nameAr: formData.nameAr,
      email: formData.email,
      role: formData.role,
      password: formData.password || undefined
    });
    
    setShowEditModal(false);
    setSelectedUser(null);
    setFormData({ name: '', nameAr: '', email: '', password: '', role: 'staff' });
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account!');
      return;
    }
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser(userId);
    }
  };

  const handleToggleActive = (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own account!');
      return;
    }
    updateUser(user.id, { isActive: !user.isActive });
  };

  const handleRoleChange = (userId: string, role: UserRole) => {
    updateUserRole(userId, role);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      nameAr: user.nameAr || '',
      email: user.email,
      password: '',
      role: user.role
    });
    setShowEditModal(true);
  };

  const openPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setTempPermissions({ ...user.permissions });
    setShowPermissionsModal(true);
  };

  const togglePermission = (permissionId: string) => {
    setTempPermissions(prev => ({
      ...prev,
      [permissionId]: !prev[permissionId]
    }));
  };

  const selectAllPermissions = () => {
    const allPerms: Record<string, boolean> = {};
    PERMISSIONS.forEach(p => allPerms[p.id] = true);
    setTempPermissions(allPerms);
  };

  const applyDefaultRole = () => {
    if (selectedUser) {
      setTempPermissions({ ...DEFAULT_ROLE_PERMISSIONS[selectedUser.role] });
    }
  };

  const savePermissions = () => {
    if (selectedUser) {
      updateUserPermissions(selectedUser.id, tempPermissions);
    }
    setShowPermissionsModal(false);
    setSelectedUser(null);
  };

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    cashier: users.filter(u => u.role === 'cashier').length,
    staff: users.filter(u => u.role === 'staff').length,
    active: users.filter(u => u.isActive).length
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icons.Users className="w-7 h-7" />
            User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage staff accounts and permissions</p>
        </div>
        
        {hasPermission('users.add') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icons.Plus className="w-5 h-5" />
            Add User
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Icons.Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Administrators</p>
              <p className="text-2xl font-bold text-red-600">{roleStats.admin}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <Icons.Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cashiers</p>
              <p className="text-2xl font-bold text-blue-600">{roleStats.cashier}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Icons.UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{roleStats.active}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Icons.UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4">
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        user.role === 'admin' ? 'bg-red-500' : 
                        user.role === 'cashier' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      disabled={user.id === currentUser?.id || !hasPermission('users.edit')}
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border-0",
                        ROLE_LABELS[user.role].color,
                        user.id === currentUser?.id && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <option value="admin">Admin</option>
                      <option value="cashier">Cashier</option>
                      <option value="staff">Staff</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={user.id === currentUser?.id}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        user.isActive 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
                        user.id === currentUser?.id && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {user.isActive ? (
                        <>
                          <Icons.UserCheck className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <Icons.UserX className="w-3 h-3" /> Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {hasPermission('users.permissions') && (
                        <button
                          onClick={() => openPermissionsModal(user)}
                          className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-lg transition-colors"
                          title="Manage Permissions"
                        >
                          <Icons.Key className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('users.edit') && (
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Icons.Edit className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('users.delete') && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Icons.Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center">
            <Icons.Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New User</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام (Optional)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="جون"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="john@shop.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="staff">Staff</option>
                  <option value="cashier">Cashier</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.role === 'admin' && 'Full access to all features'}
                  {formData.role === 'cashier' && 'Can create sales and view inventory'}
                  {formData.role === 'staff' && 'Limited access for daily operations'}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Editing: {selectedUser.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام (Optional)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  disabled={selectedUser.id === currentUser?.id}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="staff">Staff</option>
                  <option value="cashier">Cashier</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setFormData({ name: '', nameAr: '', email: '', password: '', role: 'staff' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icons.Shield className="w-5 h-5 text-purple-600" />
                    Manage Permissions
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    User: {selectedUser.name} ({ROLE_LABELS[selectedUser.role].label})
                  </p>
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={selectAllPermissions}
                  className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800"
                >
                  Select All
                </button>
                <button
                  onClick={applyDefaultRole}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Apply Default {ROLE_LABELS[selectedUser.role].label} Permissions
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      {group.title}
                      <span className="text-gray-400 font-normal">/ {group.titleAr}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            tempPermissions[permission.id]
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={tempPermissions[permission.id] || false}
                            onChange={() => togglePermission(permission.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {permission.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {permission.labelAr}
                            </p>
                          </div>
                          {tempPermissions[permission.id] && (
                            <Icons.Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePermissions}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Icons.Save className="w-4 h-4" />
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
