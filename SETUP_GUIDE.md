# QuickMart POS - Complete Setup Guide

## Quick Start (2 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
Navigate to `http://localhost:5173`

### 4. Login with Demo Accounts

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@quickmart.com | 123456 | Full access to all features |
| **Cashier** | cashier@quickmart.com | 123456 | POS, Inventory View, Reports View |
| **Staff** | staff@quickmart.com | 123456 | POS only |

---

## User Management & Permissions

### Roles Overview

| Role | Description | Default Permissions |
|------|-------------|---------------------|
| **Admin** | Full system access | All permissions enabled |
| **Cashier** | Sales operations | POS, Inventory View, Reports View |
| **Staff** | Basic operations | POS only (no discounts) |

### Accessing User Management

Only **Admin** users can access the User Management panel:

1. Login with Admin credentials
2. Click on "User Management" in the sidebar
3. View all users, their roles, and status

### Managing Users

From the User Management page, admins can:

- **Add New User:** Click "Add User" button
  - Enter full name, email, password
  - Select role (Admin/Cashier/Staff)
  - System auto-assigns default permissions based on role

- **Edit User:** Click the edit icon
  - Update name, email, password
  - Change role (except for own account)
  - Cannot edit own admin role

- **Delete User:** Click the trash icon
  - Confirmation dialog appears
  - Cannot delete own account
  - All data preserved

- **Toggle Active Status:** Click active/inactive badge
  - Deactivate users without deleting
  - Inactive users cannot login
  - Cannot deactivate own account

### Customizing Permissions

Admins can customize individual user permissions:

1. Click the key icon next to any user
2. View all permissions organized by category:
   - Dashboard
   - POS & Sales
   - Inventory
   - Categories
   - Reports
   - User Management
   - Settings
3. Toggle individual permissions on/off
4. Use "Select All" for full access
5. Use "Apply Default [Role] Permissions" to reset

---

## Project Architecture

### Component Structure

```
App (Main Entry Point)
├── Login (Authentication)
└── MainApp (After Login)
    ├── Sidebar (Navigation with permissions)
    └── Page Components
        ├── Dashboard (Overview & Stats)
        ├── POS (Point of Sale Terminal)
        ├── Inventory (Product Management)
        ├── Categories (Category Management)
        ├── Reports (Analytics & Charts)
        ├── UsersList (User & Permission Management)
        └── Settings (Shop Configuration)
```

### State Management

The app uses **React Context API** for global state management:

```
StoreContext
├── Authentication
│   ├── isLoggedIn
│   ├── currentUser
│   ├── hasPermission()
│   ├── login()
│   └── logout()
├── Navigation
│   ├── currentPage
│   └── setCurrentPage()
├── Shop Settings
│   ├── shopSettings
│   └── updateShopSettings()
├── Users Management
│   ├── users[]
│   ├── addUser()
│   ├── updateUser()
│   ├── updateUserPermissions()
│   ├── updateUserRole()
│   └── deleteUser()
├── Products & Inventory
│   ├── products[]
│   ├── categories[]
│   ├── addProduct()
│   ├── updateProduct()
│   ├── deleteProduct()
├── Sales & Transactions
│   ├── sales[]
│   ├── addSale()
│   ├── todaySales
│   ├── todaySalesAmount
├── POS Cart
│   ├── cart[]
│   ├── cartSubtotal
│   ├── cartTotal
│   ├── addToCart()
│   ├── updateCartQuantity()
│   ├── removeFromCart()
├── Discount System
│   ├── discountType ('fixed' or 'percentage')
│   ├── discountValue
│   ├── discountAmount (calculated)
└── Analytics
    ├── hotSellingProducts[]
    ├── recentSales[]
    └── lowStockCount
```

### Permission Configuration

**File:** `src/config/permissions.ts`

All system permissions are defined here:
- Permission definitions with labels in English and Urdu
- Default permissions for each role
- Permission groups for UI organization

---

## Detailed Feature Guide

### 1. Login System

