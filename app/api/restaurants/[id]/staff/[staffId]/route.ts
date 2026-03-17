import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Update staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const staffId = parseInt(params.staffId);
    const body = await request.json();
    const { role, isActive, permissions } = body;

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

    // Get existing staff row to preserve unspecified fields
    const [existingRows] = await pool.execute(
      'SELECT role, isActive, canCreateOrders, canManageMenu, canViewReports FROM restaurant_staff WHERE id = ? AND restaurantId = ?',
      [staffId, restaurantId]
    );
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    const newRole = role ?? existing.role;
    const newIsActive = typeof isActive === 'boolean' ? isActive : !!existing.isActive;
    const newCanCreate = permissions?.canCreateOrders !== undefined ? !!permissions.canCreateOrders : !!existing.canCreateOrders;
    const newCanManage = permissions?.canManageMenu !== undefined ? !!permissions.canManageMenu : !!existing.canManageMenu;
    const newCanView = permissions?.canViewReports !== undefined ? !!permissions.canViewReports : !!existing.canViewReports;

    // Update staff
    await pool.execute(
      'UPDATE restaurant_staff SET role = ?, isActive = ?, canCreateOrders = ?, canManageMenu = ?, canViewReports = ? WHERE id = ? AND restaurantId = ?',
      [
        newRole,
        newIsActive,
        newCanCreate,
        newCanManage,
        newCanView,
        staffId,
        restaurantId,
      ]
    );

    return NextResponse.json({ message: 'Staff member updated successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Update staff error:', error);
    return NextResponse.json(
      { error: 'Failed to update staff member' },
      { status: 500 }
    );
  }
}

// Remove staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const staffId = parseInt(params.staffId);

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

    // Deactivate staff (soft delete)
    await pool.execute(
      'UPDATE restaurant_staff SET isActive = ? WHERE id = ? AND restaurantId = ?',
      [false, staffId, restaurantId]
    );

    return NextResponse.json({ message: 'Staff member removed successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Remove staff error:', error);
    return NextResponse.json(
      { error: 'Failed to remove staff member' },
      { status: 500 }
    );
  }
}

