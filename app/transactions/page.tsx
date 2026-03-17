'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const buildStyles = () => `
    <style>
      * { box-sizing: border-box; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial; color: #111827; padding: 24px; }
      h1 { font-size: 20px; font-weight: 700; margin: 0 0 16px; }
      .brand { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
      .badge { display:inline-block; background:#0ea5e9; color:#fff; padding:6px 10px; border-radius:8px; font-size:12px; font-weight:600; letter-spacing:.02em; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 12px; }
      th { text-transform: uppercase; letter-spacing: .05em; color: #6b7280; text-align: left; }
      .muted { color: #6b7280; }
      .right { text-align: right; }
      .caption { font-size: 11px; color: #6b7280; margin-top: 8px; }
      @media print {
        @page { margin: 16mm; }
        button { display: none; }
      }
    </style>
  `;

  const printAllPdf = () => {
    if (!transactions || transactions.length === 0) return;
    const rowsHtml = transactions.map((t: any) => {
      const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items || [];
      const itemsHtml = items.map((it: any) => `${it.name} × ${it.quantity}`).join('<br/>');
      return `
        <tr>
          <td>${new Date(t.timestamp).toLocaleString()}</td>
          <td>${t.restaurantName || ''}</td>
          <td class="muted">${itemsHtml}</td>
          <td class="right">₦${Number(t.totalAmount).toFixed(2)}</td>
        </tr>
      `;
    }).join('');
    const html = `
      <html>
        <head>
          <title>Transactions</title>
          ${buildStyles()}
        </head>
        <body>
          <div class="brand"><span class="badge">Baze Smart Voucher</span></div>
          <h1>Transaction History</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Restaurant</th>
                <th>Items</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="caption">Generated on ${new Date().toLocaleString()}</div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 100); };</script>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const printSinglePdf = (t: any) => {
    const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items || [];
    const itemsRows = items.map((it: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.name}</td>
        <td class="right">${Number(it.quantity)}</td>
        <td class="right">₦${Number(it.price).toFixed(2)}</td>
      </tr>
    `).join('');
    const html = `
      <html>
        <head>
          <title>Transaction #${t.id}</title>
          ${buildStyles()}
        </head>
        <body>
          <div class="brand"><span class="badge">Baze Smart Voucher</span></div>
          <h1>Receipt - Transaction #${t.id}</h1>
          <div class="muted">Date: ${new Date(t.timestamp).toLocaleString()}</div>
          <div class="muted">Restaurant: ${t.restaurantName || ''}</div>
          <div class="muted" style="margin-bottom:12px;">User: ${t.userName || ''}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="right" style="font-weight:700;">Total</td>
                <td class="right" style="font-weight:700;">₦${Number(t.totalAmount).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <div class="caption">Generated on ${new Date().toLocaleString()}</div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 100); };</script>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'user') {
          router.push('/');
          return;
        }
      })
      .catch(() => router.push('/'));

    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        setTransactions(data.transactions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
            {transactions.length > 0 && (
              <button
                onClick={printAllPdf}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Download All (PDF)
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No transactions found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restaurant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => {
                    const items = typeof transaction.items === 'string' 
                      ? JSON.parse(transaction.items) 
                      : transaction.items;
                    return (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.restaurantName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {items.map((item: any, idx: number) => (
                            <div key={idx}>
                              {item.name} × {item.quantity}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          ₦{parseFloat(transaction.totalAmount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => printSinglePdf(transaction)}
                            className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

