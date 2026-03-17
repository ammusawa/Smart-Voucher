import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, sp.name as planName, sp.description as planDescription, 
       r.name as restaurantName, r.location as restaurantLocation
       FROM customer_subscriptions cs
       JOIN subscription_plans sp ON cs.planId = sp.id
       JOIN restaurants r ON cs.restaurantId = r.id
       WHERE cs.userId = ?
       ORDER BY cs.createdAt DESC`,
      [user.id]
    );

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Get subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

