import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function assertOwnership(userId: number, restaurantId: number, role: string) {
  const [restaurants] = await pool.execute(
    'SELECT ownerId FROM restaurants WHERE id = ?',
    [restaurantId]
  );

  const rows = restaurants as Array<{ ownerId: number }>;
  if (rows.length === 0) {
    throw new Error('NOT_FOUND');
  }

  if (rows[0].ownerId !== userId && role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id, 10);
    const planId = parseInt(params.planId, 10);
    const { name, description, price, durationDays } = await request.json();

    await assertOwnership(user.id, restaurantId, user.role);

    const [result] = await pool.execute(
      `UPDATE subscription_plans
       SET name = ?, description = ?, price = ?, durationDays = ?, updatedAt = NOW()
       WHERE id = ? AND restaurantId = ?`,
      [name, description || '', parseFloat(price), parseInt(durationDays, 10), planId, restaurantId]
    );

    const updateResult = result as { affectedRows: number };
    if (!updateResult.affectedRows) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Subscription plan updated successfully',
      plan: { id: planId, name, description, price, durationDays },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    console.error('Update subscription plan error:', error);
    return NextResponse.json({ error: 'Failed to update subscription plan' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id, 10);
    const planId = parseInt(params.planId, 10);

    await assertOwnership(user.id, restaurantId, user.role);

    const [result] = await pool.execute(
      `UPDATE subscription_plans
       SET isActive = ?, updatedAt = NOW()
       WHERE id = ? AND restaurantId = ?`,
      [false, planId, restaurantId]
    );

    const updateResult = result as { affectedRows: number };
    if (!updateResult.affectedRows) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subscription plan deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    console.error('Delete subscription plan error:', error);
    return NextResponse.json({ error: 'Failed to delete subscription plan' }, { status: 500 });
  }
}


