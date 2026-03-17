'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const [plans, setPlans] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [viewPlan, setViewPlan] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationDays: '',
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { modal, showSuccess, showError, hideModal } = useModal();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || (data.user.role !== 'restaurant' && data.user.role !== 'admin' && data.user.role !== 'staff')) {
          router.push('/');
          return;
        }
      })
      .catch(() => router.push('/'));

    fetchPlans();
  }, [restaurantId, router]);

  const fetchPlans = () => {
    fetch(`/api/restaurants/${restaurantId}/subscription-plans`)
      .then(res => res.json())
      .then(data => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', durationDays: '' });
    setEditingPlanId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const body = {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          durationDays: parseInt(formData.durationDays),
      };

      const method = editingPlanId ? 'PUT' : 'POST';
      const url = editingPlanId
        ? `/api/restaurants/${restaurantId}/subscription-plans/${editingPlanId}`
        : `/api/restaurants/${restaurantId}/subscription-plans`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || `Failed to ${editingPlanId ? 'update' : 'create'} subscription plan`);
        return;
      }

      showSuccess(
        editingPlanId ? 'Subscription plan updated successfully' : 'Subscription plan created successfully',
        'Success',
        2000
      );
      resetForm();
      fetchPlans();
    } catch (err) {
      showError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price?.toString() || '',
      durationDays: plan.durationDays?.toString() || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePlan = async (planId: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this subscription plan?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/subscription-plans/${planId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to delete subscription plan');
        return;
      }

      showSuccess('Subscription plan deleted successfully', 'Deleted', 2000);
      if (editingPlanId === planId) {
        resetForm();
      }
      fetchPlans();
    } catch (err) {
      showError('An error occurred while deleting the plan.');
    }
  };

  const formatPrice = (price: number | string) => {
    const value = typeof price === 'number' ? price : parseFloat(price || '0');
    return value.toFixed(2);
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
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/restaurant/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
            >
              {showForm ? 'Cancel' : 'Create Plan'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {editingPlanId ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
                </h2>
                {editingPlanId && (
                  <button
                    onClick={resetForm}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Monthly Plan, Weekly Plan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 30 for monthly"
                      value={formData.durationDays}
                      onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPlanId ? 'Save Changes' : 'Create Plan'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Active Plans</h2>
            </div>
            {plans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No subscription plans. Create your first plan above.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {plans.map((plan) => (
                  <div key={plan.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                        )}
                        <div className="mt-2 flex space-x-4 flex-wrap text-sm">
                          <span className="text-primary-600 font-semibold">₦{formatPrice(plan.price)}</span>
                          <span className="text-gray-600">Duration: {plan.durationDays} days</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewPlan(plan)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                          View
                        </button>
                        <button
                          onClick={() => startEditPlan(plan)}
                          className="px-3 py-1 text-sm border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded-md hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {viewPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setViewPlan(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h3 className="text-2xl font-semibold mb-4">{viewPlan.name}</h3>
            {viewPlan.description && <p className="text-gray-600 mb-4">{viewPlan.description}</p>}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span className="font-semibold">₦{formatPrice(viewPlan.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-semibold">{viewPlan.durationDays} days</span>
              </div>
              {viewPlan.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-semibold">
                    {new Date(viewPlan.createdAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setViewPlan(null)}
              className="mt-6 w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

