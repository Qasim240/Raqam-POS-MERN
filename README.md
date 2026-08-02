# QuickMart POS - Point of Sale & Inventory Management System

A modern, fast, and easy-to-use web-based POS and Inventory Management System designed for small to medium retail shops. Built with React, Vite, and Tailwind CSS.

## 🚀 Quick Start

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@quickmart.com | 123456 |
| **Cashier** | cashier@quickmart.com | 123456 |
| **Staff** | staff@quickmart.com | 123456 |

> **Note:** All users have the password `123456` for demo purposes.

## 🎯 Features

### 1. **Authentication & Authorization System**
- Secure login with email and password
- Role-based access control (Admin, Cashier, Staff)
- Granular permission system
- Demo credentials included for testing
- Session management with persistent login state
- User activity tracking

### 2. **Dashboard**
- Real-time sales overview for today
- Total products in inventory count
- Low stock alerts with visual indicators
- Recent transactions list
- Hot selling products tracking

### 3. **Point of Sale (POS) System**
- Fast product search by name or SKU
- Product filtering by category
- Shopping cart with quantity management
- Quick add/remove functionality
- **Flexible Discount System:**
  - Fixed amount discounts
  - Percentage-based discounts
  - Auto-calculated totals
- Cash payment processing
- Change calculation
- Automatic receipt generation with printing
- Real-time stock deduction after sale

### 4. **Inventory Management**
- Add new products with all details
- Edit/Delete products
- Product information:
  - Name, Category, SKU
  - Purchase Price, Sale Price
  - Stock Quantity
  - Profit Margin calculation
- Category-based filtering
- Low stock highlighting (< 10 units)
- Profit margin visibility
- CSV export functionality

### 5. **User Management & Permissions**
- **Role-Based Access Control:**
  - **Admin:** Full access to all features and settings
  - **Cashier:** Can create sales, view inventory, apply discounts
  - **Staff:** Limited access for daily POS operations
- **Granular Permission System:**
  - View Dashboard / Reports
  - Create Sales / Apply Discounts
  - Manage Inventory (Add/Edit/Delete)
  - Manage Categories
  - Export Reports
  - User Management
  - Settings Management
- **User Management Features:**
  - Add/Edit/Delete user accounts
  - Assign roles to users
  - Toggle user active/inactive status
  - Custom permission assignment per user
  - User activity tracking (created date, last login)
- Admin can manage all users and permissions
- Cashiers and Staff cannot access user management

### 6. **Categories Management**
- Add/Edit/Delete categories
- View product count per category
- Product list preview
- Prevent deletion of categories with products

### 6. **Advanced Reporting**
- **Daily Sales Report** (Last 7 days)
  - Interactive line chart
  - Daily transaction count
  - Revenue tracking
- **Monthly Overview**
  - Bar chart visualization
  - Trend analysis
- **Today's Report**
  - Transaction summary
  - Total sales and discounts
  - Items sold tracking
  - Average transaction value
- **Top Selling Products**
  - Revenue contribution
  - Profit margin analysis
- **CSV Export**
  - Daily sales report
  - Detailed product sales

### 7. **Settings & Shop Information**
- Configure shop name
- Set shop address
- Add phone and email
- Currency selection (PKR, USD, EUR, etc.)
- Receipt preview
- Settings persist across sessions

### 8. **Receipt System**
- Professional receipt format
- Shop information display
- Item list with quantities
- Subtotal and discount display
- Total amount and change
- Print-ready format (80mm thermal printer compatible)
- Customizable via shop settings

### 9. **User Interface**
- Clean, modern dark theme
- Responsive design (mobile, tablet, desktop)
- Fast navigation between modules
- Intuitive cart management
- Visual status indicators
- Real-time updates

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quickmart-pos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The application will open at `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```

### Demo Credentials

- **Email:** `admin@quickmart.com`
- **Password:** `123456`

## 📁 Project Structure

```
src/
├── components/
│   ├── Login.tsx           # Authentication page
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── Dashboard.tsx       # Main dashboard with stats
│   ├── POS.tsx            # Point of Sale terminal
│   ├── Inventory.tsx      # Product management
│   ├── Categories.tsx     # Category management
│   ├── Reports.tsx        # Sales reports & analytics
│   ├── Settings.tsx       # Shop configuration
│   └── ReceiptPrinter.tsx # Receipt component
├── contexts/
│   └── StoreContext.tsx   # Global state management
├── types/
│   └── index.ts           # TypeScript type definitions
├── utils/
│   └── cn.ts             # Utility functions
├── App.tsx               # Main app component
├── main.tsx              # Entry point
└── index.css             # Global styles
```

