import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const orderId = parseInt(params.id);

    const [orders] = await pool.execute(
      `SELECT ro.*, r.name as restaurantName, r.bankName, r.accountNumber, r.accountName,
       u.name as customerName
       FROM restaurant_orders ro 
       JOIN restaurants r ON ro.restaurantId = r.id 
       LEFT JOIN users u ON ro.userId = u.id
       WHERE ro.id = ?`,
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

    return NextResponse.json({
      order: {
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

