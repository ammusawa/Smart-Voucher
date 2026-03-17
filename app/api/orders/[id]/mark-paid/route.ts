import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const orderId = parseInt(params.id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Get order details
    const [orders] = await pool.execute(
      'SELECT * FROM restaurant_orders WHERE id = ?',
      [orderId]
    );

    const orderArray = orders as any[];
    if (!orderArray || orderArray.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderArray[0];

    // Check if order is already paid
    if (order.status === 'Paid' || order.status === 'Completed') {
      return NextResponse.json(
        { error: 'Order is already paid' },
        { status: 400 }
      );
    }

    // Verify restaurant ownership or admin access
    const [restaurants] = await pool.execute(
      'SELECT ownerId FROM restaurants WHERE id = ?',
      [order.restaurantId]
    );

    const restaurantArray = restaurants as any[];
    if (!restaurantArray || restaurantArray.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const isOwner = restaurantArray[0].ownerId === user.id;
    const isAdmin = (user as any).role === 'admin';

    // Check if user is staff member
    let isStaff = false;
    if (!isOwner && !isAdmin) {
      const [staffCheck] = await pool.execute(
        'SELECT isActive FROM restaurant_staff WHERE restaurantId = ? AND userId = ? LIMIT 1',
        [order.restaurantId, user.id]
      );
      const staffRow = Array.isArray(staffCheck) && staffCheck.length > 0 ? (staffCheck as any[])[0] : null;
      const toBool = (v: any) => v === true || v === 1 || v === '1';
      isStaff = staffRow ? toBool(staffRow.isActive) : false;
    }

    if (!isOwner && !isAdmin && !isStaff) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not have permission to mark this order as paid.' },
        { status: 403 }
      );
    }

    // Only allow marking cash/transfer orders as paid (digital orders are paid via the payment API)
    if (order.paymentMethod === 'digital') {
      return NextResponse.json(
        { error: 'Digital payments must be processed through the payment system' },
        { status: 400 }
      );
    }

    // Update order status to Paid
    await pool.execute(
      'UPDATE restaurant_orders SET status = ? WHERE id = ?',
      ['Paid', orderId]
    );

    // Update stock for menu items
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    for (const item of items) {
      if (item.menuItemId) {
        await pool.execute(
          'UPDATE menu_items SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.menuItemId]
        );
      }
    }

    // Get updated order details
    const [updatedOrders] = await pool.execute(
      `SELECT ro.*, u1.name as createdByName, u2.name as preparedByName
       FROM restaurant_orders ro
       LEFT JOIN users u1 ON ro.createdBy = u1.id
       LEFT JOIN users u2 ON ro.preparedBy = u2.id
       WHERE ro.id = ?`,
      [orderId]
    );

    return NextResponse.json({
      message: 'Order marked as paid successfully',
      order: {
        ...(updatedOrders as any[])[0],
        items: typeof (updatedOrders as any[])[0].items === 'string' 
          ? JSON.parse((updatedOrders as any[])[0].items) 
          : (updatedOrders as any[])[0].items,
      },
    });
  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Mark paid error:', error);
    return NextResponse.json(
      { error: 'Failed to mark order as paid' },
      { status: 500 }
    );
  }
}

