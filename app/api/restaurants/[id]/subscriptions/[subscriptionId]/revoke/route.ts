import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; subscriptionId: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const subscriptionId = parseInt(params.subscriptionId);

    // Verify restaurant ownership
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

    if (restaurantArray[0].ownerId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get subscription
    const [subscriptions] = await pool.execute(
      'SELECT * FROM customer_subscriptions WHERE id = ? AND restaurantId = ?',
      [subscriptionId, restaurantId]
    );

    const subArray = subscriptions as any[];
    if (!subArray || subArray.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const subscription = subArray[0];

    // Only allow revoking Active subscriptions
    if (subscription.status !== 'Active') {
      return NextResponse.json(
        { error: `Cannot revoke subscription with status: ${subscription.status}. Only Active subscriptions can be revoked.` },
        { status: 400 }
      );
    }

    // Check if subscription has already expired
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return NextResponse.json(
        { error: 'This subscription has already expired' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Revoke subscription (change status to Cancelled)
      await connection.execute(
        'UPDATE customer_subscriptions SET status = ? WHERE id = ?',
        ['Cancelled', subscriptionId]
      );

      // Note: We're not refunding the balance here as the subscription was already credited
      // The restaurant owner can decide if they want to handle refunds separately

      await connection.commit();

      return NextResponse.json({
        message: 'Subscription revoked successfully',
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Revoke subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke subscription' },
      { status: 500 }
    );
  }
}

