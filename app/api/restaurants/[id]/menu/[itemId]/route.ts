import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { menuItemSchema } from '@/lib/validations';

// GET - View single menu item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    const itemId = parseInt(params.itemId);

    const [menuItems] = await pool.execute(
      'SELECT * FROM menu_items WHERE id = ? AND restaurantId = ?',
      [itemId, restaurantId]
    );

    const menuArray = menuItems as any[];
    if (!menuArray || menuArray.length === 0) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ menuItem: menuArray[0] });
  } catch (error) {
    console.error('Get menu item error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu item' },
      { status: 500 }
    );
  }
}

// PUT - Update menu item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const itemId = parseInt(params.itemId);
    const body = await request.json();
    const { name, price, stock, description, imageUrl } = body;

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

    const isOwner = restaurantArray[0].ownerId === user.id;
    const isAdmin = user.role === 'admin';

    // Check if user is staff member with menu management permission
    let canManageMenu = false;
    if (!isOwner && !isAdmin) {
      const [staffCheck] = await pool.execute(
        'SELECT canManageMenu FROM restaurant_staff WHERE restaurantId = ? AND userId = ? LIMIT 1',
        [restaurantId, user.id]
      );
      const staffRow = Array.isArray(staffCheck) && staffCheck.length > 0 ? (staffCheck as any[])[0] : null;
      const toBool = (v: any) => v === true || v === 1 || v === '1';
      canManageMenu = staffRow ? toBool(staffRow.canManageMenu) : false;
    }

    if (!isOwner && !isAdmin && !canManageMenu) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not have permission to edit menu items.' },
        { status: 403 }
      );
    }

    // Verify menu item exists and belongs to restaurant
    const [existingItems] = await pool.execute(
      'SELECT id FROM menu_items WHERE id = ? AND restaurantId = ?',
      [itemId, restaurantId]
    );

    if (Array.isArray(existingItems) && existingItems.length === 0) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

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

    // Update menu item
    await pool.execute(
      'UPDATE menu_items SET name = ?, price = ?, stock = ?, description = ?, imageUrl = ? WHERE id = ? AND restaurantId = ?',
      [name, validatedPrice, validatedStock, description || '', imageUrl || null, itemId, restaurantId]
    );

    // Get updated item
    const [updatedItems] = await pool.execute(
      'SELECT * FROM menu_items WHERE id = ? AND restaurantId = ?',
      [itemId, restaurantId]
    );

    return NextResponse.json({
      message: 'Menu item updated successfully',
      menuItem: (updatedItems as any[])[0],
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Update menu item error:', error);
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const user = await requireAuth();
    const restaurantId = parseInt(params.id);
    const itemId = parseInt(params.itemId);

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

    const isOwner = restaurantArray[0].ownerId === user.id;
    const isAdmin = user.role === 'admin';

    // Check if user is staff member with menu management permission
    let canManageMenu = false;
    if (!isOwner && !isAdmin) {
      const [staffCheck] = await pool.execute(
        'SELECT canManageMenu FROM restaurant_staff WHERE restaurantId = ? AND userId = ? LIMIT 1',
        [restaurantId, user.id]
      );
      const staffRow = Array.isArray(staffCheck) && staffCheck.length > 0 ? (staffCheck as any[])[0] : null;
      const toBool = (v: any) => v === true || v === 1 || v === '1';
      canManageMenu = staffRow ? toBool(staffRow.canManageMenu) : false;
    }

    if (!isOwner && !isAdmin && !canManageMenu) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not have permission to delete menu items.' },
        { status: 403 }
      );
    }

    // Verify menu item exists and belongs to restaurant
    const [existingItems] = await pool.execute(
      'SELECT id FROM menu_items WHERE id = ? AND restaurantId = ?',
      [itemId, restaurantId]
    );

    if (Array.isArray(existingItems) && existingItems.length === 0) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Delete menu item
    await pool.execute(
      'DELETE FROM menu_items WHERE id = ? AND restaurantId = ?',
      [itemId, restaurantId]
    );

    return NextResponse.json({
      message: 'Menu item deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Delete menu item error:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}