**File:** `src/components/Login.tsx`

```typescript
Demo Credentials:
- Email: admin@quickmart.com
- Password: 123456
- Role: Admin

- Email: cashier@quickmart.com
- Password: 123456
- Role: Cashier

- Email: staff@quickmart.com
- Password: 123456
- Role: Staff
```

Features:
- Clean, modern login form
- Error handling
- Auto-fill demo credentials
- Persistent session (localStorage)

### 2. Dashboard

**File:** `src/components/Dashboard.tsx`

Real-time overview showing:
- **Today's Sales:** Total revenue for current day
- **Total Products:** Count of all items in inventory
- **Low Stock Alerts:** Items with less than 10 units
- **Total Transactions:** Count of all sales (all-time)
- **Hot Selling Products:** Top 5 best-selling items
- **Recent Transactions:** Latest 5 sales

Data filters by current date (changes at midnight).

### 3. POS Terminal

**File:** `src/components/POS.tsx`

Optimized for fast checkout:

**Step-by-step workflow:**

1. **Search Products**
   - Type product name or SKU
   - Filter by category
   - Real-time search

2. **Add to Cart**
   - Click product tile
   - Auto-increments if already in cart
   - Shows stock availability

3. **Cart Management**
   - View all selected items
   - Adjust quantities
   - Remove items
   - See running total

4. **Apply Discount**
   - Choose discount type:
     - **Fixed:** Direct amount (e.g., ৳200)
     - **Percentage:** Percentage off (e.g., 10%)
   - Real-time total recalculation
   - Shows savings amount

5. **Payment Processing**
   - Enter cash received
   - Auto-calculates change
   - Quick amount buttons (500, 1000, 2000, 5000)
   - Complete sale button

6. **Receipt**
   - Professional receipt format
   - Shows shop info (from settings)
   - Lists all items
   - Displays discounts
   - Print to 80mm thermal printer

**Special Features:**
- Cart persists until payment
- Stock validation
- Real-time calculations
- Today's sales summary always visible
- Hot sellers list
- Recent transactions on sidebar

### 4. Inventory Management

**File:** `src/components/Inventory.tsx`

**Product Fields:**
- Product Name
- Category (dropdown)
- Purchase Price
- Sale Price (auto-calculate margin)
- Stock Quantity

**Actions:**
- Add new product
- Edit existing product
- Delete product
- Search by name/SKU
- Filter by category
- View profit margin %
- Stock status indicator
- Export to CSV

**CSV Export Format:**
```
Name,Category,SKU,Purchase Price,Sale Price,Stock,Profit Margin
Cotton Polo Shirt,Shirts,QM-SH001,800,1499,45,87.38%
```

### 5. Categories Management

**File:** `src/components/Categories.tsx`

**Features:**
- Add new category
- Edit category name
- Delete category (only if no products)
- View product count per category
- Product list preview (first 3)
- Grid layout for easy management

**Safety:**
- Prevents deletion of categories with products
- Duplicate name prevention

### 6. Reports & Analytics

**File:** `src/components/Reports.tsx`

**Three Report Views:**

**A. Today's Report**
- Total transactions
- Total sales (after discount)
- Total discount given
- Cash received
- Average transaction value
- Detailed transaction list

**B. 7-Day Trend**
- Interactive line chart
- Daily revenue comparison
- Transaction count per day
- Summary statistics:
  - Total revenue
  - Total transactions
  - Average per day
  - Best day performance

**C. Monthly Overview**
- Bar chart visualization
- 12-month history
- Month-to-month comparison

**D. Top Selling Products**
- Product ranking by revenue
- Units sold
- Profit margin per product
- Top 10 products

**CSV Exports:**
- Daily sales report
- Detailed product sales with timestamps

### 7. Settings

**File:** `src/components/Settings.tsx`

**Configuration Options:**
- Shop Name
- Shop Address
- Shop Phone
- Shop Email
- Currency (PKR, USD, EUR, GBP, AED, SAR)

