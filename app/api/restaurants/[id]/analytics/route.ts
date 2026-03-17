import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);

    // Verify restaurant ownership or staff membership
    const [restaurants] = await pool.execute(
      'SELECT ownerId FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    const restaurantArray = restaurants as any[];
    if (!restaurantArray || restaurantArray.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Check if user is owner or staff with view reports permission
    const isOwner = restaurantArray[0].ownerId === user.id;
    
    const [staff] = await pool.execute(
      'SELECT * FROM restaurant_staff WHERE restaurantId = ? AND userId = ? AND isActive = ?',
      [restaurantId, user.id, true]
    );

    const isStaff = Array.isArray(staff) && staff.length > 0;
    const canViewReports = isStaff && (staff[0] as any).canViewReports;

    if (!isOwner && !canViewReports && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. You need permission to view reports.' },
        { status: 403 }
      );
    }

    // Get date range from query params (default to last 30 days)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total Orders
    const [totalOrders] = await pool.execute(
      'SELECT COUNT(*) as count FROM restaurant_orders WHERE restaurantId = ?',
      [restaurantId]
    );

    // Orders by Status
    const [ordersByStatus] = await pool.execute(
      `SELECT status, COUNT(*) as count 
       FROM restaurant_orders 
       WHERE restaurantId = ? 
       GROUP BY status`,
      [restaurantId]
    );

    // Total Revenue
    const [totalRevenue] = await pool.execute(
      `SELECT COALESCE(SUM(totalAmount), 0) as total 
       FROM restaurant_orders 
       WHERE restaurantId = ? AND status IN ('Paid', 'Completed')`,
      [restaurantId]
    );

    // Revenue in date range
    const [revenueInRange] = await pool.execute(
      `SELECT COALESCE(SUM(totalAmount), 0) as total 
       FROM restaurant_orders 
       WHERE restaurantId = ? AND status IN ('Paid', 'Completed') AND timestamp >= ?`,
      [restaurantId, startDate]
    );

    // Orders in date range
    const [ordersInRange] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM restaurant_orders 
       WHERE restaurantId = ? AND timestamp >= ?`,
      [restaurantId, startDate]
    );

    // Daily revenue for the last 7 days
    const [dailyRevenue] = await pool.execute(
      `SELECT DATE(timestamp) as date, COALESCE(SUM(totalAmount), 0) as revenue, COUNT(*) as orders
       FROM restaurant_orders 
       WHERE restaurantId = ? AND status IN ('Paid', 'Completed') AND timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`,
      [restaurantId]
    );

    // Popular Menu Items - Get all orders and process items
    const [allOrders] = await pool.execute(
      `SELECT items 
       FROM restaurant_orders 
       WHERE restaurantId = ? AND status IN ('Paid', 'Completed')`,
      [restaurantId]
    );

    // Process popular items
    const itemCounts: { [key: string]: number } = {};
    (allOrders as any[]).forEach((order: any) => {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name || 'Unknown';
            const qty = item.quantity || 1;
            itemCounts[name] = (itemCounts[name] || 0) + qty;
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    const topItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Staff Performance
    const [staffPerformance] = await pool.execute(
      `SELECT 
         u.name as staffName,
         COUNT(ro.id) as ordersCreated,
         COALESCE(SUM(ro.totalAmount), 0) as revenue
       FROM restaurant_orders ro
       JOIN users u ON ro.createdBy = u.id
       WHERE ro.restaurantId = ? AND ro.timestamp >= ?
       GROUP BY ro.createdBy, u.name
       ORDER BY ordersCreated DESC`,
      [restaurantId, startDate]
    );

    // Active Subscriptions
    const [activeSubscriptions] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM customer_subscriptions 
       WHERE restaurantId = ? AND status = 'Active' AND endDate >= CURDATE()`,
      [restaurantId]
    );

    // Pending Orders
    const [pendingOrders] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM restaurant_orders 
       WHERE restaurantId = ? AND status = 'Pending'`,
      [restaurantId]
    );

    // Average Order Value
    const [avgOrderValue] = await pool.execute(
      `SELECT COALESCE(AVG(totalAmount), 0) as avg 
       FROM restaurant_orders 
       WHERE restaurantId = ? AND status IN ('Paid', 'Completed')`,
      [restaurantId]
    );

    const res = NextResponse.json({
      summary: {
        totalOrders: (totalOrders as any[])[0]?.count || 0,
        totalRevenue: parseFloat((totalRevenue as any[])[0]?.total || '0'),
        revenueInRange: parseFloat((revenueInRange as any[])[0]?.total || '0'),
        ordersInRange: (ordersInRange as any[])[0]?.count || 0,
        activeSubscriptions: (activeSubscriptions as any[])[0]?.count || 0,
        pendingOrders: (pendingOrders as any[])[0]?.count || 0,
        avgOrderValue: parseFloat((avgOrderValue as any[])[0]?.avg || '0'),
      },
      ordersByStatus: ordersByStatus,
      dailyRevenue: dailyRevenue,
      topItems: topItems,
      staffPerformance: staffPerformance,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        days,
      },
    });
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    return res;
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

