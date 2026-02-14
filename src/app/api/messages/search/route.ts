import { NextRequest, NextResponse } from 'next/server';
import { searchMessages } from '@/lib/db/wacli';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const results = searchMessages(query, limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json({ error: 'Failed to search messages' }, { status: 500 });
  }
}
