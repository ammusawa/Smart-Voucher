import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { generateQRCode } from '@/lib/qrcode';
import { getBaseUrlFromRequest } from '@/lib/baseUrl';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['restaurant', 'admin']);
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order details
    const [orders] = await pool.execute(
      'SELECT * FROM restaurant_orders WHERE id = ?',
      [orderId]
    );

    const orderArray = orders as any[];
    if (!orderArray || orderArray.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderArray[0];

    // Verify restaurant ownership
    if (user.role !== 'admin') {
      const [restaurants] = await pool.execute(
        'SELECT id FROM restaurants WHERE id = ? AND ownerId = ?',
        [order.restaurantId, user.id]
      );

      if (Array.isArray(restaurants) && restaurants.length === 0) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    // Generate QR code using request host for network URL
    const baseUrl = getBaseUrlFromRequest(request);
    const qrData = `${baseUrl}/payment/order/${orderId}`;
    const qrCodeUrl = await generateQRCode(qrData);

    // Update order with QR code
    await pool.execute(
      'UPDATE restaurant_orders SET qrCode = ? WHERE id = ?',
      [qrCodeUrl, orderId]
    );

    return NextResponse.json({
      message: 'QR code generated successfully',
      qrCode: qrCodeUrl,
      orderId,
    });
  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Generate QR code error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

