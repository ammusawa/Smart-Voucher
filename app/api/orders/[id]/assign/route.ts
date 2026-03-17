import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Assign order to staff (prepared by)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const orderId = parseInt(params.id);
    const body = await request.json();
    const { preparedBy } = body;

    // Get order details
    const [orders] = await pool.execute(
      'SELECT restaurantId FROM restaurant_orders WHERE id = ?',
      [orderId]
    );

    const orderArray = orders as any[];
    if (!orderArray || orderArray.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const restaurantId = orderArray[0].restaurantId;

    // Verify user is staff or owner
    const [restaurants] = await pool.execute(
      'SELECT ownerId FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    const restaurantArray = restaurants as any[];
    const isOwner = restaurantArray[0].ownerId === user.id;

    const [staff] = await pool.execute(
      'SELECT * FROM restaurant_staff WHERE restaurantId = ? AND userId = ? AND isActive = ?',
      [restaurantId, user.id, true]
    );

    const isStaff = Array.isArray(staff) && staff.length > 0;

    if (!isOwner && !isStaff && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update order with preparedBy
    await pool.execute(
      'UPDATE restaurant_orders SET preparedBy = ? WHERE id = ?',
      [preparedBy || user.id, orderId]
    );

    return NextResponse.json({ message: 'Order assigned successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Assign order error:', error);
    return NextResponse.json(
      { error: 'Failed to assign order' },
      { status: 500 }
    );
  }
}

