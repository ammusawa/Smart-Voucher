import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { restaurantRegisterSchema } from '@/lib/validations';
import { generateQRCode } from '@/lib/qrcode';
import { getBaseUrlFromRequest } from '@/lib/baseUrl';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['restaurant', 'admin']);
    const body = await request.json();
    const validatedData = restaurantRegisterSchema.parse(body);

    // Check if restaurant already exists for this owner
    const [existingRestaurants] = await pool.execute(
      'SELECT id FROM restaurants WHERE ownerId = ? AND name = ?',
      [user.id, validatedData.name]
    );

    if (Array.isArray(existingRestaurants) && existingRestaurants.length > 0) {
      return NextResponse.json(
        { error: 'Restaurant with this name already exists' },
        { status: 400 }
      );
    }

    // Create restaurant (auto-approved if admin, otherwise pending)
    const isApproved = user.role === 'admin';
    
    // Create restaurant first without QR code (we'll add it after we have the ID)
    const [result] = await pool.execute(
      'INSERT INTO restaurants (ownerId, name, location, isApproved) VALUES (?, ?, ?, ?)',
      [user.id, validatedData.name, validatedData.location, isApproved]
    );

    const insertResult = result as any;
    const restaurantId = insertResult.insertId;

    // Generate QR code with restaurant ID (now that we have it), using request host for network URL
    const baseUrl = getBaseUrlFromRequest(request);
    const qrData = `${baseUrl}/restaurant/${restaurantId}/menu-view`;
    const qrCodeUrl = await generateQRCode(qrData);

    // Update restaurant with QR code
    await pool.execute(
      'UPDATE restaurants SET qrCodeUrl = ? WHERE id = ?',
      [qrCodeUrl, restaurantId]
    );

    // Get the created restaurant
    const [restaurants] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    return NextResponse.json({
      message: isApproved ? 'Restaurant registered and approved' : 'Restaurant registered, pending approval',
      restaurant: {
        id: restaurantId,
        ...validatedData,
        isApproved,
        qrCodeUrl,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Restaurant registration error:', error);
    return NextResponse.json(
      { error: 'Restaurant registration failed' },
      { status: 500 }
    );
  }
}

