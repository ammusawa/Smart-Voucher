'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { modal, showSuccess, showError, hideModal } = useModal();

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

    fetchSubscriptions();
  }, [router]);

  const fetchSubscriptions = () => {
    fetch('/api/subscriptions/my-subscriptions')
      .then(res => res.json())
      .then(data => {
        setSubscriptions(data.subscriptions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleRevoke = async (subscriptionId: number, restaurantName: string) => {
    if (!confirm(`Are you sure you want to revoke your subscription to ${restaurantName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/revoke`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to revoke subscription');
        return;
      }

      showSuccess(data.message || 'Subscription revoked successfully', 'Subscription Revoked', 2000);
      fetchSubscriptions();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Subscriptions</h1>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-4">You don't have any subscriptions yet.</p>
                <Link
                  href="/dashboard"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Browse restaurants to subscribe →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{sub.restaurantName}</h3>
                        <p className="text-sm text-gray-600">{sub.restaurantLocation}</p>
                        <p className="text-sm font-medium text-gray-700 mt-2">{sub.planName}</p>
                        {sub.planDescription && (
                          <p className="text-sm text-gray-600 mt-1">{sub.planDescription}</p>
                        )}
                        <div className="mt-3 flex space-x-4 text-sm">
                          <span className="text-primary-600 font-semibold">₦{parseFloat(sub.amount).toFixed(2)}</span>
                          <span className={`font-medium ${
                            sub.status === 'Active' ? 'text-green-600' :
                            sub.status === 'Pending' ? 'text-yellow-600' :
                            sub.status === 'Cancelled' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {sub.status}
                          </span>
                          {sub.startDate && sub.endDate && (
                            <span className="text-gray-600">
                              {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {sub.paymentStatus === 'Pending' && (
                          <p className="text-xs text-yellow-600 mt-2">
                            Payment verification pending
                          </p>
                        )}
                        {sub.status === 'Active' && sub.endDate && new Date(sub.endDate) < new Date() && (
                          <p className="text-xs text-gray-500 mt-2">
                            Subscription expired
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {sub.status === 'Active' && (
                          <>
                            <Link
                              href={`/subscriptions/${sub.id}/review`}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium text-center"
                            >
                              Review
                            </Link>
                            <button
                              onClick={() => handleRevoke(sub.id, sub.restaurantName)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        {sub.status === 'Pending' && (
                          <Link
                            href={`/subscriptions/${sub.id}/review`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium text-center"
                          >
                            View Details
                          </Link>
                        )}
                        {sub.status === 'Cancelled' && (
                          <Link
                            href={`/subscriptions/${sub.id}/review`}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium text-center"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

