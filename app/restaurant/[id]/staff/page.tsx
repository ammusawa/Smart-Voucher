'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function StaffManagementPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const [staff, setStaff] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    canCreateOrders: true,
    canManageMenu: false,
    canViewReports: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

    fetchStaff();
  }, [restaurantId, router]);

  const fetchStaff = () => {
    fetch(`/api/restaurants/${restaurantId}/staff`)
      .then(res => res.json())
      .then(data => {
        setStaff(data.staff || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          permissions: {
            canCreateOrders: formData.canCreateOrders,
            canManageMenu: formData.canManageMenu,
            canViewReports: formData.canViewReports,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to add staff member');
        setSaving(false);
        return;
      }

      showSuccess('Staff member added successfully', 'Success', 2000);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        canCreateOrders: true,
        canManageMenu: false,
        canViewReports: false,
      });
      setShowAddForm(false);
      fetchStaff();
      setSaving(false);
    } catch (err) {
      showError('An error occurred. Please try again.');
      setSaving(false);
    }
  };

  const handleToggleActive = async (staffId: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to update staff');
        return;
      }

      showSuccess('Staff member updated successfully', 'Success', 2000);
      fetchStaff();
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
              <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
            >
              {showAddForm ? 'Cancel' : 'Add Staff Member'}
            </button>
          </div>

          {showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Add New Staff Member</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="staff">Staff</option>
                      <option value="cashier">Cashier</option>
                      <option value="chef">Chef</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.canCreateOrders}
                        onChange={(e) => setFormData({ ...formData, canCreateOrders: e.target.checked })}
                        className="mr-2"
                      />
                      <span>Can Create Orders</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.canManageMenu}
                        onChange={(e) => setFormData({ ...formData, canManageMenu: e.target.checked })}
                        className="mr-2"
                      />
                      <span>Can Manage Menu</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.canViewReports}
                        onChange={(e) => setFormData({ ...formData, canViewReports: e.target.checked })}
                        className="mr-2"
                      />
                      <span>Can View Reports</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Staff Member'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Staff Members</h2>
            </div>
            {staff.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No staff members. Add your first staff member above.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {staff.map((member) => (
                  <div key={member.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{member.name}</h3>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <div className="mt-2 flex space-x-4 text-sm">
                          <span className="text-primary-600 font-medium capitalize">{member.role}</span>
                          <span className={`font-medium ${
                            member.isActive ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {member.canCreateOrders && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Create Orders</span>
                          )}
                          {member.canManageMenu && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Manage Menu</span>
                          )}
                          {member.canViewReports && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">View Reports</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(member.id, member.isActive)}
                        className={`px-4 py-2 rounded text-sm font-medium ${
                          member.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {member.isActive ? 'Deactivate' : 'Activate'}
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

