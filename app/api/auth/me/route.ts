import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user details from database with retry logic for connection errors
    let users, userArray;
    try {
      [users] = await pool.execute(
      'SELECT id, name, email, role, balance FROM users WHERE id = ?',
      [user.id]
    );
      userArray = users as any[];
    } catch (dbError: any) {
      console.error('Database query error in /api/auth/me:', dbError);
      // If it's a connection error, return unauthorized to trigger re-login
      if (dbError.code === 'PROTOCOL_CONNECTION_LOST' || 
          dbError.code === 'ECONNRESET' || 
          dbError.code === 'ETIMEDOUT' ||
          dbError.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
        return NextResponse.json(
          { error: 'Database connection error. Please try again.' },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (!userArray || userArray.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let userData = userArray[0];
    // If role missing, infer from staff and persist
    if (!userData.role) {
      try {
      const [staffRows] = await pool.execute(
        'SELECT id FROM restaurant_staff WHERE userId = ? LIMIT 1',
        [userData.id]
      );
      if (Array.isArray(staffRows) && staffRows.length > 0) {
        userData.role = 'staff';
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', ['staff', userData.id]);
      } else {
        userData.role = 'user';
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', ['user', userData.id]);
        }
      } catch (dbError: any) {
        // If role update fails, continue with default role
        console.error('Error updating user role:', dbError);
        userData.role = userData.role || 'user';
      }
    }
    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        balance: parseFloat(userData.balance),
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    // Handle specific database connection errors
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

