import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const approvedOnly = searchParams.get('approved') === 'true';

    let query = 'SELECT r.*, u.name as ownerName FROM restaurants r JOIN users u ON r.ownerId = u.id';
    const params: any[] = [];

    if (approvedOnly) {
      query += ' WHERE r.isApproved = ?';
      params.push(true);
    }

    query += ' ORDER BY r.createdAt DESC';

    const [restaurants] = await pool.execute(query, params);

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error('Get restaurants error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}

