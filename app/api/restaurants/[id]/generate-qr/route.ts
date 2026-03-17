import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateQRCode } from '@/lib/qrcode';
import { getBaseUrlFromRequest } from '@/lib/baseUrl';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);

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

    // Generate QR code with URL using request host for network URL
    const baseUrl = getBaseUrlFromRequest(request);
    const qrData = `${baseUrl}/restaurant/${restaurantId}/menu-view`;
    const qrCodeUrl = await generateQRCode(qrData);

    // Update restaurant with new QR code
    await pool.execute(
      'UPDATE restaurants SET qrCodeUrl = ? WHERE id = ?',
      [qrCodeUrl, restaurantId]
    );

    return NextResponse.json({
      message: 'QR code generated successfully',
      qrCode: qrCodeUrl,
      qrData: qrData, // Return the URL for reference
      restaurantId,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Generate QR code error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

