import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateQRCode } from '@/lib/qrcode';
import { getBaseUrlFromRequest } from '@/lib/baseUrl';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { restaurantId, userId, customerName, items, totalAmount, paymentMethod } = body;

    // Verify restaurant exists
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

    // Check if user is staff member and has permission to create orders
    let createdBy = user.id;
    const [staffCheck] = await pool.execute(
      'SELECT restaurantId as staffRestaurantId, isActive, canCreateOrders FROM restaurant_staff WHERE restaurantId = ? AND userId = ? LIMIT 1',
      [restaurantId, user.id]
    );
    const staffRow = Array.isArray(staffCheck) && staffCheck.length > 0 ? (staffCheck as any[])[0] : null;
    const toBool = (v: any) => v === true || v === 1 || v === '1';
    const isStaffActive = staffRow ? toBool(staffRow.isActive) : false;
    const staffCanCreate = staffRow ? toBool(staffRow.canCreateOrders) : false;

    const isOwner = restaurantArray[0].ownerId === user.id;
    const isAdmin = (user as any).role === 'admin';

    // Check authorization: owner, admin, or active staff with permission
    if (!(isOwner || isAdmin || (isStaffActive && staffCanCreate))) {
      // If user is staff but for a different restaurant in request, try to resolve their restaurant automatically
      if ((user as any).role === 'staff' && !staffRow) {
        const [anyStaffRows] = await pool.execute(
          'SELECT restaurantId, isActive, canCreateOrders FROM restaurant_staff WHERE userId = ? AND isActive = ? LIMIT 1',
          [user.id, true]
        );
        const anyStaff = Array.isArray(anyStaffRows) && anyStaffRows.length > 0 ? (anyStaffRows as any[])[0] : null;
        if (anyStaff && toBool(anyStaff.canCreateOrders)) {
          // Override to their restaurantId
          (body as any).restaurantId = anyStaff.restaurantId;
        } else {
          return NextResponse.json(
            { error: 'Unauthorized. You do not have permission to create orders.' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Unauthorized. You do not have permission to create orders.' },
          { status: 403 }
        );
      }
    }

    // Note: Subscription check removed - customers can order without subscription
    // Subscription status will be checked at payment time with a warning message

    // Validate payment method
    const validPaymentMethods = ['digital', 'cash', 'transfer'];
    const selectedPaymentMethod = paymentMethod && validPaymentMethods.includes(paymentMethod) 
      ? paymentMethod 
      : 'digital';

    // Create order (userId and customerName can be null if customer will scan QR directly)
    // For cash/transfer, QR code is optional (only needed for digital payments)
    const [result] = await pool.execute(
      'INSERT INTO restaurant_orders (restaurantId, userId, customerName, createdBy, items, totalAmount, status, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [restaurantId, userId || null, customerName || null, createdBy, JSON.stringify(items), parseFloat(totalAmount), 'Pending', selectedPaymentMethod]
    );

    const insertResult = result as any;
    const orderId = insertResult.insertId;

    // Generate QR code only for digital payments (customers scan to pay)
    let qrCodeUrl = null;
    if (selectedPaymentMethod === 'digital') {
      const baseUrl = getBaseUrlFromRequest(request);
      const qrData = `${baseUrl}/payment/order/${orderId}`;
      qrCodeUrl = await generateQRCode(qrData);

      // Update order with QR code
      await pool.execute(
        'UPDATE restaurant_orders SET qrCode = ? WHERE id = ?',
        [qrCodeUrl, orderId]
      );
    }

    // Get order details with staff names
    const [orders] = await pool.execute(
      `SELECT ro.*, u1.name as createdByName, u2.name as preparedByName
       FROM restaurant_orders ro
       LEFT JOIN users u1 ON ro.createdBy = u1.id
       LEFT JOIN users u2 ON ro.preparedBy = u2.id
       WHERE ro.id = ?`,
      [orderId]
    );

    return NextResponse.json({
      message: 'Order created successfully',
      order: {
        ...(orders as any[])[0],
        items: typeof (orders as any[])[0].items === 'string' 
          ? JSON.parse((orders as any[])[0].items) 
          : (orders as any[])[0].items,
        qrCode: qrCodeUrl,
      },
    });
  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

