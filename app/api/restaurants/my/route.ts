import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Return the restaurant for the current user either as owner or staff
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Find a restaurant where the user is the owner OR active staff
    const [rows] = await pool.execute(
      `SELECT r.*
       FROM restaurants r
       LEFT JOIN restaurant_staff s 
         ON s.restaurantId = r.id AND s.userId = ? AND s.isActive = ?
       WHERE r.ownerId = ? OR s.userId = ?
       ORDER BY r.createdAt DESC
       LIMIT 1`,
      [user.id, true, user.id, user.id]
    );

    const arr = rows as any[];
    if (!arr || arr.length === 0) {
      return NextResponse.json({ restaurant: null });
    }

    return NextResponse.json({ restaurant: arr[0] });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Get my restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant' },
      { status: 500 }
    );
  }
}