**Receipt Preview:**
Shows how shop info appears on receipts

**Data Persistence:**
All settings saved automatically to localStorage

---

## Sample Data Overview

### Pre-loaded Categories
1. Shirts
2. Pants
3. Dresses
4. Accessories
5. Shoes

### Sample Products
```
Cotton Polo Shirt       | Shirts      | ৳1,499 | 45 units | 87% margin
Denim Jeans             | Pants       | ৳2,499 | 32 units | 108% margin
Summer Floral Dress     | Dresses     | ৳2,199 | 18 units | 100% margin
Leather Belt            | Accessories | ৳899   | 67 units | 157% margin
Casual Sneakers         | Shoes       | ৳2,999 | 24 units | 100% margin
Oxford Button Down      | Shirts      | ৳1,799 | 29 units | 89% margin
Chino Trousers          | Pants       | ৳1,899 | 41 units | 111% margin
Silk Scarf              | Accessories | ৳999   | 55 units | 138% margin
```

### Sample Transactions
Two sample transactions for today:
- Transaction 1: Shirt + Belt (10:30 AM) - ৳3,697
- Transaction 2: Jeans + Sneakers (2:15 PM) - ৳4,948

---

## Data Flow & Persistence

### How Data Flows

```
User Action
    ↓
Component (e.g., POS.tsx)
    ↓
StoreContext Function Call
    ↓
State Update
    ↓
localStorage Update
    ↓
Component Re-render
    ↓
User Sees Updated UI
```

### localStorage Keys

```javascript
localStorage.getItem('products')         // All products
localStorage.getItem('categories')       // All categories
localStorage.getItem('sales')           // All transactions
localStorage.getItem('shopSettings')    // Shop configuration
localStorage.getItem('user')            // Logged-in user info
localStorage.getItem('isLoggedIn')      // Session status
```

### Data Types

```typescript
// Product
{
  id: string (e.g., "p1")
  name: string
  category: string
  sku: string (auto-generated: QM-XXXX)
  purchasePrice: number
  salePrice: number
  stock: number
}

// Category
{
  id: string
  name: string
}

// Sale
{
  id: string
  date: string (ISO format)
  items: SaleItem[]
  subtotal: number
  discountType: 'fixed' | 'percentage'
  discountValue: number
  discountAmount: number (calculated)
  total: number
  cashReceived: number
  change: number
}

// SaleItem
{
  productId: string
  name: string
  price: number
  quantity: number
}
```

---

## Key Calculations

### Profit Margin
```
Margin = ((Sale Price - Purchase Price) / Purchase Price) × 100
Example: ((1499 - 800) / 800) × 100 = 87.38%
```

### Discount Calculation
```
// Fixed Discount
Final Total = Subtotal - Fixed Amount

// Percentage Discount
Final Total = Subtotal - (Subtotal × Percentage / 100)
```

### Change Calculation
```
Change = Cash Received - Final Total
```

---

## User Interface Details

### Color Scheme

