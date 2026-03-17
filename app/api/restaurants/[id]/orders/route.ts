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

    // Check if user is owner or staff
    const [staff] = await pool.execute(
      'SELECT * FROM restaurant_staff WHERE restaurantId = ? AND userId = ? AND isActive = ?',
      [restaurantId, user.id, true]
    );

    const isOwner = restaurantArray[0].ownerId === user.id;
    const isStaff = Array.isArray(staff) && staff.length > 0;

    if (!isOwner && !isStaff && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get orders with staff information
    const [orders] = await pool.execute(
      `SELECT ro.*, 
       u1.name as customerName,
       u2.name as createdByName,
       u3.name as preparedByName
       FROM restaurant_orders ro
       LEFT JOIN users u1 ON ro.userId = u1.id
       LEFT JOIN users u2 ON ro.createdBy = u2.id
       LEFT JOIN users u3 ON ro.preparedBy = u3.id
       WHERE ro.restaurantId = ?
       ORDER BY ro.timestamp DESC`,
      [restaurantId]
    );

    return NextResponse.json({ orders });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

