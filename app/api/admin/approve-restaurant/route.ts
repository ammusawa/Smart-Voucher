import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['admin']);
    const body = await request.json();
    const { restaurantId, approve } = body;

    if (typeof restaurantId !== 'number' || typeof approve !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    await pool.execute(
      'UPDATE restaurants SET isApproved = ? WHERE id = ?',
      [approve, restaurantId]
    );

    return NextResponse.json({
      message: approve ? 'Restaurant approved' : 'Restaurant approval revoked',
    });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.error('Approve restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to update restaurant approval' },
      { status: 500 }
    );
  }
}

