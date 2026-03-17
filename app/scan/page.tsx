'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import QRScanner from '@/components/QRScanner';

export default function ScanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState('');

  const handleScan = async (data: string) => {
    setLoading(true);
    setError('');
    setQrData(data);

    try {
      const res = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: data }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Failed to process QR code');
        setLoading(false);
        return;
      }

      if (result.type === 'restaurant') {
        // Redirect to restaurant menu view page with menu details
        router.push(`/restaurant/${result.restaurant.id}/menu-view`);
      } else if (result.type === 'order') {
        // Redirect to payment confirmation for order
        router.push(`/payment/order/${result.order.id}`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Scan QR Code</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              Processing QR code...
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <QRScanner onScan={handleScan} onError={(err) => setError(err.message)} />
          </div>

          {qrData && (
            <div className="mt-4 bg-gray-100 p-4 rounded">
              <p className="text-sm text-gray-600">Scanned Data:</p>
              <p className="text-xs font-mono break-all">{qrData}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

