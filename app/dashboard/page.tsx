'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Fetch restaurants and subscriptions in parallel
    Promise.all([
      fetch('/api/restaurants?approved=true').then(res => res.json()),
      fetch('/api/subscriptions/my-subscriptions').then(res => res.json())
    ])
      .then(([restData, subData]) => {
        setRestaurants(restData.restaurants || []);
        setSubscriptions(subData.subscriptions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  // Check if user has an active subscription to a restaurant
  const hasActiveSubscription = (restaurantId: number) => {
    return subscriptions.some(
      (sub) => sub.restaurantId === restaurantId && sub.status === 'Active'
    );
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Customer Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Balance</h2>
              <p className="text-3xl font-bold text-primary-600">
                ₦{user?.balance?.toFixed(2) || '0.00'}
              </p>
              <Link
                href="/topup"
                className="mt-4 inline-block text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Top Up →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href="/subscriptions/all-plans"
                  className="block w-full bg-primary-600 text-white text-center py-2 rounded hover:bg-primary-700"
                >
                  Subscriptions
                </Link>
                <Link
                  href="/transactions"
                  className="block w-full bg-gray-200 text-gray-800 text-center py-2 rounded hover:bg-gray-300"
                >
                  View Transactions
                </Link>
                <Link
                  href="/subscriptions"
                  className="block w-full bg-green-600 text-white text-center py-2 rounded hover:bg-green-700"
                >
                  My Subscriptions
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Restaurants</h2>
              <p className="text-2xl font-bold text-gray-900">{restaurants.length}</p>
              <p className="text-sm text-gray-600 mt-1">Available restaurants</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Available Restaurants</h2>
            </div>
            <div className="p-6">
              {restaurants.length === 0 ? (
                <p className="text-gray-500">No restaurants available at the moment.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <Link href={`/restaurant/${restaurant.id}`}>
                        <h3 className="font-semibold text-lg text-gray-900">{restaurant.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{restaurant.location}</p>
                      </Link>
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/restaurant/${restaurant.id}`}
                          className="flex-1 bg-primary-600 text-white text-center py-2 rounded text-sm hover:bg-primary-700"
                        >
                          View Menu
                        </Link>
                        {hasActiveSubscription(restaurant.id) ? (
                          <Link
                            href="/subscriptions"
                            className="flex-1 bg-gray-500 text-white text-center py-2 rounded text-sm hover:bg-gray-600 cursor-pointer"
                          >
                            Subscribed
                          </Link>
                        ) : (
                          <Link
                            href={`/subscriptions/subscribe/${restaurant.id}`}
                            className="flex-1 bg-green-600 text-white text-center py-2 rounded text-sm hover:bg-green-700"
                          >
                            Subscribe
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

