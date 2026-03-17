'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import Link from 'next/link';

export default function RestaurantDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { modal, showSuccess, showError, hideModal } = useModal();
  const [menuUrl, setMenuUrl] = useState<string>('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || (data.user.role !== 'restaurant' && data.user.role !== 'admin' && data.user.role !== 'staff')) {
          router.push('/');
          return;
        }
        setUser(data.user);

        // Get restaurant for this user (owner or staff)
        fetch('/api/restaurants/my')
          .then(res => res.json())
          .then(restData => {
            setRestaurant(restData.restaurant || null);
          })
          .catch(() => {});

        // Get orders
        fetch('/api/transactions')
          .then(res => res.json())
          .then(transData => {
            setOrders(transData.transactions || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => {
        router.push('/');
        setLoading(false);
      });
  }, [router]);

  // Build a client-side menu URL that uses the current origin (LAN/IP when opened over network)
  useEffect(() => {
    if (restaurant && typeof window !== 'undefined') {
      setMenuUrl(`${window.location.origin}/restaurant/${restaurant.id}/menu-view`);
    }
  }, [restaurant]);

  // Listen for payment events broadcasted from other tabs/pages
  useEffect(() => {
    let bc: any;
    try {
      const BC = (window as any).BroadcastChannel;
      if (BC) {
        bc = new BC('payments');
        if (typeof bc.addEventListener === 'function') {
          bc.addEventListener('message', (ev: any) => {
            const data = ev?.data;
            if (data?.type === 'paid') {
              const title = 'Payment Received';
              const who = data.customerName || 'Customer';
              const amount = data.totalAmount ? Number(data.totalAmount).toFixed(2) : '';
              const msg = amount ? `Order #${data.orderId} paid by ${who} (₦${amount}).` : `Order #${data.orderId} paid by ${who}.`;
              showSuccess(msg, title, 2000);
            }
          });
        } else if (typeof bc.onmessage !== 'undefined') {
          bc.onmessage = (ev: any) => {
            const data = ev?.data;
            if (data?.type === 'paid') {
              const title = 'Payment Received';
              const who = data.customerName || 'Customer';
              const amount = data.totalAmount ? Number(data.totalAmount).toFixed(2) : '';
              const msg = amount ? `Order #${data.orderId} paid by ${who} (₦${amount}).` : `Order #${data.orderId} paid by ${who}.`;
              showSuccess(msg, title, 2000);
            }
          };
        }
      }
    } catch {}
    return () => {
      try {
        if (bc && typeof bc.close === 'function') {
          bc.close();
        }
      } catch {}
    };
  }, [showSuccess]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Restaurant Dashboard</h1>

          {!restaurant ? (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 mb-4">You haven't registered a restaurant yet.</p>
              <Link
                href="/restaurant/register"
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 inline-block"
              >
                Register Restaurant
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">Restaurant Status</h2>
                  <p className={`text-xl font-bold ${restaurant.isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
                    {restaurant.isApproved ? 'Approved' : 'Pending Approval'}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">Restaurant Name</h2>
                  <p className="text-xl font-bold text-gray-900">{restaurant.name}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Orders</h2>
                  <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Link
                  href="/restaurant/profile"
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Profile</h2>
                  <p className="text-gray-600">Update restaurant details and account information</p>
                </Link>

                <Link
                  href={`/restaurant/${restaurant.id}/subscription-plans`}
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription Plans</h2>
                  <p className="text-gray-600">Create and manage subscription plans</p>
                </Link>

                <Link
                  href={`/restaurant/${restaurant.id}/menu`}
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Menu</h2>
                  <p className="text-gray-600">Add, edit, and update menu items</p>
                </Link>

                <Link
                  href={`/restaurant/${restaurant.id}/create-order`}
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Order</h2>
                  <p className="text-gray-600">Create order and generate QR code</p>
                </Link>

                <Link
                  href={`/restaurant/${restaurant.id}/orders`}
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">View Orders</h2>
                  <p className="text-gray-600">See all orders and transactions</p>
                </Link>

                <Link
                  href="/admin/topup-requests"
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Top-Up Requests</h2>
                  <p className="text-gray-600">Review and approve customer top-up requests</p>
                </Link>

                <Link
                  href={`/restaurant/${restaurant.id}/subscriptions`}
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscriptions</h2>
                  <p className="text-gray-600">Manage customer subscriptions</p>
                </Link>

                <Link
                  href={`/restaurant/${restaurant.id}/staff`}
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Staff Management</h2>
                  <p className="text-gray-600">Add and manage staff members</p>
                </Link>

                <Link
                  href={`/restaurant/${restaurant.id}/analytics`}
                  className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics</h2>
                  <p className="text-gray-600">View data analysis and reports</p>
                </Link>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Restaurant QR Code</h2>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/restaurants/${restaurant.id}/generate-qr`, {
                          method: 'POST',
                        });
                        const data = await res.json();
                        if (res.ok) {
                          window.location.reload();
                        }
                      } catch (err) {
                        console.error('Failed to regenerate QR code');
                      }
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Regenerate
                  </button>
                </div>
                {restaurant.qrCodeUrl ? (
                  <>
                    <div className="flex justify-center">
                      <img src={restaurant.qrCodeUrl} alt="Restaurant QR Code" className="w-64 h-64" />
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-4">
                      Customers can scan this QR code to view your menu
                    </p>
                    <p className="text-center text-xs text-gray-500 mt-2">
                      QR code contains: {process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/restaurant/{restaurant.id}/menu-view
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No QR code generated yet</p>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/restaurants/${restaurant.id}/generate-qr`, {
                            method: 'POST',
                          });
                          const data = await res.json();
                          if (res.ok) {
                            window.location.reload();
                          }
                        } catch (err) {
                          console.error('Failed to generate QR code');
                        }
                      }}
                      className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                    >
                      Generate QR Code
                    </button>
                  </div>
                )}
                {/* Show the direct menu URL and copy helper */}
                {restaurant && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Direct Menu URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={menuUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => {
                          if (menuUrl) {
                            navigator.clipboard?.writeText(menuUrl);
                            showSuccess('Menu link copied to clipboard', 'Copied', 1200);
                          }
                        }}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      If your QR still opens JSON, click Regenerate so it uses your current network URL.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

