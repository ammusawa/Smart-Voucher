import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let query = '';
    let params: any[] = [];

    if (user.role === 'admin') {
      // Admin can see all transactions
      if (restaurantId) {
        query = 'SELECT t.*, u.name as userName, r.name as restaurantName FROM transactions t JOIN users u ON t.userId = u.id JOIN restaurants r ON t.restaurantId = r.id WHERE t.restaurantId = ? ORDER BY t.timestamp DESC LIMIT ?';
        params = [restaurantId, limit];
      } else {
        query = 'SELECT t.*, u.name as userName, r.name as restaurantName FROM transactions t JOIN users u ON t.userId = u.id JOIN restaurants r ON t.restaurantId = r.id ORDER BY t.timestamp DESC LIMIT ?';
        params = [limit];
      }
    } else if (user.role === 'restaurant') {
      // Restaurant can see their own transactions
      const [restaurants] = await pool.execute(
        'SELECT id FROM restaurants WHERE ownerId = ?',
        [user.id]
      );
      const restaurantIds = (restaurants as any[]).map(r => r.id);
      
      if (restaurantIds.length === 0) {
        return NextResponse.json({ transactions: [] });
      }

      if (restaurantIds.length === 1) {
        query = 'SELECT t.*, u.name as userName, r.name as restaurantName FROM transactions t JOIN users u ON t.userId = u.id JOIN restaurants r ON t.restaurantId = r.id WHERE t.restaurantId = ? ORDER BY t.timestamp DESC LIMIT ?';
        params = [restaurantIds[0], limit];
      } else {
        const placeholders = restaurantIds.map(() => '?').join(',');
        query = `SELECT t.*, u.name as userName, r.name as restaurantName FROM transactions t JOIN users u ON t.userId = u.id JOIN restaurants r ON t.restaurantId = r.id WHERE t.restaurantId IN (${placeholders}) ORDER BY t.timestamp DESC LIMIT ?`;
        params = [...restaurantIds, limit];
      }
    } else {
      // User can see their own transactions
      query = 'SELECT t.*, u.name as userName, r.name as restaurantName FROM transactions t JOIN users u ON t.userId = u.id JOIN restaurants r ON t.restaurantId = r.id WHERE t.userId = ? ORDER BY t.timestamp DESC LIMIT ?';
      params = [user.id, limit];
    }

    const [transactions] = await pool.execute(query, params);

    return NextResponse.json({ transactions });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

