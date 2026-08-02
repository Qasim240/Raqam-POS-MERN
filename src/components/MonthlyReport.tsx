import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { reportApi, MonthlyReportData } from '../services/api';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Printer, Download, TrendingUp, TrendingDown, ShoppingCart, DollarSign, Package, Search, Loader2 } from 'lucide-react';
import { SkeletonCards, SkeletonLines } from './ui/Skeleton';

export default function MonthlyReport() {
  const { shopSettings } = useStore();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmt = (value: number) => {
    return `${shopSettings.currency} ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrency = fmt;

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reportApi.getMonthly(selectedMonth, selectedYear);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const buildPrintHTML = () => {
    if (!report) return '';
    const r = report;
    const s = r.summary;

    // Daily breakdown rows
    let dailyRows = '';
    r.dailyBreakdown.forEach((d) => {
      const dateLabel = format(new Date(d.date), 'EEE, MMM d');
      const cls = d.transactions === 0 ? ' style="color:#aaa"' : '';
      dailyRows += `<tr${cls}><td>${dateLabel}</td><td class="c">${d.transactions}</td><td class="c">${d.itemsSold}</td><td class="r">${d.total > 0 ? fmt(d.total) : '-'}</td></tr>`;
    });

    // Product breakdown rows
    let productRows = '';
    r.productBreakdown.forEach((p, i) => {
      productRows += `<tr><td>${i + 1}</td><td>${p.name}</td><td class="c">${p.quantitySold}</td><td class="r">${fmt(p.revenue)}</td><td class="r">${fmt(p.cost)}</td><td class="r">${fmt(p.profit)}</td><td class="r">${p.margin}%</td></tr>`;
    });

    // Cashier rows
    let cashierRows = '';
    r.cashierBreakdown.forEach((c) => {
      const avg = c.transactions > 0 ? fmt(c.total / c.transactions) : '-';
      cashierRows += `<tr><td>${c.cashierName}</td><td class="c">${c.transactions}</td><td class="r">${fmt(c.total)}</td><td class="r">${avg}</td></tr>`;
    });

    // Best/worst days
    let bestDaysRows = '';
    r.bestDays.forEach((d, i) => {
      bestDaysRows += `<tr><td>${i + 1}</td><td>${format(new Date(d.date), 'EEE, MMM d')}</td><td class="c">${d.transactions}</td><td class="r">${fmt(d.total)}</td></tr>`;
    });
    let worstDaysRows = '';
    r.worstDays.forEach((d, i) => {
      worstDaysRows += `<tr><td>${i + 1}</td><td>${format(new Date(d.date), 'EEE, MMM d')}</td><td class="c">${d.transactions}</td><td class="r">${fmt(d.total)}</td></tr>`;
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Monthly Report - ${r.monthName} ${r.year}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;padding:30px 40px;font-size:13px;line-height:1.5}
.header{text-align:center;padding-bottom:12px;border-bottom:3px double #333;margin-bottom:18px}
.header h1{font-size:24px;font-weight:700;letter-spacing:0.5px}
.header .addr{font-size:11px;color:#555;margin-top:2px}
.header .phone{font-size:11px;color:#555}
.title{text-align:center;font-size:18px;font-weight:700;margin:14px 0 2px;text-transform:uppercase;letter-spacing:1px}
.date{text-align:center;font-size:13px;color:#444;margin-bottom:18px}
.section{font-size:14px;font-weight:700;margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid #222;text-transform:uppercase;letter-spacing:0.5px}
.box{border:1px solid #bbb;padding:12px 16px;margin-bottom:14px}
.row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
.row .label{color:#555}
.row .val{font-weight:600}
.row.big .val{font-size:16px}
.row.highlight{border-top:1px solid #999;padding-top:8px;margin-top:4px}
.row.highlight .val{font-size:18px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px}
th{background:#f0f0f0;border:1px solid #ccc;padding:6px 8px;font-weight:600;text-align:left;font-size:11px;text-transform:uppercase}
td{border:1px solid #ddd;padding:5px 8px}
.r{text-align:right} .c{text-align:center} .b{font-weight:700}
tfoot td{background:#f5f5f5;font-weight:700;border-top:2px solid #999}
.two-col{display:flex;gap:20px;margin-bottom:14px}
.two-col>div{flex:1}
.footer{text-align:center;margin-top:24px;padding-top:12px;border-top:3px double #333;font-size:10px;color:#888}
@media print{body{padding:15px 20px}@page{margin:10mm}}
</style></head><body>

<div class="header">
  <h1>${shopSettings.shopName}</h1>
  <div class="addr">${shopSettings.shopAddress}</div>
  <div class="phone">Tel: ${shopSettings.shopPhone}</div>
</div>

<div class="title">Monthly Sales Report</div>
<div class="date">${r.monthName} ${r.year}</div>

<div class="section">Sales Summary</div>
<div class="box">
  <div class="row"><span class="label">Total Transactions</span><span class="val">${s.totalTransactions}</span></div>
  <div class="row"><span class="label">Active Selling Days</span><span class="val">${s.activeDays}</span></div>
  <div class="row"><span class="label">Total Items Sold</span><span class="val">${s.totalItemsSold}</span></div>
  <div class="row"><span class="label">Average Transaction Value</span><span class="val">${fmt(s.avgTransactionValue)}</span></div>
  <div class="row"><span class="label">Average Daily Sales</span><span class="val">${fmt(s.avgDailySales)}</span></div>
  ${s.totalReturns > 0 ? `<div class="row"><span class="label">Returns / Refunds</span><span class="val">${s.totalReturns} (${fmt(s.totalRefundAmount)})</span></div>` : ''}
</div>

<div class="section">Financial Summary</div>
<div class="box">
  <div class="row"><span class="label">Gross Revenue (Before Discount)</span><span class="val">${fmt(s.totalSubtotal)}</span></div>
  <div class="row"><span class="label">Total Discount</span><span class="val">- ${fmt(s.totalDiscount)}</span></div>
  <div class="row big"><span class="label">Total Sales (After Discount)</span><span class="val">${fmt(s.totalSales)}</span></div>
  <div class="row"><span class="label">Total Cost of Goods Sold</span><span class="val">${fmt(s.totalCost)}</span></div>
  <div class="row highlight"><span class="label">GROSS PROFIT</span><span class="val">${fmt(s.totalProfit)}</span></div>
  <div class="row"><span class="label">Profit Margin</span><span class="val">${s.profitMargin}%</span></div>
  <div class="row"><span class="label">Net Sales (After Returns)</span><span class="val">${fmt(s.netSales)}</span></div>
</div>

${r.bestDays.length > 0 || r.worstDays.length > 0 ? `
<div class="two-col">
  ${r.bestDays.length > 0 ? `<div>
    <div class="section">Best Selling Days</div>
    <table><thead><tr><th>#</th><th>Date</th><th class="c">Txns</th><th class="r">Sales</th></tr></thead><tbody>${bestDaysRows}</tbody></table>
  </div>` : ''}
  ${r.worstDays.length > 0 ? `<div>
    <div class="section">Lowest Selling Days</div>
    <table><thead><tr><th>#</th><th>Date</th><th class="c">Txns</th><th class="r">Sales</th></tr></thead><tbody>${worstDaysRows}</tbody></table>
  </div>` : ''}
</div>` : ''}

<div class="section">Day-by-Day Breakdown</div>
<table>
  <thead><tr><th>Date</th><th class="c">Transactions</th><th class="c">Items Sold</th><th class="r">Total Sales</th></tr></thead>
  <tbody>${dailyRows}</tbody>
  <tfoot><tr><td>TOTAL</td><td class="c">${s.totalTransactions}</td><td class="c">${s.totalItemsSold}</td><td class="r">${fmt(s.totalSales)}</td></tr></tfoot>
</table>

${r.productBreakdown.length > 0 ? `
<div class="section">Product Performance</div>
<table>
  <thead><tr><th>#</th><th>Product</th><th class="c">Qty</th><th class="r">Revenue</th><th class="r">Cost</th><th class="r">Profit</th><th class="r">Margin</th></tr></thead>
  <tbody>${productRows}</tbody>
  <tfoot><tr><td colspan="2">TOTAL</td><td class="c">${r.productBreakdown.reduce((a, p) => a + p.quantitySold, 0)}</td><td class="r">${fmt(r.productBreakdown.reduce((a, p) => a + p.revenue, 0))}</td><td class="r">${fmt(s.totalCost)}</td><td class="r">${fmt(s.totalProfit)}</td><td class="r">${s.profitMargin}%</td></tr></tfoot>
</table>` : ''}

${r.cashierBreakdown.length > 0 ? `
<div class="section">Cashier Performance</div>
<table>
  <thead><tr><th>Cashier</th><th class="c">Transactions</th><th class="r">Total Sales</th><th class="r">Avg / Txn</th></tr></thead>
  <tbody>${cashierRows}</tbody>
</table>` : ''}

<div class="footer">
  <p>Report generated on ${format(new Date(), "EEEE, MMMM d, yyyy 'at' hh:mm a")}</p>
  <p>${shopSettings.shopName} &bull; ${shopSettings.shopAddress} &bull; ${shopSettings.shopPhone}</p>
</div>

</body></html>`;
  };

  const handlePrint = () => {
    if (!report) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(buildPrintHTML());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows: string[][] = [];
    rows.push([`Monthly Report - ${report.monthName} ${report.year}`]);
    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Total Transactions', String(report.summary.totalTransactions)]);
    rows.push(['Total Sales', String(report.summary.totalSales)]);
    rows.push(['Total Cost', String(report.summary.totalCost)]);
    rows.push(['Gross Profit', String(report.summary.totalProfit)]);
    rows.push(['Profit Margin %', String(report.summary.profitMargin)]);
    rows.push(['Total Discount', String(report.summary.totalDiscount)]);
    rows.push(['Net Sales', String(report.summary.netSales)]);
    rows.push(['Total Items Sold', String(report.summary.totalItemsSold)]);
    rows.push(['Total Returns', String(report.summary.totalReturns)]);
    rows.push(['Total Refunds', String(report.summary.totalRefundAmount)]);
    rows.push(['Active Days', String(report.summary.activeDays)]);
    rows.push(['Avg Daily Sales', String(report.summary.avgDailySales)]);
    rows.push(['Avg Transaction Value', String(report.summary.avgTransactionValue)]);
    rows.push([]);
    rows.push(['DAILY BREAKDOWN']);
    rows.push(['Date', 'Transactions', 'Items Sold', 'Total']);
    report.dailyBreakdown.forEach((d) => {
      rows.push([d.date, String(d.transactions), String(d.itemsSold), String(d.total)]);
    });
    rows.push([]);
    rows.push(['PRODUCT BREAKDOWN']);
    rows.push(['Product', 'SKU', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin %']);
    report.productBreakdown.forEach((p) => {
      rows.push([p.name, p.sku, String(p.quantitySold), String(p.revenue), String(p.cost), String(p.profit), String(p.margin)]);
    });
    rows.push([]);
    rows.push(['CASHIER PERFORMANCE']);
    rows.push(['Cashier', 'Transactions', 'Total Sales']);
    report.cashierBreakdown.forEach((c) => {
      rows.push([c.cashierName, String(c.transactions), String(c.total)]);
    });

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${report.year}-${String(report.month).padStart(2, '0')}.csv`;
    a.click();
  };

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Monthly Report</h1>
          <p className="text-slate-400">Comprehensive monthly sales analysis with profit details</p>
        </div>
      </div>

      {/* Month/Year Picker */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-medium transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? 'Loading...' : 'Get Report'}
          </button>
          {report && (
            <>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                CSV
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div>
          <SkeletonCards count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" />
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
            <SkeletonLines lines={8} />
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="text-center py-20 text-slate-400">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">Select a month and year, then click "Get Report"</p>
        </div>
      )}

      {report && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                <span className="text-slate-400 text-sm">Transactions</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{report.summary.totalTransactions}</p>
              <p className="text-xs text-slate-500 mt-1">
                Active Days: {report.summary.activeDays} | Avg: {formatCurrency(report.summary.avgTransactionValue)}
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-slate-400 text-sm">Total Sales</span>
              </div>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(report.summary.totalSales)}</p>
              <p className="text-xs text-slate-500 mt-1">Avg/Day: {formatCurrency(report.summary.avgDailySales)}</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-400 text-sm">Gross Profit</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{formatCurrency(report.summary.totalProfit)}</p>
              <p className="text-xs text-slate-500 mt-1">
                Margin: <span className={report.summary.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {report.summary.profitMargin}%
                </span>
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-purple-400" />
                <span className="text-slate-400 text-sm">Items Sold</span>
              </div>
              <p className="text-3xl font-bold text-purple-400">{report.summary.totalItemsSold}</p>
              <p className="text-xs text-slate-500 mt-1">
                Returns: {report.summary.totalReturns} ({formatCurrency(report.summary.totalRefundAmount)})
              </p>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
            <h3 className="font-bold text-lg mb-4">Financial Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-slate-400">Gross Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(report.summary.totalSubtotal)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Discounts</p>
                <p className="text-xl font-bold text-red-400">-{formatCurrency(report.summary.totalDiscount)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Net Sales</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(report.summary.netSales)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Cost</p>
                <p className="text-xl font-bold text-orange-400">{formatCurrency(report.summary.totalCost)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Gross Profit</p>
                <p className={`text-xl font-bold ${report.summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(report.summary.totalProfit)}
                </p>
              </div>
            </div>
          </div>

          {/* Daily Sales Chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6 no-print">
            <h3 className="font-bold text-lg mb-4">Daily Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.dailyBreakdown.filter((d) => d.transactions > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff' }}
                  labelFormatter={(val) => `Day ${val}`}
                  formatter={(value: any) => [formatCurrency(value), 'Sales']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Best & Worst Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {report.bestDays.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Best Selling Days
                </h3>
                <div className="space-y-2">
                  {report.bestDays.map((d, idx) => (
                    <div key={d.day} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm">{format(new Date(d.date), 'EEE, MMM d')}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">{formatCurrency(d.total)}</p>
                        <p className="text-xs text-slate-400">{d.transactions} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.worstDays.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-400" />
                  Lowest Selling Days
                </h3>
                <div className="space-y-2">
                  {report.worstDays.map((d, idx) => (
                    <div key={d.day} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm">{format(new Date(d.date), 'EEE, MMM d')}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-400">{formatCurrency(d.total)}</p>
                        <p className="text-xs text-slate-400">{d.transactions} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
            <h3 className="font-bold text-lg mb-3">Daily Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-center px-4 py-2 font-semibold">Transactions</th>
                    <th className="text-center px-4 py-2 font-semibold">Items Sold</th>
                    <th className="text-right px-4 py-2 font-semibold">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dailyBreakdown.map((d) => (
                    <tr
                      key={d.day}
                      className={`border-b border-slate-700/50 ${d.transactions > 0 ? 'hover:bg-slate-700/30' : 'opacity-40'}`}
                    >
                      <td className="px-4 py-2">{format(new Date(d.date), 'EEE, MMM d')}</td>
                      <td className="text-center px-4 py-2">{d.transactions}</td>
                      <td className="text-center px-4 py-2">{d.itemsSold}</td>
                      <td className="text-right px-4 py-2 font-bold text-green-400">
                        {d.total > 0 ? formatCurrency(d.total) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600 font-bold">
                    <td className="px-4 py-2">TOTAL</td>
                    <td className="text-center px-4 py-2">{report.summary.totalTransactions}</td>
                    <td className="text-center px-4 py-2">{report.summary.totalItemsSold}</td>
                    <td className="text-right px-4 py-2 text-green-400">{formatCurrency(report.summary.totalSales)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Product Breakdown with Profit */}
          {report.productBreakdown.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
              <h3 className="font-bold text-lg mb-3">Product Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-700">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">#</th>
                      <th className="text-left px-3 py-2 font-semibold">Product</th>
                      <th className="text-left px-3 py-2 font-semibold">SKU</th>
                      <th className="text-right px-3 py-2 font-semibold">Qty</th>
                      <th className="text-right px-3 py-2 font-semibold">Revenue</th>
                      <th className="text-right px-3 py-2 font-semibold">Cost</th>
                      <th className="text-right px-3 py-2 font-semibold">Profit</th>
                      <th className="text-right px-3 py-2 font-semibold">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.productBreakdown.map((p, idx) => (
                      <tr key={p.productId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-slate-400 font-mono text-xs">{p.sku}</td>
                        <td className="text-right px-3 py-2">{p.quantitySold}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(p.revenue)}</td>
                        <td className="text-right px-3 py-2 text-orange-400">{formatCurrency(p.cost)}</td>
                        <td className={`text-right px-3 py-2 font-bold ${p.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(p.profit)}
                        </td>
                        <td className={`text-right px-3 py-2 ${p.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {p.margin}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 font-bold">
                      <td colSpan={3} className="px-3 py-2">TOTAL</td>
                      <td className="text-right px-3 py-2">
                        {report.productBreakdown.reduce((s, p) => s + p.quantitySold, 0)}
                      </td>
                      <td className="text-right px-3 py-2">
                        {formatCurrency(report.productBreakdown.reduce((s, p) => s + p.revenue, 0))}
                      </td>
                      <td className="text-right px-3 py-2 text-orange-400">
                        {formatCurrency(report.summary.totalCost)}
                      </td>
                      <td className="text-right px-3 py-2 text-green-400">
                        {formatCurrency(report.summary.totalProfit)}
                      </td>
                      <td className="text-right px-3 py-2 text-green-400">
                        {report.summary.profitMargin}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Cashier Performance */}
          {report.cashierBreakdown.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
              <h3 className="font-bold text-lg mb-3">Cashier Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-700">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Cashier</th>
                      <th className="text-right px-4 py-2 font-semibold">Transactions</th>
                      <th className="text-right px-4 py-2 font-semibold">Total Sales</th>
                      <th className="text-right px-4 py-2 font-semibold">Avg per Txn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.cashierBreakdown.map((c) => (
                      <tr key={c.cashierId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-2 font-medium">{c.cashierName}</td>
                        <td className="text-right px-4 py-2">{c.transactions}</td>
                        <td className="text-right px-4 py-2 font-bold text-green-400">{formatCurrency(c.total)}</td>
                        <td className="text-right px-4 py-2 text-blue-400">
                          {c.transactions > 0 ? formatCurrency(c.total / c.transactions) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.summary.totalTransactions === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-xl">No sales recorded in {report.monthName} {report.year}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
