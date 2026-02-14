import { NextRequest, NextResponse } from 'next/server';
import { getChatStats } from '@/lib/db/wacli';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatJid = searchParams.get('chatJid');

  if (!chatJid) {
    return NextResponse.json({ error: 'chatJid is required' }, { status: 400 });
  }

  try {
    const stats = getChatStats(chatJid);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting chat stats:', error);
    return NextResponse.json({ error: 'Failed to get chat stats' }, { status: 500 });
  }
}
