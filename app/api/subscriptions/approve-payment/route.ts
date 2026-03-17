import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['restaurant', 'admin']);
    const body = await request.json();
    const { subscriptionId, approve } = body;

    if (!subscriptionId || typeof approve !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get subscription
    const [subscriptions] = await pool.execute(
      'SELECT cs.*, r.ownerId FROM customer_subscriptions cs JOIN restaurants r ON cs.restaurantId = r.id WHERE cs.id = ?',
      [subscriptionId]
    );

    const subArray = subscriptions as any[];
    if (!subArray || subArray.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const subscription = subArray[0];

    // Verify restaurant ownership
    if (subscription.ownerId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      if (approve) {
        // Approve payment and activate subscription
        await connection.execute(
          'UPDATE customer_subscriptions SET paymentStatus = ?, status = ?, startDate = CURDATE(), endDate = DATE_ADD(CURDATE(), INTERVAL (SELECT durationDays FROM subscription_plans WHERE id = ?) DAY) WHERE id = ?',
          ['Verified', 'Active', subscription.planId, subscriptionId]
        );

        // Credit user balance
        await connection.execute(
          'UPDATE users SET balance = balance + ? WHERE id = ?',
          [subscription.amount, subscription.userId]
        );
      } else {
        // Reject payment
        await connection.execute(
          'UPDATE customer_subscriptions SET paymentStatus = ? WHERE id = ?',
          ['Rejected', subscriptionId]
        );
      }

      await connection.commit();

      return NextResponse.json({
        message: approve 
          ? 'Payment approved and subscription activated. Balance credited.' 
          : 'Payment rejected',
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Approve payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment approval' },
      { status: 500 }
    );
  }
}

