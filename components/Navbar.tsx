'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          
          // Get restaurant for restaurant users
          if (data.user.role === 'restaurant' || data.user.role === 'admin' || data.user.role === 'staff') {
            fetch('/api/restaurants/my')
              .then(res => res.json())
              .then(restData => {
                setRestaurant(restData.restaurant || null);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <nav className="bg-white shadow-md safe-pt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary-600">
              Baze Smart Voucher
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {(user.role === 'restaurant' || user.role === 'admin') && restaurant && (
                  <Link
                    href={`/restaurant/${restaurant.id}/analytics`}
                    className="text-gray-700 hover:text-primary-600 font-medium"
                  >
                    Analytics
                  </Link>
                )}
                {(user.role === 'restaurant' || user.role === 'staff') && (
                  <Link
                    href="/restaurant/dashboard"
                    className="text-gray-700 hover:text-primary-600 font-medium"
                  >
                    Dashboard
                  </Link>
                )}
                {user.role === 'user' && (
                  <Link
                    href="/dashboard"
                    className="text-gray-700 hover:text-primary-600 font-medium"
                  >
                    Dashboard
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="text-gray-700 hover:text-primary-600 font-medium"
                  >
                    Dashboard
                  </Link>
                )}
                <span className="text-gray-700">
                  {user.name} ({user.role})
                </span>
                {user.role === 'user' && (
                  <span className="text-gray-700 font-semibold">
                    Balance: ₦{user.balance?.toFixed(2) || '0.00'}
                  </span>
                )}
                <button
                  onClick={handleLogoutClick}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleLogoutCancel}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full border-2 border-yellow-200 bg-yellow-50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Content */}
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-4xl text-yellow-600 mr-4">
                    ⚠
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Confirm Logout
                    </h3>
                    <p className="text-yellow-700">
                      Are you sure you want to logout? You will need to login again to access your account.
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={handleLogoutCancel}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogoutConfirm}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

