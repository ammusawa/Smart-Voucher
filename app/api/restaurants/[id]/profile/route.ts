import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    
    const [restaurants] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    const restaurantArray = restaurants as any[];
    if (!restaurantArray || restaurantArray.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ restaurant: restaurantArray[0] });
  } catch (error) {
    console.error('Get restaurant profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const body = await request.json();

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

    // Only owner or admin can update
    if (restaurantArray[0].ownerId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const {
      name,
      location,
      description,
      phone,
      email,
      address,
      openingHours,
      website,
      bankName,
      accountNumber,
      accountName,
    } = body;

    // Update restaurant profile
    await pool.execute(
      `UPDATE restaurants SET 
        name = ?, 
        location = ?, 
        description = ?, 
        phone = ?, 
        email = ?, 
        address = ?, 
        openingHours = ?, 
        website = ?,
        bankName = ?,
        accountNumber = ?,
        accountName = ?
      WHERE id = ?`,
      [
        name,
        location,
        description || null,
        phone || null,
        email || null,
        address || null,
        openingHours || null,
        website || null,
        bankName || null,
        accountNumber || null,
        accountName || null,
        restaurantId,
      ]
    );

    // Get updated restaurant
    const [updatedRestaurants] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    return NextResponse.json({
      message: 'Profile updated successfully',
      restaurant: (updatedRestaurants as any[])[0],
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Update restaurant profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

