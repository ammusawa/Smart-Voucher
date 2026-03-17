'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function AdminTopUpPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/'));

    // Fetch users (in a real app, you'd have a users API endpoint)
    // For now, we'll just use the form
  }, [router]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const topUpAmount = parseFloat(formData.amount);
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: topUpAmount,
          userId: formData.userId ? parseInt(formData.userId) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Top-up failed');
        setLoading(false);
        return;
      }

      setSuccess(`Successfully topped up ₦${topUpAmount.toFixed(2)}. New balance: ₦${data.newBalance.toFixed(2)}`);
      setFormData({ userId: '', amount: '' });
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Top Up User Balance</h1>

          <div className="bg-white rounded-lg shadow p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                  User ID (leave empty to top up yourself)
                </label>
                <input
                  id="userId"
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Optional: Enter user ID"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦)
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Top Up Balance'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

