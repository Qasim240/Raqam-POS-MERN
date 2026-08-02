import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { Download, TrendingUp, Calendar } from 'lucide-react';

export default function Reports() {
  const { sales, products, todaySales, shopSettings } = useStore();
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  const formatCurrency = (value: number) => {
    return `${shopSettings.currency} ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Daily Report (Last 7 days)
  const getDailyData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const daySales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= dayStart && saleDate < dayEnd;
      });

      const total = daySales.reduce((sum, s) => sum + s.total, 0);

      data.push({
        date: format(date, 'MMM d'),
        fullDate: format(date, 'EEEE, MMMM d, yyyy'),
        total: Math.round(total * 100) / 100,
        transactions: daySales.length,
        revenue: Math.round(daySales.reduce((sum, s) => sum + s.subtotal, 0) * 100) / 100,
      });
    }
    return data;
  };

  // Monthly Report (Last 12 months)
  const getMonthlyData = () => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      const month = format(date, 'MMM yyyy');
      
      const monthSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return format(saleDate, 'MMM yyyy') === month;
      });

      const total = monthSales.reduce((sum, s) => sum + s.total, 0);

      data.push({
        month: format(date, 'MMM'),
        total: Math.round(total * 100) / 100,
        transactions: monthSales.length,
      });
    }
    return data;
  };

  // Today's Report
  const todayReport = () => {
    const total = todaySales.reduce((sum, s) => sum + s.total, 0);
    const subtotal = todaySales.reduce((sum, s) => sum + s.subtotal, 0);
    const discountAmount = todaySales.reduce((sum, s) => sum + s.discountAmount, 0);
    const cashReceived = todaySales.reduce((sum, s) => sum + s.cashReceived, 0);
    const totalItems = todaySales.reduce((sum, s) => sum + s.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0);

    return {
      transactions: todaySales.length,
      total,
      subtotal,
      discountAmount,
      cashReceived,
      totalItems,
      avgTransaction: todaySales.length > 0 ? total / todaySales.length : 0,
    };
  };

  // Export CSV
  const exportDailyReport = () => {
    const data = getDailyData();
    const headers = ['Date', 'Transactions', 'Revenue', 'Total (After Discount)'];
    const rows = data.map(row => [
      row.fullDate,
      row.transactions,
      row.revenue,
      row.total
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportSalesReport = () => {
    const headers = ['Date', 'Product', 'Quantity', 'Unit Price', 'Total'];
    const rows: any[] = [];

    sales.forEach(sale => {
      sale.items.forEach(item => {
        rows.push([
          format(new Date(sale.date), 'yyyy-MM-dd HH:mm'),
          item.name,
          item.quantity,
          item.price,
          item.price * item.quantity
        ]);
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const dailyData = getDailyData();
  const monthlyData = getMonthlyData();
  const today = todayReport();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-slate-400">Detailed sales and inventory analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportDailyReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Daily
          </button>
          <button
            onClick={exportSalesReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Sales
          </button>
        </div>
      </div>

      {/* Today's Report */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Today's Report - {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Transactions */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-slate-400 text-sm mb-2">Total Transactions</p>
            <p className="text-3xl font-bold text-blue-400">{today.transactions}</p>
            {today.avgTransaction > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                Avg: {formatCurrency(today.avgTransaction)}
              </p>
            )}
          </div>

          {/* Total Sales */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-slate-400 text-sm mb-2">Total Sales (After Discount)</p>
            <p className="text-3xl font-bold text-green-400">{formatCurrency(today.total)}</p>
            <p className="text-xs text-slate-400 mt-2">
              Subtotal: {formatCurrency(today.subtotal)}
            </p>
          </div>

          {/* Discount Amount */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-slate-400 text-sm mb-2">Total Discount</p>
            <p className="text-3xl font-bold text-red-400">{formatCurrency(today.discountAmount)}</p>
            <p className="text-xs text-slate-400 mt-2">
              Items Sold: {today.totalItems}
            </p>
          </div>

          {/* Cash Received */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-slate-400 text-sm mb-2">Cash Received</p>
            <p className="text-3xl font-bold text-purple-400">{formatCurrency(today.cashReceived)}</p>
          </div>
        </div>

        {/* Today's Transactions */}
        {todaySales.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mt-4">
            <h3 className="font-bold mb-4">Today's Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Time</th>
                    <th className="text-left px-4 py-2 font-semibold">Items</th>
                    <th className="text-right px-4 py-2 font-semibold">Subtotal</th>
                    <th className="text-right px-4 py-2 font-semibold">Discount</th>
                    <th className="text-right px-4 py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySales.map((sale, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="px-4 py-2">{format(new Date(sale.date), 'HH:mm')}</td>
                      <td className="px-4 py-2">{sale.items.length}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(sale.subtotal)}</td>
                      <td className="text-right px-4 py-2 text-red-400">-{formatCurrency(sale.discountAmount)}</td>
                      <td className="text-right px-4 py-2 font-bold text-green-400">{formatCurrency(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="space-y-8">
        {/* Report Type Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Last 12 Months
          </button>
        </div>

        {/* Daily Chart */}
        {reportType === 'daily' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Sales Trend (Last 7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Sales"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Daily Summary */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(dailyData.reduce((sum, d) => sum + d.total, 0))}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Total Transactions</p>
                <p className="text-xl font-bold text-blue-400">
                  {dailyData.reduce((sum, d) => sum + d.transactions, 0)}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Avg Per Day</p>
                <p className="text-xl font-bold text-purple-400">
                  {formatCurrency(dailyData.reduce((sum, d) => sum + d.total, 0) / dailyData.length)}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Best Day</p>
                <p className="text-xl font-bold text-orange-400">
                  {formatCurrency(Math.max(...dailyData.map(d => d.total)))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Chart */}
        {reportType === 'monthly' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Monthly Sales
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Bar dataKey="total" fill="#3b82f6" name="Sales" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Product Performance */}
      <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-2xl font-bold mb-4">Top Selling Products</h2>
        
        {sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Product</th>
                  <th className="text-right px-4 py-2 font-semibold">Units Sold</th>
                  <th className="text-right px-4 py-2 font-semibold">Revenue</th>
                  <th className="text-right px-4 py-2 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .map(product => {
                    const saleData = sales.flatMap(s => s.items).filter(item => item.productId === product.id);
                    const unitsSold = saleData.reduce((sum, item) => sum + item.quantity, 0);
                    const revenue = saleData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return { product, unitsSold, revenue };
                  })
                  .filter(d => d.unitsSold > 0)
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 10)
                  .map((item, idx) => {
                    const margin = ((item.product.salePrice - item.product.purchasePrice) / item.product.purchasePrice) * 100;
                    return (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-2 font-medium">{item.product.name}</td>
                        <td className="text-right px-4 py-2">{item.unitsSold}</td>
                        <td className="text-right px-4 py-2 font-bold text-green-400">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="text-right px-4 py-2 text-blue-400">{margin.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No sales data yet</p>
        )}
      </div>
    </div>
  );
}
