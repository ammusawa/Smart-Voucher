'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
}

export default function MenuViewPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Allow access without authentication for QR code scanning
    fetch(`/api/restaurants/${restaurantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.restaurant) {
          setRestaurant(data.restaurant);
        } else if (data.error) {
          setLoading(false);
          return;
        }
      })
      .catch(() => {});

    fetch(`/api/restaurants/${restaurantId}/menu`)
      .then(res => res.json())
      .then(data => {
        const items = (data.menuItems || []).map((item: any) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          stock: parseInt(item.stock) || 0,
        }));
        setMenuItems(items);
        // Fetch subscription plans in parallel after menu
        fetch(`/api/restaurants/${restaurantId}/subscription-plans`)
          .then(res => res.json())
          .then(planData => {
            setPlans(Array.isArray(planData.plans) ? planData.plans : (planData || []));
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl">Loading menu...</div>
        </div>
      </>
    );
  }

  if (!restaurant) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl text-red-600">Restaurant not found</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
            {restaurant.location && (
              <p className="text-gray-600">📍 {restaurant.location}</p>
            )}
            {restaurant.description && (
              <p className="text-gray-700 mt-2">{restaurant.description}</p>
            )}
            {restaurant.phone && (
              <p className="text-sm text-gray-600 mt-2">📞 {restaurant.phone}</p>
            )}
            {restaurant.openingHours && (
              <p className="text-sm text-gray-600">🕐 {restaurant.openingHours}</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Menu</h2>
              <p className="text-sm text-gray-600 mt-1">
                {menuItems.length} {menuItems.length === 1 ? 'item' : 'items'} available
              </p>
            </div>

            {menuItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No menu items available at this restaurant.</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 ${
                        item.stock <= 0 ? 'opacity-60 bg-gray-50' : 'hover:shadow-md transition'
                      }`}
                    >
                      {item.imageUrl && (
                        <div className="mb-3">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-primary-600 font-bold text-xl">
                          ₦{item.price.toFixed(2)}
                        </span>
                        <span className={`text-sm font-medium ${
                          item.stock > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stock > 0 ? `In Stock (${item.stock})` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subscription Plans */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Subscription Plans</h2>
              <p className="text-sm text-gray-600 mt-1">
                Save and get seamless payments with a plan
              </p>
            </div>
            <div className="p-6">
              {plans && plans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan: any) => (
                    <div key={plan.id} className="border rounded-lg p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                        )}
                        <div className="mt-3">
                          <p className="text-2xl font-bold text-primary-600">
                            ₦{parseFloat(plan.price).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Duration: {plan.durationDays} days
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link
                          href={`/subscriptions/subscribe/${restaurantId}`}
                          className="inline-block w-full text-center bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                        >
                          Subscribe
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No subscription plans available</p>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/dashboard"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

