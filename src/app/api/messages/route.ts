import { NextRequest, NextResponse } from 'next/server';
import { listMessages } from '@/lib/db/wacli';
import { MessageFilter } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chatJid = searchParams.get('chatJid');
    
    if (!chatJid) {
      return NextResponse.json({ error: 'chatJid is required' }, { status: 400 });
    }

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    
    const filter: MessageFilter = {
      chatJid,
      limit,
      offset,
    };

    const messages = listMessages(filter);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
