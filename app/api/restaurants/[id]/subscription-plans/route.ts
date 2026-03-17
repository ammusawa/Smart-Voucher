import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    
    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE restaurantId = ? AND isActive = ? ORDER BY price ASC',
      [restaurantId, true]
    );

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const body = await request.json();
    const { name, description, price, durationDays } = body;

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

    // Create subscription plan
    const [result] = await pool.execute(
      'INSERT INTO subscription_plans (restaurantId, name, description, price, durationDays) VALUES (?, ?, ?, ?, ?)',
      [restaurantId, name, description || '', parseFloat(price), parseInt(durationDays)]
    );

    const insertResult = result as any;
    return NextResponse.json({
      message: 'Subscription plan created successfully',
      plan: {
        id: insertResult.insertId,
        restaurantId,
        name,
        description,
        price,
        durationDays,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Create subscription plan error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription plan' },
      { status: 500 }
    );
  }
}

