import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = parseInt(params.id);

    // Allow public access (no authentication required for menu viewing)
    const [restaurants] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ? AND isApproved = ?',
      [restaurantId, true]
    );

    const restaurantArray = restaurants as any[];
    if (!restaurantArray || restaurantArray.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found or not approved' },
        { status: 404 }
      );
    }

    return NextResponse.json({ restaurant: restaurantArray[0] });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant' },
      { status: 500 }
    );
  }
}

