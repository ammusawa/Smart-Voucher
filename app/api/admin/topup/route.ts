import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { topUpSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['admin']);
    const body = await request.json();
    const validatedData = topUpSchema.parse(body);

    const userId = validatedData.userId || admin.id; // Admin can top up any user or themselves

    // Get current balance
    const [users] = await pool.execute(
      'SELECT balance FROM users WHERE id = ?',
      [userId]
    );

    const userArray = users as any[];
    if (!userArray || userArray.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update balance
    await pool.execute(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [validatedData.amount, userId]
    );

    // Get new balance
    const [updatedUsers] = await pool.execute(
      'SELECT balance FROM users WHERE id = ?',
      [userId]
    );

    const updatedUserArray = updatedUsers as any[];
    const newBalance = parseFloat(updatedUserArray[0].balance);

    return NextResponse.json({
      message: 'Balance topped up successfully',
      newBalance,
    });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Top-up error:', error);
    return NextResponse.json(
      { error: 'Failed to top up balance' },
      { status: 500 }
    );
  }
}

