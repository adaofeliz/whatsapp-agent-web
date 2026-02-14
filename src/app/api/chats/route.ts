import { NextRequest, NextResponse } from 'next/server';
import { listChats } from '@/lib/db/wacli';
import { ChatFilter } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const searchQuery = searchParams.get('q') || undefined;
    const kind = searchParams.get('kind') as any || undefined;

    const filter: ChatFilter = {
      limit,
      offset,
      searchQuery,
      kind,
    };

    const chats = listChats(filter);

    return NextResponse.json(
      { chats },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}
