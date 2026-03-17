'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function SubscribePage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const [plans, setPlans] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [createdSubscriptionId, setCreatedSubscriptionId] = useState<number | null>(null);
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

    fetch(`/api/restaurants/${restaurantId}/subscription-plans`)
      .then(res => res.json())
      .then(data => {
        const plansList = data.plans || [];
        setPlans(plansList);
        
        // Check if planId is in URL query params and pre-select it
        const urlParams = new URLSearchParams(window.location.search);
        const planIdParam = urlParams.get('planId');
        if (planIdParam) {
          const planId = parseInt(planIdParam);
          const foundPlan = plansList.find((p: any) => p.id === planId);
          if (foundPlan) {
            setSelectedPlan(foundPlan);
          }
        }
        
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/restaurants')
      .then(res => res.json())
      .then(data => {
        const found = data.restaurants?.find((r: any) => r.id === parseInt(restaurantId));
        setRestaurant(found);
      })
      .catch(() => {});
  }, [restaurantId, router]);

  const handleSubscribe = async (plan: any) => {
    setSubscribing(true);
    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          restaurantId: parseInt(restaurantId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to subscribe');
        setSubscribing(false);
        return;
      }

      setSelectedPlan(plan);
      setPaymentDetails(data.paymentDetails);
      setCreatedSubscriptionId(data.subscription?.id || null);
      showSuccess('Subscription created. Please make payment to activate.', 'Subscription Created', 3000);
      setSubscribing(false);
    } catch (err) {
      showError('An error occurred. Please try again.');
      setSubscribing(false);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile) {
      showError('Please select a receipt image to upload.');
      return;
    }
    if (!createdSubscriptionId) {
      showError('No subscription found. Click Subscribe first.');
      return;
    }
    setSubmittingProof(true);
    try {
      // Upload file to get a URL
      const form = new FormData();
      form.append('file', proofFile);
      form.append('folder', 'payment-proofs');
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        showError(uploadData.error || 'Failed to upload receipt image');
        setSubmittingProof(false);
        return;
      }
      const proofUrl = uploadData.url;

      // Submit payment proof
      const res = await fetch('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: createdSubscriptionId,
          paymentProof: proofUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to submit payment proof');
        setSubmittingProof(false);
        return;
      }
      showSuccess('Payment proof submitted. Awaiting verification.', 'Submitted', 2500);
      setProofFile(null);
      setSubmittingProof(false);
    } catch (e) {
      showError('An error occurred. Please try again.');
      setSubmittingProof(false);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Subscribe to {restaurant?.name || 'Restaurant'}
            </h1>
          </div>

          {paymentDetails && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">Payment Instructions</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-blue-800">Amount: </span>
                  <span className="text-blue-900">₦{parseFloat(paymentDetails.amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="font-semibold text-blue-800">Bank Name: </span>
                  <span className="text-blue-900">{paymentDetails.bankName}</span>
                </div>
                <div>
                  <span className="font-semibold text-blue-800">Account Number: </span>
                  <span className="text-blue-900 font-mono">{paymentDetails.accountNumber}</span>
                </div>
                <div>
                  <span className="font-semibold text-blue-800">Account Name: </span>
                  <span className="text-blue-900">{paymentDetails.accountName}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-blue-800 font-medium">
                    After making the transfer, your subscription will be activated once the restaurant verifies your payment.
                    The subscription amount will be credited to your account balance.
                  </p>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Upload Payment Proof (Receipt Image)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  <button
                    onClick={handleUploadProof}
                    disabled={submittingProof || !proofFile}
                    className="mt-3 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {submittingProof ? 'Submitting...' : 'Submit Payment Proof'}
                  </button>
                  <p className="text-xs text-blue-800 mt-2">
                    Supported: JPG/PNG. Your proof will be visible to the restaurant for verification.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Available Plans</h2>
            </div>
            {plans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No subscription plans available for this restaurant.
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl mb-2">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-gray-600 mb-3">{plan.description}</p>
                        )}
                        <div className="flex space-x-4">
                          <span className="text-primary-600 font-bold text-2xl">
                            ₦{parseFloat(plan.price).toFixed(2)}
                          </span>
                          <span className="text-gray-600 self-center">
                            for {plan.durationDays} days
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={subscribing || !!paymentDetails}
                        className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                      >
                        {subscribing ? 'Processing...' : 'Subscribe'}
                      </button>
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

