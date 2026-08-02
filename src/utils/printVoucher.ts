// Dependency-free voucher printer. Opens a new window, writes a clean
// HTML voucher, and triggers the browser print dialog.
// One renderer for journal entries, payment vouchers, and purchase vouchers
// — pass the right shape and the layout adapts.

export interface PrintLine {
  label: string;       // e.g. "1010 — Cash in Hand", or "Sugar 1kg"
  memo?: string;
  debit?: number;      // for accounting tables
  credit?: number;     // for accounting tables
  qty?: number;        // for item tables (purchases)
  unitCost?: number;   // for item tables
  amount?: number;     // for item tables (line total) or generic single-amount tables
}

export interface PrintVoucher {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  currency: string;
  title: string;        // "Journal Voucher", "Receipt Voucher", etc.
  voucherNumber: string;
  date: string;         // pre-formatted display string
  partyName?: string;
  partyPhone?: string;
  narration?: string;
  lines: PrintLine[];
  summary?: { label: string; value: string }[];
  footer?: string;
}

const fmt = (currency: string, n: number | undefined) => {
  if (n === undefined || n === null || (typeof n === 'number' && isNaN(n))) return '';
  return `${currency} ${Number(n).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const escape = (s: string): string =>
  String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string),
  );

export function printVoucher(v: PrintVoucher): void {
  const hasDebit = v.lines.some((l) => l.debit !== undefined && l.debit !== 0);
  const hasCredit = v.lines.some((l) => l.credit !== undefined && l.credit !== 0);
  const isAccounting = hasDebit || hasCredit;
  const isItems = v.lines.some((l) => l.qty !== undefined);

  let linesHtml = '';
  if (isAccounting) {
    const totalDebit = v.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = v.lines.reduce((s, l) => s + (l.credit || 0), 0);
    linesHtml = `
      <table>
        <thead><tr>
          <th>Account</th><th>Memo</th>
          <th class=r>Debit</th><th class=r>Credit</th>
        </tr></thead>
        <tbody>
          ${v.lines
            .map(
              (l) => `<tr>
              <td>${escape(l.label)}</td>
              <td>${escape(l.memo || '')}</td>
              <td class=r>${fmt(v.currency, l.debit)}</td>
              <td class=r>${fmt(v.currency, l.credit)}</td>
            </tr>`,
            )
            .join('')}
          <tr class=total>
            <td colspan=2 class=r><strong>Total</strong></td>
            <td class=r><strong>${fmt(v.currency, totalDebit)}</strong></td>
            <td class=r><strong>${fmt(v.currency, totalCredit)}</strong></td>
          </tr>
        </tbody>
      </table>`;
  } else if (isItems) {
    const totalAmount = v.lines.reduce((s, l) => s + (l.amount || 0), 0);
    linesHtml = `
      <table>
        <thead><tr>
          <th>Item</th>
          <th class=r>Qty</th>
          <th class=r>Unit Cost</th>
          <th class=r>Line Total</th>
        </tr></thead>
        <tbody>
          ${v.lines
            .map(
              (l) => `<tr>
              <td>${escape(l.label)}</td>
              <td class=r>${l.qty ?? ''}</td>
              <td class=r>${fmt(v.currency, l.unitCost)}</td>
              <td class=r>${fmt(v.currency, l.amount)}</td>
            </tr>`,
            )
            .join('')}
          <tr class=total>
            <td colspan=3 class=r><strong>Subtotal</strong></td>
            <td class=r><strong>${fmt(v.currency, totalAmount)}</strong></td>
          </tr>
        </tbody>
      </table>`;
  } else {
    linesHtml = `
      <table>
        <thead><tr>
          <th>Description</th><th class=r>Amount</th>
        </tr></thead>
        <tbody>
          ${v.lines
            .map(
              (l) =>
                `<tr><td>${escape(l.label)}</td><td class=r>${fmt(v.currency, l.amount)}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>`;
  }

  const summaryHtml = v.summary?.length
    ? `<table class=summary>
        ${v.summary
          .map(
            (s) =>
              `<tr><td>${escape(s.label)}</td><td class=r>${escape(s.value)}</td></tr>`,
          )
          .join('')}
       </table>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset=utf-8>
<title>${escape(v.voucherNumber)} — ${escape(v.title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; padding: 24px; color: #111; max-width: 720px; margin: 0 auto; }
  h1 { margin: 0 0 4px 0; font-size: 22px; }
  h2 { margin: 0; font-size: 13px; color: #555; font-weight: 400; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
  .title { margin-top: 8px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 16px; font-size: 13px; }
  .meta strong { color: #555; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; font-weight: 600; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; }
  .r { text-align: right; }
  tr.total td { border-top: 2px solid #000; border-bottom: none; padding-top: 8px; }
  .summary { width: auto; margin-left: auto; margin-top: 12px; min-width: 240px; }
  .summary td { border: none; padding: 3px 8px; font-size: 13px; }
  .narration { margin-top: 14px; font-size: 12px; color: #555; font-style: italic; padding: 8px; background: #fafafa; border-left: 3px solid #ddd; }
  .footer { margin-top: 32px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { padding: 0; } button { display: none; } }
</style>
</head>
<body>
<div class=header>
  <h1>${escape(v.shopName)}</h1>
  ${v.shopAddress ? `<h2>${escape(v.shopAddress)}</h2>` : ''}
  ${v.shopPhone ? `<h2>${escape(v.shopPhone)}</h2>` : ''}
  <div class=title>${escape(v.title)}</div>
</div>
<div class=meta>
  <div><strong>Voucher #:</strong> ${escape(v.voucherNumber || '—')}</div>
  <div class=r><strong>Date:</strong> ${escape(v.date)}</div>
  ${v.partyName ? `<div><strong>Party:</strong> ${escape(v.partyName)}</div>` : ''}
  ${v.partyPhone ? `<div class=r><strong>Phone:</strong> ${escape(v.partyPhone)}</div>` : ''}
</div>
${linesHtml}
${summaryHtml}
${v.narration ? `<p class=narration><strong>Narration:</strong> ${escape(v.narration)}</p>` : ''}
${v.footer ? `<p class=footer>${escape(v.footer)}</p>` : ''}
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 400);
  };
</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
