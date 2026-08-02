import { useStore } from '../contexts/StoreContext';

interface ReceiptPrinterProps {
  sale: any;
}

export default function ReceiptPrinter({ sale }: ReceiptPrinterProps) {
  const { shopSettings } = useStore();

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <style>{`
        @media print {
          * {
            margin: 0;
            padding: 0;
          }
          body {
            background: white;
            color: black;
          }
          .no-print {
            display: none !important;
          }
          .receipt-container {
            width: 80mm;
            margin: 0 auto;
            padding: 10mm;
            font-family: monospace;
          }
        }
      `}</style>

      <div className="receipt-container p-4 max-w-md mx-auto bg-white text-black border border-gray-300 rounded-lg text-sm font-mono">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-3 mb-3">
          <h1 className="text-lg font-bold">{shopSettings.shopName}</h1>
          <p className="text-xs">{shopSettings.shopAddress}</p>
          <p className="text-xs">{shopSettings.shopPhone}</p>
        </div>

        {/* Receipt Info */}
        <div className="text-center text-xs mb-3 border-b border-gray-300 pb-2">
          <p>Receipt #{sale.id.slice(-6)}</p>
          <p>{formatDate(sale.date)}</p>
        </div>

        {/* Items */}
        <div className="mb-3 border-b border-gray-300 pb-3">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
          </div>
          {sale.items.map((item: any, idx: number) => (
            <div key={idx} className="text-xs mb-1">
              <div className="flex justify-between">
                <span className="flex-1">{item.name}</span>
                <span className="w-8 text-right">{item.quantity}</span>
                <span className="w-16 text-right">{shopSettings.currency} {item.price.toFixed(2)}</span>
                <span className="w-16 text-right">{shopSettings.currency} {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="text-xs mb-2 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{shopSettings.currency} {sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount ({sale.discountType === 'percentage' ? sale.discountValue + '%' : 'Fixed'}):</span>
              <span>-{shopSettings.currency} {sale.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t-2 border-gray-800 pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{shopSettings.currency} {sale.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="text-xs border-t border-gray-300 pt-2 mb-3">
          <div className="flex justify-between">
            <span>Cash Received:</span>
            <span>{shopSettings.currency} {sale.cashReceived.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Change:</span>
            <span>{shopSettings.currency} {sale.change.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs border-t-2 border-gray-800 pt-2">
          <p>Thank you for your purchase!</p>
          <p className="text-xs mt-1">Visit again soon</p>
        </div>
      </div>

      <div className="no-print mt-4 text-center">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🖨️ Print Receipt
        </button>
      </div>
    </>
  );
}
