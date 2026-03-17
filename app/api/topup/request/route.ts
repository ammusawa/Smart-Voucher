import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['user', 'admin']);
    const body = await request.json();
    const { amount, paymentProof } = body;

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Create top-up request
    const [result] = await pool.execute(
      'INSERT INTO topup_requests (userId, amount, paymentProof, paymentStatus) VALUES (?, ?, ?, ?)',
      [user.id, parseFloat(amount), paymentProof || null, 'Pending']
    );

    const insertResult = result as any;

    return NextResponse.json({
      message: 'Top-up request submitted. Awaiting verification.',
      requestId: insertResult.insertId,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Create top-up request error:', error);
    return NextResponse.json(
      { error: 'Failed to create top-up request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(['user', 'admin', 'restaurant']);
    
    // Users can only see their own requests
    if (user.role === 'user') {
      const [requests] = await pool.execute(
        `SELECT tr.*, u.name as userName, u.email as userEmail
         FROM topup_requests tr
         JOIN users u ON tr.userId = u.id
         WHERE tr.userId = ?
         ORDER BY tr.createdAt DESC`,
        [user.id]
      );
      return NextResponse.json({ requests });
    }

    // Restaurants and admins can see all pending requests
    const [requests] = await pool.execute(
      `SELECT tr.*, u.name as userName, u.email as userEmail
       FROM topup_requests tr
       JOIN users u ON tr.userId = u.id
       ORDER BY tr.createdAt DESC`
    );

    return NextResponse.json({ requests });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Get top-up requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top-up requests' },
      { status: 500 }
    );
  }
}

