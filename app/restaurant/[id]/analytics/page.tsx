'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || (data.user.role !== 'restaurant' && data.user.role !== 'admin' && data.user.role !== 'staff')) {
          router.push('/');
          return;
        }
        
        // If restaurantId is not provided, get user's restaurant
        if (!restaurantId && data.user.role === 'restaurant') {
          fetch('/api/restaurants')
            .then(res => res.json())
            .then(restData => {
              const userRestaurant = restData.restaurants?.find((r: any) => r.ownerId === data.user.id);
              if (userRestaurant) {
                router.push(`/restaurant/${userRestaurant.id}/analytics`);
              }
            });
          return;
        }
      })
      .catch(() => router.push('/'));

    if (restaurantId) {
      fetchAnalytics();
    }
  }, [restaurantId, days, router]);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch(`/api/restaurants/${restaurantId}/analytics?days=${days}`)
      .then(res => res.json())
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl">Loading analytics...</div>
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl text-red-600">Failed to load analytics</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
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
              <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            </div>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">
                ₦{analytics.summary.totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {analytics.summary.revenueInRange.toFixed(2)} in selected period
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Orders</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.totalOrders}</p>
              <p className="text-sm text-gray-600 mt-2">
                {analytics.summary.ordersInRange} in selected period
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Average Order Value</h3>
              <p className="text-3xl font-bold text-gray-900">
                ₦{analytics.summary.avgOrderValue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Per transaction</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Subscriptions</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.activeSubscriptions}</p>
              <p className="text-sm text-gray-600 mt-2">
                {analytics.summary.pendingOrders} pending orders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Orders by Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Orders by Status</h2>
              <div className="space-y-3">
                {analytics.ordersByStatus.map((status: any) => (
                  <div key={status.status} className="flex justify-between items-center">
                    <span className="text-gray-700">{status.status}</span>
                    <span className="font-semibold text-gray-900">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Revenue (Last 7 Days) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Daily Revenue (Last 7 Days)</h2>
              {/* Simple inline line chart */}
              {analytics.dailyRevenue.length > 0 && (
                <div className="mb-4">
                  <RevenueLineChart data={analytics.dailyRevenue} />
                </div>
              )}
              <div className="space-y-3">
                {analytics.dailyRevenue.map((day: any) => (
                  <div key={day.date} className="flex justify-between items-center">
                    <span className="text-gray-700">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₦{parseFloat(day.revenue).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{day.orders} orders</p>
                    </div>
                  </div>
                ))}
                {analytics.dailyRevenue.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Menu Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Top Menu Items</h2>
              {analytics.topItems.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-bold text-lg">#{idx + 1}</span>
                        <span className="text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{item.count} sold</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </div>

            {/* Staff Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Staff Performance</h2>
              {analytics.staffPerformance.length > 0 ? (
                <div className="space-y-4">
                  {analytics.staffPerformance.map((staff: any, idx: number) => (
                    <div key={idx} className="border-b border-gray-200 pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{staff.staffName}</span>
                        <span className="text-sm text-gray-600">{staff.ordersCreated} orders</span>
                      </div>
                      <p className="text-sm text-primary-600 font-semibold">
                        ₦{parseFloat(staff.revenue).toFixed(2)} revenue
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RevenueLineChart({ data }: { data: Array<{ date: string; revenue: number | string; orders?: number }> }) {
  // Normalize data
  const points = data.map((d) => ({
    x: new Date(d.date).getTime(),
    y: typeof d.revenue === 'string' ? parseFloat(d.revenue) : Number(d.revenue || 0),
  }));
  if (points.length === 0) return null;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = Math.max(...ys, 1);

  const pad = 8;
  const width = 600;
  const height = 160;

  const toSvgX = (x: number) => {
    if (maxX === minX) return pad;
    return pad + ((x - minX) / (maxX - minX)) * (width - pad * 2);
    };
  const toSvgY = (y: number) => {
    if (maxY === minY) return height - pad;
    // invert y for SVG
    return pad + (1 - (y - minY) / (maxY - minY)) * (height - pad * 2);
  };

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x)} ${toSvgY(p.y)}`)
    .join(' ');

  const areaD =
    `M ${toSvgX(points[0].x)} ${toSvgY(points[0].y)} ` +
    points.slice(1).map(p => `L ${toSvgX(p.x)} ${toSvgY(p.y)}`).join(' ') +
    ` L ${toSvgX(points[points.length - 1].x)} ${height - pad} L ${toSvgX(points[0].x)} ${height - pad} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
        {/* Area */}
        <path d={areaD} fill="#60a5fa22" stroke="none" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={toSvgX(p.x)} cy={toSvgY(p.y)} r="3" fill="#2563eb" />
        ))}
        {/* Y-axis labels (min/max) */}
        <text x={pad} y={toSvgY(maxY)} fontSize="10" fill="#6b7280">₦{maxY.toFixed(0)}</text>
        <text x={pad} y={toSvgY(minY)} fontSize="10" fill="#6b7280">₦{minY.toFixed(0)}</text>
      </svg>
    </div>
  );
}