## 🛠️ Technology Stack

- **Frontend Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **Icons:** Lucide React
- **Charts:** Recharts
- **Date Handling:** date-fns
- **Language:** TypeScript

## 📊 Data Management

### Local Storage
All data is stored in the browser's localStorage:
- Products
- Categories
- Sales/Transactions
- Shop Settings
- User Session

### Data Structure

**Product:**
```typescript
{
  id: string
  name: string
  category: string
  sku: string
  purchasePrice: number
  salePrice: number
  stock: number
}
```

**Sale:**
```typescript
{
  id: string
  date: string
  items: SaleItem[]
  subtotal: number
  discountType: 'fixed' | 'percentage'
  discountValue: number
  discountAmount: number
  total: number
  cashReceived: number
  change: number
}
```

## 🎮 Usage Guide

### POS Terminal
1. Search for products using name or SKU
2. Filter by category for quick access
3. Click product to add to cart
4. Adjust quantities with +/- buttons
5. Apply discount (fixed or percentage)
6. Click "Proceed to Payment"
7. Enter cash received
8. Print receipt (opens in new window)

### Inventory Management
1. View all products in table format
2. Search by name or SKU
3. Filter by category
4. Edit product details
5. Delete products
6. Export inventory as CSV
7. Monitor stock levels and profit margins

### Reports
1. View today's detailed report
2. Check 7-day sales trend
3. Analyze monthly performance
4. Identify top-selling products
5. Export reports as CSV

### Settings
1. Update shop name (displayed on receipts)
2. Set shop address and phone
3. Configure currency
4. Preview receipt format
5. Changes save automatically

## 💡 Key Features Explained

### Dynamic Discount System
- Choose between fixed amount or percentage discount
- Real-time calculation of total amount
- Visual feedback of savings
- Works with any cart value

### Smart Stock Management
- Automatic stock deduction after each sale
- Low stock alerts in inventory view
- Stock availability check at checkout
- Prevent overselling

### Hot Selling Products
- Automatically calculated from sales data
- Displays top 5 best-selling items
- Quantity sold tracking
- Available on dashboard and POS

### Daily Sales Tracking
- Automatic date-based filtering
- Today's total prominently displayed
- Transaction count
- Real-time updates

## 🔒 Security Notes

This is a demo application with local storage. For production use:
- Implement backend authentication
- Use secure database
- Add user role management
- Implement data encryption
- Add audit trails

## 📱 Responsive Design

- **Mobile:** Optimized for phones (cart below products)
- **Tablet:** Side-by-side layout with better touch targets
- **Desktop:** Full desktop experience with maximized view

## 🚀 Future Enhancements

- Employee management with sales tracking
- Supplier management
- Credit system (Udhaar/Qarz)
- Multi-shop support (SaaS)
- Barcode/QR code scanning
- Backup and restore functionality
- Advanced analytics
- Customer loyalty system
- Expense tracking

## 📝 Sample Data

The system comes pre-loaded with sample clothing store data:
- 5 product categories (Shirts, Pants, Dresses, Accessories, Shoes)
- 8 sample products with realistic pricing
- Sample transactions for today
- All data can be replaced with your own

## 🐛 Troubleshooting

### Data Not Saving
- Check browser localStorage is enabled
- Ensure not in private/incognito mode
- Clear browser cache and reload

### Receipt Not Printing
- Ensure popup blocker is disabled
- Check browser print settings
- Verify printer is connected

### Performance Issues
- Clear browser cache
- Reduce number of stored transactions
- Use newer browser version

## 📞 Support

For issues or questions:
1. Check the README
2. Review sample data
3. Test with demo credentials
4. Check browser console for errors

## 📄 License

This project is provided as-is for educational and commercial use.

## 🙏 Acknowledgments

Built with modern React best practices and designed for local shopkeepers in mind. Supports English language with future Urdu support.

---

**QuickMart POS v1.0.0**
*Making retail management simple and fast*
