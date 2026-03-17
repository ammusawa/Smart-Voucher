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

    // Only allow reactivating Cancelled subscriptions
    if (subscription.status !== 'Cancelled') {
      return NextResponse.json(
        { error: `Cannot reactivate subscription with status: ${subscription.status}. Only Cancelled subscriptions can be reactivated.` },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Calculate remaining days if subscription hasn't expired
      let newEndDate = subscription.endDate;
      if (subscription.endDate && new Date(subscription.endDate) > new Date()) {
        // Subscription hasn't expired, keep original end date
        newEndDate = subscription.endDate;
      } else if (subscription.endDate) {
        // Subscription has expired, extend from today
        const originalDuration = Math.ceil(
          (new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const newEndDateObj = new Date();
        newEndDateObj.setDate(newEndDateObj.getDate() + originalDuration);
        newEndDate = newEndDateObj.toISOString().split('T')[0];
      }

      // Reactivate subscription (change status to Active)
      await connection.execute(
        `UPDATE customer_subscriptions 
         SET status = ?, startDate = CURDATE(), endDate = ?, updatedAt = NOW()
         WHERE id = ?`,
        ['Active', newEndDate, subscriptionId]
      );

      await connection.commit();

      return NextResponse.json({
        message: 'Subscription reactivated successfully',
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

    console.error('Reactivate subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}

