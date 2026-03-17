import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const subscriptionId = parseInt(params.id);

    // Get detailed subscription information
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, 
       sp.name as planName, sp.description as planDescription, sp.price as planPrice, sp.durationDays,
       r.name as restaurantName, r.location as restaurantLocation, r.phone as restaurantPhone,
       r.email as restaurantEmail, r.description as restaurantDescription,
       r.bankName, r.accountNumber, r.accountName,
       u.name as customerName, u.email as customerEmail
       FROM customer_subscriptions cs
       JOIN subscription_plans sp ON cs.planId = sp.id
       JOIN restaurants r ON cs.restaurantId = r.id
       JOIN users u ON cs.userId = u.id
       WHERE cs.id = ? AND cs.userId = ?`,
      [subscriptionId, user.id]
    );

    const subArray = subscriptions as any[];
    if (!subArray || subArray.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subscription: subArray[0] });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Review subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
}

