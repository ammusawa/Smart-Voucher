import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Find user with error handling for database connection issues
    let users, userArray;
    try {
      [users] = await pool.execute(
      'SELECT id, name, email, password, role, balance FROM users WHERE email = ?',
      [validatedData.email]
    );
      userArray = users as any[];
    } catch (dbError: any) {
      console.error('Database query error in /api/auth/login:', dbError);
      // Handle database connection errors
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
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    let user = userArray[0];

    // If role is missing/empty, infer from staff table and persist
    if (!user.role) {
      try {
      const [staffRows] = await pool.execute(
        'SELECT id FROM restaurant_staff WHERE userId = ? LIMIT 1',
        [user.id]
      );
      if (Array.isArray(staffRows) && staffRows.length > 0) {
        user.role = 'staff';
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', ['staff', user.id]);
      } else {
        user.role = 'user';
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', ['user', user.id]);
        }
      } catch (dbError: any) {
        // If role update fails, continue with default role
        console.error('Error updating user role:', dbError);
        user.role = user.role || 'user';
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: parseFloat(user.balance),
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Handle database connection errors
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

