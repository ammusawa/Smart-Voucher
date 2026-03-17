import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const user = await requireRole(['admin', 'restaurant']);
    const requestId = parseInt(params.requestId);
    const body = await request.json();
    const { approve, notes } = body;

    // Get top-up request
    const [requests] = await pool.execute(
      'SELECT * FROM topup_requests WHERE id = ?',
      [requestId]
    );

    const requestArray = requests as any[];
    if (!requestArray || requestArray.length === 0) {
      return NextResponse.json(
        { error: 'Top-up request not found' },
        { status: 404 }
      );
    }

    const topupRequest = requestArray[0];

    if (topupRequest.paymentStatus !== 'Pending') {
      return NextResponse.json(
        { error: `Top-up request has already been ${topupRequest.paymentStatus.toLowerCase()}` },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      if (approve) {
        // Approve and credit balance
        await connection.execute(
          'UPDATE topup_requests SET paymentStatus = ?, verifiedBy = ?, notes = ?, updatedAt = NOW() WHERE id = ?',
          ['Verified', user.id, notes || null, requestId]
        );

        // Credit user balance
        await connection.execute(
          'UPDATE users SET balance = balance + ? WHERE id = ?',
          [topupRequest.amount, topupRequest.userId]
        );
      } else {
        // Reject
        await connection.execute(
          'UPDATE topup_requests SET paymentStatus = ?, verifiedBy = ?, notes = ?, updatedAt = NOW() WHERE id = ?',
          ['Rejected', user.id, notes || null, requestId]
        );
      }

      await connection.commit();

      return NextResponse.json({
        message: approve 
          ? 'Top-up request approved and balance credited.' 
          : 'Top-up request rejected',
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Approve top-up error:', error);
    return NextResponse.json(
      { error: 'Failed to process top-up request' },
      { status: 500 }
    );
  }
}

