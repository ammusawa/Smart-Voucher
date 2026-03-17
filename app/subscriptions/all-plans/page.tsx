'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface SubscriptionPlan {
  id: number;
  restaurantId: number;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  restaurantName?: string;
  restaurantLocation?: string;
}

export default function AllSubscriptionPlansPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [plansByRestaurant, setPlansByRestaurant] = useState<{ [key: number]: SubscriptionPlan[] }>({});
  const [loading, setLoading] = useState(true);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);

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

    // Fetch restaurants, their plans, and user subscriptions
    Promise.all([
      fetch('/api/restaurants?approved=true').then(res => res.json()),
      fetch('/api/subscriptions/my-subscriptions').then(res => res.json())
    ])
      .then(([restData, subData]) => {
        const restaurantsList = restData.restaurants || [];
        setRestaurants(restaurantsList);
        setUserSubscriptions(subData.subscriptions || []);

        // Fetch plans for each restaurant
        const planPromises = restaurantsList.map((restaurant: any) =>
          fetch(`/api/restaurants/${restaurant.id}/subscription-plans`)
            .then(res => res.json())
            .then(data => ({
              restaurantId: restaurant.id,
              plans: data.plans || []
            }))
            .catch(() => ({ restaurantId: restaurant.id, plans: [] }))
        );

        Promise.all(planPromises).then(results => {
          const plansMap: { [key: number]: SubscriptionPlan[] } = {};
          results.forEach(({ restaurantId, plans }) => {
            if (plans.length > 0) {
              plansMap[restaurantId] = plans.map((plan: any) => ({
                ...plan,
                restaurantName: restaurantsList.find((r: any) => r.id === restaurantId)?.name,
                restaurantLocation: restaurantsList.find((r: any) => r.id === restaurantId)?.location,
              }));
            }
          });
          setPlansByRestaurant(plansMap);
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));
  }, [router]);

  const getPlanStatus = (planId: number, restaurantId: number) => {
    // Check if user is subscribed to this specific plan
    const planSubscription = userSubscriptions.find(
      (sub) => sub.planId === planId && sub.restaurantId === restaurantId && sub.status === 'Active'
    );
    
    // Check if user has any active subscription to this restaurant
    const anyActiveSub = userSubscriptions.find(
      (sub) => sub.restaurantId === restaurantId && sub.status === 'Active'
    );
    
    return {
      isSubscribedToThisPlan: !!planSubscription,
      hasActiveSubscription: !!anyActiveSub,
      subscription: planSubscription || anyActiveSub,
    };
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl">Loading subscription plans...</div>
        </div>
      </>
    );
  }

  const restaurantsWithPlans = restaurants.filter(r => plansByRestaurant[r.id]?.length > 0);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">All Subscription Plans</h1>
          </div>

          {restaurantsWithPlans.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 text-lg">No subscription plans available at the moment.</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-block text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {restaurantsWithPlans.map((restaurant) => {
                const plans = plansByRestaurant[restaurant.id] || [];
                const hasAnyActive = userSubscriptions.some(
                  (sub) => sub.restaurantId === restaurant.id && sub.status === 'Active'
                );

                return (
                  <div key={restaurant.id} className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">{restaurant.name}</h2>
                          <p className="text-sm text-gray-600 mt-1">{restaurant.location}</p>
                        </div>
                        {hasAnyActive && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            Active Subscription
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plans.map((plan) => {
                          const planStatus = getPlanStatus(plan.id, restaurant.id);
                          const isSubscribedToThisPlan = planStatus.isSubscribedToThisPlan;

                          return (
                            <div
                              key={plan.id}
                              className={`border rounded-lg p-4 hover:shadow-md transition ${
                                isSubscribedToThisPlan ? 'border-green-300 bg-green-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg text-gray-900">{plan.name}</h3>
                                {isSubscribedToThisPlan && (
                                  <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium">
                                    Subscribed
                                  </span>
                                )}
                              </div>
                              {plan.description && (
                                <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                              )}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Price:</span>
                                  <span className="text-lg font-bold text-primary-600">
                                    ₦{parseFloat(plan.price.toString()).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Duration:</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {plan.durationDays} {plan.durationDays === 1 ? 'day' : 'days'}
                                  </span>
                                </div>
                                {isSubscribedToThisPlan && planStatus.subscription && (
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-500">
                                      Valid until: {new Date(planStatus.subscription.endDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 space-y-2">
                                {isSubscribedToThisPlan ? (
                                  <>
                                    <Link
                                      href="/topup"
                                      className="block w-full bg-primary-600 text-white text-center py-2 rounded text-sm hover:bg-primary-700"
                                    >
                                      Top Up Balance
                                    </Link>
                                    <Link
                                      href="/subscriptions"
                                      className="block w-full bg-gray-200 text-gray-800 text-center py-2 rounded text-sm hover:bg-gray-300"
                                    >
                                      View Subscription
                                    </Link>
                                  </>
                                ) : (
                                  <Link
                                    href={`/subscriptions/subscribe/${restaurant.id}?planId=${plan.id}`}
                                    className="block w-full bg-primary-600 text-white text-center py-2 rounded text-sm hover:bg-primary-700"
                                  >
                                    Subscribe Now
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

