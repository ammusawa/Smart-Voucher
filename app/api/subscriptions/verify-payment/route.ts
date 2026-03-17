import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['user', 'admin']);
    const body = await request.json();
    const { subscriptionId, paymentProof } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Get subscription
    const [subscriptions] = await pool.execute(
      'SELECT * FROM customer_subscriptions WHERE id = ? AND userId = ?',
      [subscriptionId, user.id]
    );

    const subArray = subscriptions as any[];
    if (!subArray || subArray.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const subscription = subArray[0];

    if (subscription.paymentStatus === 'Verified') {
      return NextResponse.json(
        { error: 'Payment already verified' },
        { status: 400 }
      );
    }

    // Update subscription with payment proof
    await pool.execute(
      'UPDATE customer_subscriptions SET paymentProof = ?, paymentStatus = ? WHERE id = ?',
      [paymentProof || null, 'Pending', subscriptionId]
    );

    return NextResponse.json({
      message: 'Payment proof submitted. Waiting for restaurant verification.',
    });
  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message === 'Unauthorized' ? 'Please log in to submit payment proof' : error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: 'Failed to submit payment proof' },
      { status: 500 }
    );
  }
}

