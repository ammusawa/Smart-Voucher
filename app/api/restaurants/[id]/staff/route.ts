import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Get all staff for a restaurant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);

    // Verify restaurant ownership or staff membership
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

    // Check if user is owner or staff
    const [staff] = await pool.execute(
      'SELECT * FROM restaurant_staff WHERE restaurantId = ? AND userId = ? AND isActive = ?',
      [restaurantId, user.id, true]
    );

    const isOwner = restaurantArray[0].ownerId === user.id;
    const isStaff = Array.isArray(staff) && staff.length > 0;

    if (!isOwner && !isStaff && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all staff
    const [staffList] = await pool.execute(
      `SELECT rs.*, u.name, u.email, u.role as userRole
       FROM restaurant_staff rs
       JOIN users u ON rs.userId = u.id
       WHERE rs.restaurantId = ?
       ORDER BY rs.createdAt DESC`,
      [restaurantId]
    );

    return NextResponse.json({ staff: staffList });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

// Add staff member
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const body = await request.json();
    const { email, password, name, role, permissions } = body;

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
        { error: 'Unauthorized. Only restaurant owner can add staff.' },
        { status: 403 }
      );
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    let staffUserId: number;

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      // User exists, check if already staff
      staffUserId = existingUsers[0].id;
      // Ensure account role reflects staff (unless admin/restaurant)
      const [urows] = await pool.execute('SELECT role FROM users WHERE id = ?', [staffUserId]);
      const currentRole = (urows as any[])[0]?.role || 'user';
      if (currentRole !== 'admin' && currentRole !== 'restaurant' && currentRole !== 'staff') {
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', ['staff', staffUserId]);
      }
      const [existingStaff] = await pool.execute(
        'SELECT id FROM restaurant_staff WHERE restaurantId = ? AND userId = ?',
        [restaurantId, staffUserId]
      );

      if (Array.isArray(existingStaff) && existingStaff.length > 0) {
        return NextResponse.json(
          { error: 'User is already a staff member' },
          { status: 400 }
        );
      }
    } else {
      // Create new user account for staff
      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await pool.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'staff']
      );

      const userInsert = userResult as any;
      staffUserId = userInsert.insertId;
    }

    // Add staff to restaurant
    const [staffResult] = await pool.execute(
      'INSERT INTO restaurant_staff (restaurantId, userId, role, canCreateOrders, canManageMenu, canViewReports) VALUES (?, ?, ?, ?, ?, ?)',
      [
        restaurantId,
        staffUserId,
        role || 'staff',
        permissions?.canCreateOrders !== false,
        permissions?.canManageMenu || false,
        permissions?.canViewReports || false,
      ]
    );

    const staffInsert = staffResult as any;

    return NextResponse.json({
      message: 'Staff member added successfully',
      staffId: staffInsert.insertId,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Add staff error:', error);
    return NextResponse.json(
      { error: 'Failed to add staff member' },
      { status: 500 }
    );
  }
}

