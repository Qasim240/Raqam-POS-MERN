import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { reportApi, DailyReportData } from '../services/api';
import { SkeletonCards, SkeletonLines } from './ui/Skeleton';
import { format } from 'date-fns';
import { Calendar, Printer, Download, Clock, ShoppingCart, TrendingUp, Users, Search, Loader2 } from 'lucide-react';

export default function DayEndReport() {
  const { shopSettings } = useStore();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmt = (value: number) => {
    return `${shopSettings.currency} ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrency = fmt;

  const fetchReport = async (date: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await reportApi.getDaily(date);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (selectedDate) {
      fetchReport(selectedDate);
    }
  };

  const buildPrintHTML = () => {
    if (!report) return '';
    const r = report;
    const s = r.summary;
    const dateLabel = format(new Date(r.date), 'EEEE, MMMM d, yyyy');
    const cashInDrawer = s.totalCashReceived - s.totalChange - s.totalRefundAmount;

    let productRows = '';
    r.productBreakdown.forEach((p, i) => {
      productRows += `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.quantitySold}</td><td class="r">${fmt(p.revenue)}</td></tr>`;
    });
    const productTotal = r.productBreakdown.reduce((a, p) => a + p.revenue, 0);
    const qtyTotal = r.productBreakdown.reduce((a, p) => a + p.quantitySold, 0);

    let hourRows = '';
    r.hourlyBreakdown.forEach((h) => {
      const label = `${String(h.hour).padStart(2, '0')}:00 - ${String(h.hour).padStart(2, '0')}:59`;
      hourRows += `<tr><td>${label}</td><td class="c">${h.transactions}</td><td class="r">${fmt(h.total)}</td></tr>`;
    });

    let cashierRows = '';
    r.cashierBreakdown.forEach((c) => {
      cashierRows += `<tr><td>${c.cashierName}</td><td class="c">${c.transactions}</td><td class="r">${fmt(c.total)}</td></tr>`;
    });

    let txnRows = '';
    r.sales.forEach((sale, i) => {
      const time = format(new Date(sale.date), 'hh:mm a');
      const items = sale.items.reduce((a, it) => a + it.quantity, 0);
      const disc = sale.discountAmount > 0 ? `-${fmt(sale.discountAmount)}` : '-';
      txnRows += `<tr><td>${i + 1}</td><td>${time}</td><td class="c">${items}</td><td class="r">${fmt(sale.subtotal)}</td><td class="r">${disc}</td><td class="r b">${fmt(sale.total)}</td></tr>`;
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Day End Report - ${r.date}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;padding:30px 40px;font-size:13px;line-height:1.5}
.header{text-align:center;padding-bottom:12px;border-bottom:3px double #333;margin-bottom:18px}
.header h1{font-size:24px;font-weight:700;letter-spacing:0.5px}
.header .addr{font-size:11px;color:#555;margin-top:2px}
.header .phone{font-size:11px;color:#555}
.title{text-align:center;font-size:18px;font-weight:700;margin:14px 0 2px;text-transform:uppercase;letter-spacing:1px}
.date{text-align:center;font-size:13px;color:#444;margin-bottom:18px}
.divider{border:none;border-top:1px solid #ccc;margin:16px 0}
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
.footer{text-align:center;margin-top:24px;padding-top:12px;border-top:3px double #333;font-size:10px;color:#888}
@media print{body{padding:15px 20px}@page{margin:10mm}}
</style></head><body>

<div class="header">
  <h1>${shopSettings.shopName}</h1>
  <div class="addr">${shopSettings.shopAddress}</div>
  <div class="phone">Tel: ${shopSettings.shopPhone}</div>
</div>

<div class="title">Day End Report</div>
<div class="date">${dateLabel}</div>

<div class="section">Sales Summary</div>
<div class="box">
  <div class="row"><span class="label">Total Transactions</span><span class="val">${s.totalTransactions}</span></div>
  <div class="row"><span class="label">Total Items Sold</span><span class="val">${s.totalItemsSold}</span></div>
  <div class="row"><span class="label">Gross Sales (Before Discount)</span><span class="val">${fmt(s.totalSubtotal)}</span></div>
  <div class="row"><span class="label">Total Discount</span><span class="val">- ${fmt(s.totalDiscount)}</span></div>
  <div class="row big"><span class="label">Total Sales (After Discount)</span><span class="val">${fmt(s.totalSales)}</span></div>
  <div class="row"><span class="label">Average Transaction Value</span><span class="val">${fmt(s.avgTransactionValue)}</span></div>
  ${s.totalReturns > 0 ? `<div class="row"><span class="label">Returns / Refunds</span><span class="val">${s.totalReturns} (${fmt(s.totalRefundAmount)})</span></div>` : ''}
  <div class="row highlight"><span class="label">NET SALES</span><span class="val">${fmt(s.netSales)}</span></div>
</div>

<div class="section">Cash Summary</div>
<div class="box">
  <div class="row"><span class="label">Total Cash Received</span><span class="val">${fmt(s.totalCashReceived)}</span></div>
  <div class="row"><span class="label">Total Change Given</span><span class="val">- ${fmt(s.totalChange)}</span></div>
  ${s.totalRefundAmount > 0 ? `<div class="row"><span class="label">Total Refunds</span><span class="val">- ${fmt(s.totalRefundAmount)}</span></div>` : ''}
  <div class="row highlight"><span class="label">CASH IN DRAWER</span><span class="val">${fmt(cashInDrawer)}</span></div>
</div>

${r.hourlyBreakdown.length > 0 ? `
<div class="section">Sales by Hour</div>
<table>
  <thead><tr><th>Time Slot</th><th class="c">Transactions</th><th class="r">Amount</th></tr></thead>
  <tbody>${hourRows}</tbody>
</table>` : ''}

${r.productBreakdown.length > 0 ? `
<div class="section">Products Sold</div>
<table>
  <thead><tr><th>#</th><th>Product Name</th><th>Qty</th><th class="r">Amount</th></tr></thead>
  <tbody>${productRows}</tbody>
  <tfoot><tr><td colspan="2">Total</td><td>${qtyTotal}</td><td class="r">${fmt(productTotal)}</td></tr></tfoot>
</table>` : ''}

${r.cashierBreakdown.length > 0 ? `
<div class="section">Cashier Summary</div>
<table>
  <thead><tr><th>Cashier Name</th><th class="c">Transactions</th><th class="r">Total Sales</th></tr></thead>
  <tbody>${cashierRows}</tbody>
</table>` : ''}

${r.sales.length > 0 ? `
<div class="section">All Transactions</div>
<table>
  <thead><tr><th>#</th><th>Time</th><th class="c">Items</th><th class="r">Subtotal</th><th class="r">Discount</th><th class="r">Total</th></tr></thead>
  <tbody>${txnRows}</tbody>
  <tfoot><tr><td colspan="3">TOTALS</td><td class="r">${fmt(s.totalSubtotal)}</td><td class="r">-${fmt(s.totalDiscount)}</td><td class="r">${fmt(s.totalSales)}</td></tr></tfoot>
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
    rows.push(['Day End Report - ' + report.date]);
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Transactions', String(report.summary.totalTransactions)]);
    rows.push(['Total Sales', String(report.summary.totalSales)]);
    rows.push(['Total Discount', String(report.summary.totalDiscount)]);
    rows.push(['Net Sales', String(report.summary.netSales)]);
    rows.push(['Total Items Sold', String(report.summary.totalItemsSold)]);
    rows.push(['Total Cash Received', String(report.summary.totalCashReceived)]);
    rows.push(['Total Change Given', String(report.summary.totalChange)]);
    rows.push(['Total Returns', String(report.summary.totalReturns)]);
    rows.push(['Total Refunds', String(report.summary.totalRefundAmount)]);
    rows.push([]);
    rows.push(['Product Breakdown']);
    rows.push(['Product', 'SKU', 'Qty Sold', 'Revenue']);
    report.productBreakdown.forEach((p) => {
      rows.push([p.name, p.sku, String(p.quantitySold), String(p.revenue)]);
    });
    rows.push([]);
    rows.push(['Transaction Details']);
    rows.push(['Time', 'Items', 'Subtotal', 'Discount', 'Total', 'Cash', 'Change', 'Cashier']);
    report.sales.forEach((s) => {
      rows.push([
        format(new Date(s.date), 'HH:mm:ss'),
        String(s.items.length),
        String(s.subtotal),
        String(s.discountAmount),
        String(s.total),
        String(s.cashReceived),
        String(s.change),
        s.cashierName,
      ]);
    });

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-end-report-${report.date}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 lg:p-8 p-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Day End Report</h1>
          <p className="text-slate-400">View and print detailed daily sales report</p>
        </div>
      </div>

      {/* Date Picker & Search */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
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
          <p className="text-xl">Select a date and click "Get Report" to view the day end report</p>
        </div>
      )}

      {report && (
        <>
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                  <span className="text-slate-400 text-sm">Transactions</span>
                </div>
                <p className="text-3xl font-bold text-blue-400">{report.summary.totalTransactions}</p>
                <p className="text-xs text-slate-500 mt-1">Avg: {formatCurrency(report.summary.avgTransactionValue)}</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-slate-400 text-sm">Total Sales</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(report.summary.totalSales)}</p>
                <p className="text-xs text-slate-500 mt-1">Subtotal: {formatCurrency(report.summary.totalSubtotal)}</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-red-400" />
                  <span className="text-slate-400 text-sm">Discount Given</span>
                </div>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(report.summary.totalDiscount)}</p>
                <p className="text-xs text-slate-500 mt-1">Returns: {formatCurrency(report.summary.totalRefundAmount)}</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="text-slate-400 text-sm">Net Sales</span>
                </div>
                <p className="text-3xl font-bold text-purple-400">{formatCurrency(report.summary.netSales)}</p>
                <p className="text-xs text-slate-500 mt-1">Items Sold: {report.summary.totalItemsSold}</p>
              </div>
            </div>

            {/* Cash Summary */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
              <h3 className="font-bold text-lg mb-3">Cash Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Cash Received</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(report.summary.totalCashReceived)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Change Given</p>
                  <p className="text-xl font-bold text-orange-400">{formatCurrency(report.summary.totalChange)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Refunds</p>
                  <p className="text-xl font-bold text-red-400">{formatCurrency(report.summary.totalRefundAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Cash in Drawer</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatCurrency(report.summary.totalCashReceived - report.summary.totalChange - report.summary.totalRefundAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Hourly Breakdown */}
            {report.hourlyBreakdown.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Hourly Breakdown
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {report.hourlyBreakdown.map((h) => (
                    <div key={h.hour} className="bg-slate-700/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-slate-400">{String(h.hour).padStart(2, '0')}:00</p>
                      <p className="text-sm font-bold text-blue-400">{h.transactions}</p>
                      <p className="text-xs text-green-400">{formatCurrency(h.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Breakdown */}
            {report.productBreakdown.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
                <h3 className="font-bold text-lg mb-3">Product Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-700">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">#</th>
                        <th className="text-left px-4 py-2 font-semibold">Product</th>
                        <th className="text-left px-4 py-2 font-semibold">SKU</th>
                        <th className="text-right px-4 py-2 font-semibold">Qty Sold</th>
                        <th className="text-right px-4 py-2 font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.productBreakdown.map((p, idx) => (
                        <tr key={p.productId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium">{p.name}</td>
                          <td className="px-4 py-2 text-slate-400 font-mono text-xs">{p.sku}</td>
                          <td className="text-right px-4 py-2">{p.quantitySold}</td>
                          <td className="text-right px-4 py-2 font-bold text-green-400">{formatCurrency(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-600 font-bold">
                        <td colSpan={3} className="px-4 py-2">Total</td>
                        <td className="text-right px-4 py-2">
                          {report.productBreakdown.reduce((sum, p) => sum + p.quantitySold, 0)}
                        </td>
                        <td className="text-right px-4 py-2 text-green-400">
                          {formatCurrency(report.productBreakdown.reduce((sum, p) => sum + p.revenue, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Cashier Breakdown */}
            {report.cashierBreakdown.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Cashier Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-700">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Cashier</th>
                        <th className="text-right px-4 py-2 font-semibold">Transactions</th>
                        <th className="text-right px-4 py-2 font-semibold">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.cashierBreakdown.map((c) => (
                        <tr key={c.cashierId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-4 py-2 font-medium">{c.cashierName}</td>
                          <td className="text-right px-4 py-2">{c.transactions}</td>
                          <td className="text-right px-4 py-2 font-bold text-green-400">{formatCurrency(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Transactions */}
            {report.sales.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
                <h3 className="font-bold text-lg mb-3">All Transactions ({report.sales.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-700">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Time</th>
                        <th className="text-left px-3 py-2 font-semibold">Cashier</th>
                        <th className="text-center px-3 py-2 font-semibold">Items</th>
                        <th className="text-right px-3 py-2 font-semibold">Subtotal</th>
                        <th className="text-right px-3 py-2 font-semibold">Discount</th>
                        <th className="text-right px-3 py-2 font-semibold">Total</th>
                        <th className="text-right px-3 py-2 font-semibold">Cash</th>
                        <th className="text-right px-3 py-2 font-semibold">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sales.map((sale) => (
                        <tr key={sale.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-3 py-2 font-mono text-xs">{format(new Date(sale.date), 'HH:mm:ss')}</td>
                          <td className="px-3 py-2 text-xs">{sale.cashierName}</td>
                          <td className="text-center px-3 py-2">
                            {sale.items.reduce((sum, i) => sum + i.quantity, 0)}
                          </td>
                          <td className="text-right px-3 py-2">{formatCurrency(sale.subtotal)}</td>
                          <td className="text-right px-3 py-2 text-red-400">
                            {sale.discountAmount > 0 ? `-${formatCurrency(sale.discountAmount)}` : '-'}
                          </td>
                          <td className="text-right px-3 py-2 font-bold text-green-400">{formatCurrency(sale.total)}</td>
                          <td className="text-right px-3 py-2">{formatCurrency(sale.cashReceived)}</td>
                          <td className="text-right px-3 py-2 text-orange-400">{formatCurrency(sale.change)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-600 font-bold">
                        <td colSpan={3} className="px-3 py-2">TOTALS</td>
                        <td className="text-right px-3 py-2">{formatCurrency(report.summary.totalSubtotal)}</td>
                        <td className="text-right px-3 py-2 text-red-400">-{formatCurrency(report.summary.totalDiscount)}</td>
                        <td className="text-right px-3 py-2 text-green-400">{formatCurrency(report.summary.totalSales)}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(report.summary.totalCashReceived)}</td>
                        <td className="text-right px-3 py-2 text-orange-400">{formatCurrency(report.summary.totalChange)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {report.summary.totalTransactions === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-xl">No sales recorded on {format(new Date(report.date), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
