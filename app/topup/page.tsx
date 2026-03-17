'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function TopUpPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  }, [router]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const topUpAmount = parseFloat(amount);
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!proofFile) {
      showError('Please upload a payment proof (receipt/screenshot)');
      return;
    }

    setUploading(true);

    try {
      // Upload payment proof
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
        showError(uploadData.error || 'Failed to upload payment proof');
        setUploading(false);
        return;
      }

      const proofUrl = uploadData.url;

      // Submit top-up request
      setLoading(true);
      const res = await fetch('/api/topup/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: topUpAmount,
          paymentProof: proofUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to submit top-up request');
        setLoading(false);
        setUploading(false);
        return;
      }

      showSuccess(
        `Top-up request for ₦${topUpAmount.toFixed(2)} submitted successfully. Your payment proof has been uploaded. Please wait for verification.`,
        'Request Submitted',
        3000
      );
      setAmount('');
      setProofFile(null);
      
      // Refresh user data
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
          }
        });
    } catch (err) {
      showError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Top Up Account</h1>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <p className="text-gray-600 mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-primary-600">
              ₦{user?.balance?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Request Top-Up</h2>

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

            <form onSubmit={handleTopUp}>
              <div className="mb-4">
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="proof" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Proof (Receipt/Screenshot)
                </label>
                <input
                  id="proof"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        showError('File size must be less than 5MB');
                        return;
                      }
                      setProofFile(file);
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a screenshot or photo of your payment receipt (JPEG, PNG, WebP, max 5MB)
                </p>
                {proofFile && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {proofFile.name} selected
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {loading || uploading ? 'Processing...' : 'Submit Top-Up Request'}
              </button>
            </form>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After submitting your request with payment proof, a restaurant or admin will verify your payment. Once approved, the amount will be credited to your balance.
            </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