- **Primary:** Blue (#3b82f6) - Actions, highlights
- **Success:** Green (#10b981) - Positive actions, sales
- **Warning:** Yellow (#f59e0b) - Low stock alerts
- **Error:** Red (#ef4444) - Discounts, deletions
- **Background:** Dark slate (#0f172a to #1e293b)
- **Text:** White and slate-400

### Responsive Breakpoints

- **Mobile:** < 640px (single column, full-width)
- **Tablet:** 640px - 1024px (2 columns)
- **Desktop:** > 1024px (3+ columns, full layout)

### Key UI Components

- **Cards:** Content containers with border
- **Buttons:** Actions with hover states
- **Input Fields:** Text/number inputs with focus states
- **Tables:** Scrollable on mobile
- **Modals:** Overlays for forms
- **Charts:** Recharts components with legend

---

## Testing the System

### Test Workflow

1. **Login**
   - Use demo credentials
   - Verify dashboard loads

2. **Create Products**
   - Add 3-5 new products
   - Set different prices
   - Choose various categories

3. **Test POS**
   - Add products to cart
   - Test quantity adjustment
   - Apply discount (fixed and %)
   - Complete a sale
   - Print receipt

4. **Verify Inventory**
   - Check stock decreased
   - View product list
   - Export CSV

5. **Check Reports**
   - View today's report
   - Check sales chart
   - Review hot sellers

6. **Update Settings**
   - Change shop name
   - Verify on receipt

---

## Common Tasks

### Add a New Product
1. Go to Inventory
2. Click "Add Product" button
3. Fill form:
   - Name: e.g., "Blue T-Shirt"
   - Category: Select from dropdown
   - Purchase Price: 500
   - Sale Price: 1200
   - Stock: 50
4. Click "Add Product"

### Process a Sale
1. Go to POS
2. Search for products
3. Click to add to cart
4. Adjust quantities as needed
5. Apply discount if needed
6. Click "Proceed to Payment"
7. Enter cash amount
8. Click "Complete Sale"
9. Print receipt

### View Daily Report
1. Go to Reports
2. Check "Today's Report" section
3. Review transaction list
4. Export if needed

### Change Shop Info
1. Go to Settings
2. Update shop details
3. Click "Save Settings"
4. Verify preview shows correctly

---

## Keyboard Shortcuts (Future Enhancement)

Currently not implemented but planned:
- `Ctrl+P` - Print receipt
- `Ctrl+E` - Export
- `Escape` - Close modal/cancel

---

## Performance Tips

1. **Search Efficiently**
   - Use SKU codes for quick product lookup
   - Filter by category before searching

2. **Daily Cleanup**
   - Export old reports regularly
   - System handles all data in localStorage

3. **Fast Checkout**
   - Use category filter to reduce product list
   - Pre-populate frequent items

---

## Troubleshooting Common Issues

### Issue: Data Lost After Closing Browser

**Solution:** Check if localStorage is enabled
```javascript
// In browser console:
localStorage.setItem('test', 'value');
console.log(localStorage.getItem('test')); // Should show 'value'
```

### Issue: Receipt Won't Print

**Solution:** 
- Disable popup blockers
- Use Ctrl+P as backup
- Ensure printer is connected

### Issue: Discount Not Calculating

**Solution:**
- Ensure cart has items
- Check discount value is entered
- Clear cache if persists

### Issue: Slow Performance with Many Products

**Solution:**
- Use search/filter to reduce visible items
- Export old sales data
- Clear browser cache

---

## File Modification Guide

### To Add a New Feature

1. **Update Types** (if needed)
   ```typescript
   // src/types/index.ts
   // Add your new type
   ```

2. **Update Context** (if state needed)
   ```typescript
   // src/contexts/StoreContext.tsx
   // Add state and methods
   ```

3. **Create Component**
   ```typescript
   // src/components/YourComponent.tsx
   // Build your feature
   ```

4. **Add to Navigation**
   ```typescript
   // src/components/Sidebar.tsx
   // Add menu item
   ```

5. **Update App Router**
   ```typescript
   // src/App.tsx
   // Add case in renderPage()
   ```

---

## Build & Deployment

### Build for Production
```bash
npm run build
```

Generates `dist/index.html` - ready to serve

### Deploy to GitHub Pages
```bash
npm run build
# Deploy dist/ folder to GitHub Pages
```

### Deploy to Vercel
```bash
npm run build
# Connect GitHub repo to Vercel
```

### Deploy Locally
```bash
npm run dev  # Development
npm run build && npm run preview  # Production preview
```

---

## Version History

**v1.0.0** - Initial Release
- Complete POS system
- Inventory management
- Sales reporting
- Shop settings
- Receipt printing

---

## Support & Help

1. **For Setup Issues:** Check dependencies are installed
2. **For Feature Questions:** Review this guide
3. **For Data Issues:** Check localStorage in DevTools
4. **For Print Issues:** Check browser permissions

---

**Happy Selling with QuickMart POS! 🚀**
