'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { modal, showSuccess, showError, hideModal } = useModal();

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

    fetch('/api/restaurants')
      .then(res => res.json())
      .then(data => {
        setRestaurants(data.restaurants || []);
      })
      .catch(() => {});

    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        setTransactions(data.transactions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleApprove = async (restaurantId: number, approve: boolean) => {
    try {
      const res = await fetch('/api/admin/approve-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, approve }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to update approval');
        return;
      }

      const message = approve 
        ? 'Restaurant approved successfully' 
        : 'Restaurant approval revoked successfully';
      showSuccess(message, 'Restaurant Updated', 2000);
      
      // Refresh restaurants
      fetch('/api/restaurants')
        .then(res => res.json())
        .then(data => {
          setRestaurants(data.restaurants || []);
        });
    } catch (err) {
      showError('An error occurred. Please try again.');
    }
  };

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

  const pendingRestaurants = restaurants.filter(r => !r.isApproved);
  const approvedRestaurants = restaurants.filter(r => r.isApproved);

  return (
    <>
      <Navbar />
      <Modal
        isOpen={modal.isOpen}
        onClose={hideModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        autoClose={modal.autoClose}
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Restaurants</h2>
              <p className="text-3xl font-bold text-gray-900">{restaurants.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Pending Approvals</h2>
              <p className="text-3xl font-bold text-yellow-600">{pendingRestaurants.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Transactions</h2>
              <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Pending Restaurant Approvals</h2>
              </div>
              <div className="p-6">
                {pendingRestaurants.length === 0 ? (
                  <p className="text-gray-500">No pending approvals</p>
                ) : (
                  <div className="space-y-4">
                    {pendingRestaurants.map((restaurant) => (
                      <div key={restaurant.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                        <p className="text-sm text-gray-600">{restaurant.location}</p>
                        <p className="text-xs text-gray-500 mt-1">Owner: {restaurant.ownerName}</p>
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => handleApprove(restaurant.id, true)}
                            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprove(restaurant.id, false)}
                            className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Approved Restaurants</h2>
              </div>
              <div className="p-6">
                {approvedRestaurants.length === 0 ? (
                  <p className="text-gray-500">No approved restaurants</p>
                ) : (
                  <div className="space-y-4">
                    {approvedRestaurants.map((restaurant) => (
                      <div key={restaurant.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                        <p className="text-sm text-gray-600">{restaurant.location}</p>
                        <p className="text-xs text-gray-500 mt-1">Owner: {restaurant.ownerName}</p>
                        <div className="mt-3">
                          <button
                            onClick={() => handleApprove(restaurant.id, false)}
                            className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
                          >
                            Revoke Approval
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Recent Transactions</h2>
            </div>
            <div className="p-6">
              {transactions.length === 0 ? (
                <p className="text-gray-500">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.slice(0, 10).map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.userName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.restaurantName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            ₦{parseFloat(transaction.totalAmount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

