import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { paymentSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['user', 'admin']);
    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // If paying for a specific order, validate it first
      let targetOrderId: number | null = null;
      if (validatedData.orderId) {
        const [orders] = await connection.execute(
          'SELECT * FROM restaurant_orders WHERE id = ?',
          [validatedData.orderId]
        );
        const orderArray = orders as any[];
        if (!orderArray || orderArray.length === 0) {
          await connection.rollback();
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }
        const order = orderArray[0];
        if (order.status === 'Paid' || order.status === 'Completed') {
          await connection.rollback();
          return NextResponse.json(
            { error: 'Order already processed' },
            { status: 400 }
          );
        }
        if (order.restaurantId !== validatedData.restaurantId) {
          await connection.rollback();
          return NextResponse.json(
            { error: 'Order does not belong to this restaurant' },
            { status: 400 }
          );
        }
        targetOrderId = order.id;
      }

      // Check user balance
      const [users] = await connection.execute(
        'SELECT balance FROM users WHERE id = ?',
        [user.id]
      );

      const userArray = users as any[];
      if (!userArray || userArray.length === 0) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(userArray[0].balance);
      if (currentBalance < validatedData.totalAmount) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }

      // Verify restaurant exists and is approved
      const [restaurants] = await connection.execute(
        'SELECT id FROM restaurants WHERE id = ? AND isApproved = ?',
        [validatedData.restaurantId, true]
      );

      if (Array.isArray(restaurants) && restaurants.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Restaurant not found or not approved' },
          { status: 404 }
        );
      }

      // Verify menu items and stock
      for (const item of validatedData.items) {
        const [menuItems] = await connection.execute(
          'SELECT stock FROM menu_items WHERE id = ? AND restaurantId = ?',
          [item.menuItemId, validatedData.restaurantId]
        );

        const menuArray = menuItems as any[];
        if (!menuArray || menuArray.length === 0) {
          await connection.rollback();
          return NextResponse.json(
            { error: `Menu item ${item.menuItemId} not found` },
            { status: 404 }
          );
        }

        if (menuArray[0].stock < item.quantity) {
          await connection.rollback();
          return NextResponse.json(
            { error: `Insufficient stock for ${item.name}` },
            { status: 400 }
          );
        }
      }

      // Deduct balance
      await connection.execute(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [validatedData.totalAmount, user.id]
      );

      // Update stock
      for (const item of validatedData.items) {
        await connection.execute(
          'UPDATE menu_items SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.menuItemId]
        );
      }

      // Create transaction record
      const [transactionResult] = await connection.execute(
        'INSERT INTO transactions (userId, restaurantId, totalAmount, items) VALUES (?, ?, ?, ?)',
        [user.id, validatedData.restaurantId, validatedData.totalAmount, JSON.stringify(validatedData.items)]
      );

      const transactionInsert = transactionResult as any;
      const transactionId = transactionInsert.insertId;

      // Update targeted order, or fallback to user's latest pending order, else create new
      if (targetOrderId) {
        // Update the specific QR order: attach userId, link transaction, set Paid
        await connection.execute(
          'UPDATE restaurant_orders SET userId = ?, transactionId = ?, status = ? WHERE id = ?',
          [user.id, transactionId, 'Paid', targetOrderId]
        );
      } else {
        // Check if there's a pending order for this user and restaurant
        const [existingOrders] = await connection.execute(
          'SELECT id FROM restaurant_orders WHERE userId = ? AND restaurantId = ? AND status = ? ORDER BY timestamp DESC LIMIT 1',
          [user.id, validatedData.restaurantId, 'Pending']
        );
        if (Array.isArray(existingOrders) && existingOrders.length > 0) {
          await connection.execute(
            'UPDATE restaurant_orders SET transactionId = ?, status = ? WHERE id = ?',
            [transactionId, 'Paid', existingOrders[0].id]
          );
          targetOrderId = existingOrders[0].id;
        } else {
          // Create new order record
          const [newOrderRes] = await connection.execute(
            'INSERT INTO restaurant_orders (transactionId, restaurantId, userId, status, items, totalAmount) VALUES (?, ?, ?, ?, ?, ?)',
            [transactionId, validatedData.restaurantId, user.id, 'Paid', JSON.stringify(validatedData.items), validatedData.totalAmount]
          );
          const inserted: any = newOrderRes;
          targetOrderId = inserted.insertId;
        }
      }

      await connection.commit();

      return NextResponse.json({
        message: 'Payment successful',
        transactionId,
        newBalance: currentBalance - validatedData.totalAmount,
        orderId: targetOrderId,
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

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment failed' },
      { status: 500 }
    );
  }
}

