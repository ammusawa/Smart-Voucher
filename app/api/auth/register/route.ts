import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Ensure role has a default value
    const dataWithDefaults = {
      ...body,
      role: body.role || 'user',
    };
    const validatedData = registerSchema.parse(dataWithDefaults);

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [validatedData.email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role, balance) VALUES (?, ?, ?, ?, ?)',
      [validatedData.name, validatedData.email, hashedPassword, validatedData.role, 0.00]
    );

    const insertResult = result as any;
    const userId = insertResult.insertId;

    // Generate token
    const token = generateToken({
      id: userId,
      email: validatedData.email,
      role: validatedData.role,
    });

    const response = NextResponse.json({
      message: 'Registration successful',
      user: {
        id: userId,
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((err: any) => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return NextResponse.json(
        { error: 'Validation error', message: errorMessages, details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

