'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function ReviewSubscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const subscriptionId = params.id as string;
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

    fetch(`/api/subscriptions/${subscriptionId}/review`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.push('/subscriptions');
          return;
        }
        setSubscription(data.subscription);
        setLoading(false);
      })
      .catch(() => {
        router.push('/subscriptions');
      });
  }, [subscriptionId, router]);

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

  if (!subscription) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl text-red-600">Subscription not found</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/subscriptions"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Subscriptions
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription Details</h1>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Restaurant Information */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Restaurant Information</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Restaurant Name:</span>
                  <p className="text-lg font-semibold text-gray-900">{subscription.restaurantName}</p>
                </div>
                {subscription.restaurantLocation && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Location:</span>
                    <p className="text-gray-700">{subscription.restaurantLocation}</p>
                  </div>
                )}
                {subscription.restaurantDescription && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Description:</span>
                    <p className="text-gray-700">{subscription.restaurantDescription}</p>
                  </div>
                )}
                {subscription.restaurantPhone && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Phone:</span>
                    <p className="text-gray-700">{subscription.restaurantPhone}</p>
                  </div>
                )}
                {subscription.restaurantEmail && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <p className="text-gray-700">{subscription.restaurantEmail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Plan Details */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Plan</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Plan Name:</span>
                  <p className="text-lg font-semibold text-gray-900">{subscription.planName}</p>
                </div>
                {subscription.planDescription && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Description:</span>
                    <p className="text-gray-700">{subscription.planDescription}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Plan Price:</span>
                    <p className="text-lg font-semibold text-primary-600">₦{parseFloat(subscription.planPrice).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Duration:</span>
                    <p className="text-gray-700">{subscription.durationDays} days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscription.status === 'Active' ? 'bg-green-100 text-green-800' :
                    subscription.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    subscription.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Payment Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscription.paymentStatus === 'Verified' ? 'bg-green-100 text-green-800' :
                    subscription.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {subscription.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Amount Paid:</span>
                  <span className="text-lg font-semibold text-primary-600">₦{parseFloat(subscription.amount).toFixed(2)}</span>
                </div>
                {subscription.startDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Start Date:</span>
                    <span className="text-gray-700">{new Date(subscription.startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {subscription.endDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">End Date:</span>
                    <span className="text-gray-700">{new Date(subscription.endDate).toLocaleDateString()}</span>
                  </div>
                )}
                {subscription.startDate && subscription.endDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Days Remaining:</span>
                    <span className="text-gray-700">
                      {Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            {subscription.bankName && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Restaurant Bank Details</h2>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Bank Name:</span>
                    <p className="text-gray-700">{subscription.bankName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Account Number:</span>
                    <p className="text-gray-700 font-mono">{subscription.accountNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Account Name:</span>
                    <p className="text-gray-700">{subscription.accountName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Proof */}
            {subscription.paymentProof && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Proof</h2>
                <div className="mt-2">
                  <img
                    src={subscription.paymentProof}
                    alt="Payment Proof"
                    className="max-w-full h-auto rounded-lg border border-gray-300"
                  />
                </div>
              </div>
            )}

            {/* Subscription Date */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Subscription created: {new Date(subscription.createdAt).toLocaleString()}
              </div>
              {subscription.updatedAt && subscription.updatedAt !== subscription.createdAt && (
                <div className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(subscription.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

