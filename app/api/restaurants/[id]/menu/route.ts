import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { menuItemSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = parseInt(params.id);

    // Get all menu items (including out of stock for menu viewing)
    const [menuItems] = await pool.execute(
      'SELECT * FROM menu_items WHERE restaurantId = ? ORDER BY name',
      [restaurantId]
    );

    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error('Get menu error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    const body = await request.json();
    const { name, price, stock, description, imageUrl } = body;

    // Validate input data
    try {
      menuItemSchema.parse({
        name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        description: description || '',
      });
    } catch (validationError: any) {
      if (validationError.errors && validationError.errors.length > 0) {
        const errorMessage = validationError.errors[0].message;
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid input data. Price must be positive and stock must be non-negative.' },
        { status: 400 }
      );
    }

    const validatedPrice = parseFloat(price);
    const validatedStock = parseInt(stock) || 0;

    // Additional validation: ensure price is positive
    if (validatedPrice <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than zero.' },
        { status: 400 }
      );
    }

    // Additional validation: ensure stock is non-negative
    if (validatedStock < 0) {
      return NextResponse.json(
        { error: 'Stock cannot be negative.' },
        { status: 400 }
      );
    }

    // Validate restaurant ownership (you can add this check)
    const [result] = await pool.execute(
      'INSERT INTO menu_items (restaurantId, name, price, stock, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?)',
      [restaurantId, name, validatedPrice, validatedStock, description || '', imageUrl || null]
    );

    const insertResult = result as any;
    return NextResponse.json({
      message: 'Menu item added successfully',
      menuItem: {
        id: insertResult.insertId,
        restaurantId,
        name,
        price: validatedPrice,
        stock: validatedStock,
        description,
        imageUrl: imageUrl || null,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Add menu item error:', error);
    return NextResponse.json(
      { error: 'Failed to add menu item' },
      { status: 500 }
    );
  }
}

