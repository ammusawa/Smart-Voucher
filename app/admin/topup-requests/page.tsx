'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function TopUpRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { modal, showSuccess, showError, hideModal } = useModal();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || (data.user.role !== 'restaurant' && data.user.role !== 'admin')) {
          router.push('/');
          return;
        }
      })
      .catch(() => router.push('/'));

    fetchRequests();
  }, [router]);

  const fetchRequests = () => {
    fetch('/api/topup/request')
      .then(res => res.json())
      .then(data => {
        setRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleApprove = async (requestId: number, approve: boolean, notes?: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/topup/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve, notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to process request');
        setProcessingId(null);
        return;
      }

      showSuccess(
        approve 
          ? 'Top-up request approved and balance credited successfully' 
          : 'Top-up request rejected',
        approve ? 'Approved' : 'Rejected',
        2000
      );
      fetchRequests();
      setProcessingId(null);
    } catch (err) {
      showError('An error occurred. Please try again.');
      setProcessingId(null);
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

  const pendingRequests = requests.filter(r => r.paymentStatus === 'Pending');
  const processedRequests = requests.filter(r => r.paymentStatus !== 'Pending');

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
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/restaurant/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Top-Up Requests</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Requests */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Pending Requests ({pendingRequests.length})</h2>
              </div>
              <div className="p-6">
                {pendingRequests.length === 0 ? (
                  <p className="text-gray-500">No pending top-up requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{request.userName}</h3>
                            <p className="text-sm text-gray-600">{request.userEmail}</p>
                            <p className="text-lg font-bold text-primary-600 mt-2">
                              ₦{parseFloat(request.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Requested: {new Date(request.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {request.paymentProof && (
                          <div className="mb-3">
                            <a
                              href={request.paymentProof}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Payment Proof →
                            </a>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(request.id, true)}
                            disabled={processingId === request.id}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {processingId === request.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Rejection reason (optional):');
                              if (notes !== null) {
                                handleApprove(request.id, false, notes);
                              }
                            }}
                            disabled={processingId === request.id}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50"
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

            {/* Processed Requests */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Processed Requests ({processedRequests.length})</h2>
              </div>
              <div className="p-6 max-h-[600px] overflow-y-auto">
                {processedRequests.length === 0 ? (
                  <p className="text-gray-500">No processed requests</p>
                ) : (
                  <div className="space-y-3">
                    {processedRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`border rounded-lg p-3 ${
                          request.paymentStatus === 'Verified'
                            ? 'border-green-200 bg-green-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{request.userName}</p>
                            <p className="text-xs text-gray-600">{request.userEmail}</p>
                            <p className="text-sm font-bold text-primary-600 mt-1">
                              ₦{parseFloat(request.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              request.paymentStatus === 'Verified'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {request.paymentStatus}
                          </span>
                        </div>
                        {request.notes && (
                          <p className="text-xs text-gray-600 mt-2">Note: {request.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

