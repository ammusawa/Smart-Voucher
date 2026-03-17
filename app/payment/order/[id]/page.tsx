'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function OrderPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { modal, showSuccess, showError, hideModal } = useModal();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'user') {
          router.push('/');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/'));

    // Fetch order details
    if (orderId) {
      fetch(`/api/orders/${orderId}`)
        .then(res => res.json())
        .then(data => {
          if (data.order) {
            const normalized = {
              ...data.order,
              totalAmount: parseFloat(data.order.totalAmount),
              restaurantId: Number(data.order.restaurantId),
              items: Array.isArray(data.order.items)
                ? data.order.items.map((it: any) => ({
                    menuItemId: Number(it.menuItemId),
                    quantity: Number(it.quantity),
                    price: parseFloat(it.price),
                    name: it.name,
                  }))
                : [],
            };
            setOrder(normalized);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [router, orderId]);

  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [subscriptionWarning, setSubscriptionWarning] = useState(false);

  useEffect(() => {
    // Check subscription status when order loads
    if (order && user) {
      fetch('/api/subscriptions/my-subscriptions')
        .then(res => res.json())
        .then(data => {
          const activeSub = data.subscriptions?.find(
            (s: any) => s.restaurantId === order.restaurantId && s.status === 'Active' && new Date(s.endDate) >= new Date()
          );
          setHasActiveSubscription(!!activeSub);
        })
        .catch(() => setHasActiveSubscription(false));
    }
  }, [order, user]);

  const handlePayment = async () => {
    if (!order || !user) return;

    // Check balance first - show modal if insufficient
    if (user.balance < order.totalAmount) {
      showError(
        `Insufficient balance. Your current balance is ₦${user.balance.toFixed(2)}, but the order total is ₦${order.totalAmount.toFixed(2)}. Please top up your account to proceed.`,
        'Insufficient Balance'
      );
      return;
    }

    // Show warning if no subscription but allow to proceed
    if (hasActiveSubscription === false) {
      setSubscriptionWarning(true);
      return;
    }

    processPayment();
  };

  const processPayment = async () => {
    if (!order || !user) return;

    // Double-check balance before processing (defensive check)
    if (user.balance < order.totalAmount) {
      showError(
        `Insufficient balance. Your current balance is ₦${user.balance.toFixed(2)}, but the order total is ₦${order.totalAmount.toFixed(2)}. Please top up your account to proceed.`,
        'Insufficient Balance'
      );
      setProcessing(false);
      return;
    }

    setProcessing(true);

    try {
      const payload = {
        restaurantId: Number(order.restaurantId),
        items: order.items.map((it: any) => ({
          menuItemId: Number(it.menuItemId),
          quantity: Number(it.quantity),
          price: parseFloat(it.price),
          name: it.name,
        })),
        totalAmount: parseFloat(order.totalAmount),
        orderId: Number(orderId),
      };
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Payment failed');
        setProcessing(false);
        return;
      }

      showSuccess('Payment successful!', 'Payment Complete', 2000);
      setTimeout(() => {
        router.push('/transactions');
      }, 2000);
    } catch (err) {
      showError('An error occurred. Please try again.');
      setProcessing(false);
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

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Order not found or already processed.</p>
            </div>
          </div>
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
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Confirm Payment</h1>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            {hasActiveSubscription === false && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-800">No Active Subscription</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      You don't have an active subscription to this restaurant. You can still proceed with payment, but consider subscribing for better benefits.
                    </p>
                    <Link
                      href={`/subscriptions/subscribe/${order.restaurantId}`}
                      className="text-sm text-yellow-800 underline font-medium mt-2 inline-block"
                    >
                      Subscribe to this restaurant →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {subscriptionWarning && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">Continue Without Subscription?</h3>
                    <p className="text-sm text-blue-700">
                      You don't have an active subscription. You can still make this payment, but subscribing may provide additional benefits.
                    </p>
                  </div>
                  <button
                    onClick={() => setSubscriptionWarning(false)}
                    className="text-blue-600 hover:text-blue-800 ml-4"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setSubscriptionWarning(false);
                      if (user.balance >= order.totalAmount) {
                        processPayment();
                      } else {
                        showError(
                          `Insufficient balance. Your current balance is ₦${user.balance.toFixed(2)}, but the order total is ₦${order.totalAmount.toFixed(2)}. Please top up your account to proceed.`,
                          'Insufficient Balance'
                        );
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Continue Anyway
                  </button>
                  <Link
                    href={`/subscriptions/subscribe/${order.restaurantId}`}
                    className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 text-center"
                  >
                    Subscribe First
                  </Link>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold mb-2">Order Details</h2>
              <p className="text-gray-600">Restaurant: {order.restaurantName}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Items:</h3>
              <div className="space-y-2">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₦{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>₦{parseFloat(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Your Balance:</p>
              <p className="text-xl font-bold text-primary-600">
                ₦{user?.balance?.toFixed(2) || '0.00'}
              </p>
            </div>

            <button
              onClick={handlePayment}
              disabled={processing || !user || subscriptionWarning}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                processing || !user || subscriptionWarning
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : user && user.balance < order.totalAmount
                  ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {processing ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

