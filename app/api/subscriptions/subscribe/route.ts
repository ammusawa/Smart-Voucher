import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['user', 'admin']);
    const body = await request.json();
    const { planId, restaurantId } = body;

    if (!planId || !restaurantId) {
      return NextResponse.json(
        { error: 'Plan ID and Restaurant ID are required' },
        { status: 400 }
      );
    }

    // Get plan details
    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE id = ? AND restaurantId = ? AND isActive = ?',
      [planId, restaurantId, true]
    );

    const planArray = plans as any[];
    if (!planArray || planArray.length === 0) {
      return NextResponse.json(
        { error: 'Subscription plan not found or inactive' },
        { status: 404 }
      );
    }

    const plan = planArray[0];

    // Check if user already has an active subscription to this specific plan
    const [existingSubs] = await pool.execute(
      'SELECT * FROM customer_subscriptions WHERE userId = ? AND restaurantId = ? AND planId = ? AND status = ?',
      [user.id, restaurantId, planId, 'Active']
    );

    if (Array.isArray(existingSubs) && existingSubs.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active subscription to this plan' },
        { status: 400 }
      );
    }

    // Get restaurant bank details
    const [restaurants] = await pool.execute(
      'SELECT name, bankName, accountNumber, accountName FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    const restaurantArray = restaurants as any[];
    if (!restaurantArray || restaurantArray.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const restaurant = restaurantArray[0];

    if (!restaurant.bankName || !restaurant.accountNumber || !restaurant.accountName) {
      return NextResponse.json(
        { error: 'Restaurant has not set up bank account details. Please contact the restaurant.' },
        { status: 400 }
      );
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // Create subscription (pending payment)
    const [result] = await pool.execute(
      'INSERT INTO customer_subscriptions (userId, restaurantId, planId, amount, startDate, endDate, status, paymentStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, restaurantId, planId, plan.price, startDate, endDate, 'Pending', 'Pending']
    );

    const insertResult = result as any;

    return NextResponse.json({
      message: 'Subscription created. Please make payment to activate.',
      subscription: {
        id: insertResult.insertId,
        planId,
        restaurantId,
        amount: plan.price,
        durationDays: plan.durationDays,
      },
      paymentDetails: {
        bankName: restaurant.bankName,
        accountNumber: restaurant.accountNumber,
        accountName: restaurant.accountName,
        amount: plan.price,
        restaurantName: restaurant.name,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

