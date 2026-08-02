// Tiny dependency-free CSV download helper.
// Quotes any cell containing comma / newline / quote, doubles inner quotes.

type Cell = string | number | null | undefined;

export function downloadCSV(filename: string, rows: Cell[][]): void {
  const escape = (cell: Cell): string => {
    const s = cell === null || cell === undefined ? '' : String(cell);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
  // BOM so Excel opens it with the right encoding
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
