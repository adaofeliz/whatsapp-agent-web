import { NextRequest, NextResponse } from 'next/server';
import { analyzeDropouts } from '@/lib/ai/client';
import { getRecentMessages } from '@/lib/db/wacli';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatJid = searchParams.get('chatJid');

  if (!chatJid) {
    return NextResponse.json({ error: 'chatJid is required' }, { status: 400 });
  }

  try {
    const messages = getRecentMessages(chatJid, 50);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages found for this chat' }, { status: 404 });
    }

    const aiMessages = messages.map(msg => ({
      fromMe: msg.from_me === 1,
      body: msg.text || msg.media_caption || '',
      timestamp: msg.ts
    }));

    const dropoutAnalysis = await analyzeDropouts(aiMessages);
    return NextResponse.json(dropoutAnalysis);
  } catch (error) {
    console.error('Error analyzing dropouts:', error);
    return NextResponse.json({ error: 'Failed to analyze dropouts' }, { status: 500 });
  }
}
