import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseQRData } from '@/lib/qrcode';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { qrData } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: 'QR data is required' },
        { status: 400 }
      );
    }

    // Check if QR data is a URL (new format) or JSON (old format)
    let restaurantId: number | null = null;
    let orderIdFromUrl: number | null = null;
    
    // Try to parse as URL first
    try {
      const url = new URL(qrData);
      const pathParts = url.pathname.split('/');
      const menuViewIndex = pathParts.indexOf('menu-view');
      if (menuViewIndex > 0) {
        restaurantId = parseInt(pathParts[menuViewIndex - 1]);
      } else {
        // Try restaurant ID pattern
        const restaurantIndex = pathParts.indexOf('restaurant');
        if (restaurantIndex >= 0 && pathParts[restaurantIndex + 1]) {
          restaurantId = parseInt(pathParts[restaurantIndex + 1]);
        }
        // Try order payment URL: /payment/order/:id
        const paymentIndex = pathParts.indexOf('payment');
        const orderIndex = pathParts.indexOf('order');
        if (paymentIndex >= 0 && orderIndex >= 0 && pathParts[orderIndex + 1]) {
          const maybeOrderId = parseInt(pathParts[orderIndex + 1]);
          if (!isNaN(maybeOrderId)) {
            orderIdFromUrl = maybeOrderId;
          }
        }
      }
    } catch (e) {
      // Not a URL, try parsing as JSON (old format)
      const parsedData = parseQRData(qrData);
      if (parsedData && parsedData.type === 'restaurant') {
        restaurantId = parsedData.restaurantId;
      }
      if (parsedData && parsedData.type === 'order') {
        orderIdFromUrl = parsedData.orderId;
      }
    }

    if (restaurantId) {
      // Handle restaurant QR code (both URL and JSON formats)
      
      const [restaurants] = await pool.execute(
        'SELECT * FROM restaurants WHERE id = ? AND isApproved = ?',
        [restaurantId, true]
      );

      if (Array.isArray(restaurants) && restaurants.length === 0) {
        return NextResponse.json(
          { error: 'Restaurant not found or not approved' },
          { status: 404 }
        );
      }

      // Get all menu items (including out of stock for transparency)
      const [menuItems] = await pool.execute(
        'SELECT * FROM menu_items WHERE restaurantId = ? ORDER BY name',
        [restaurantId]
      );

      return NextResponse.json({
        type: 'restaurant',
        restaurant: restaurants[0],
        menuItems,
      });
    }

    // Handle order QR code via URL or legacy JSON
    if (orderIdFromUrl) {
      // Order QR code - return order details for payment
      const orderId = orderIdFromUrl;

      const [orders] = await pool.execute(
        `SELECT ro.*, r.name as restaurantName, r.bankName, r.accountNumber, r.accountName,
         u.name as customerName, u.id as customerUserId
         FROM restaurant_orders ro 
         JOIN restaurants r ON ro.restaurantId = r.id 
         LEFT JOIN users u ON ro.userId = u.id
         WHERE ro.id = ?`,
        [orderId]
      );

      if (Array.isArray(orders) && orders.length === 0) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      const order = orders[0];
      
      // Check if order is already paid
      if (order.status === 'Paid') {
        return NextResponse.json(
          { error: 'This order has already been paid' },
          { status: 400 }
        );
      }

      // Check subscription status (for informational purposes, not blocking)
      const [subscriptions] = await pool.execute(
        'SELECT * FROM customer_subscriptions WHERE userId = ? AND restaurantId = ? AND status = ? AND endDate >= CURDATE()',
        [user.id, order.restaurantId, 'Active']
      );

      const hasActiveSubscription = Array.isArray(subscriptions) && subscriptions.length > 0;
      
      // Add subscription status to order response (for UI display)
      order.hasActiveSubscription = hasActiveSubscription;

      return NextResponse.json({
        type: 'order',
        order: {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Unknown QR code type' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Scan QR error:', error);
    return NextResponse.json(
      { error: 'Failed to process QR code' },
      { status: 500 }
    );
  }
}

