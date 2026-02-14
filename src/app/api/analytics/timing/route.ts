import { NextRequest, NextResponse } from 'next/server';
import { analyzeTimingPatterns } from '@/lib/ai/client';
import { getRecentMessages, getMessagesByHour } from '@/lib/db/wacli';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatJid = searchParams.get('chatJid');

  if (!chatJid) {
    return NextResponse.json({ error: 'chatJid is required' }, { status: 400 });
  }

  try {
    const messages = getRecentMessages(chatJid, 100);
    const hourlyStats = getMessagesByHour(chatJid);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages found for this chat' }, { status: 404 });
    }

    const aiMessages = messages.map(msg => ({
      fromMe: msg.from_me === 1,
      body: msg.text || msg.media_caption || '',
      timestamp: msg.ts
    }));

    const timingAnalysis = await analyzeTimingPatterns(aiMessages);

    return NextResponse.json({
      analysis: timingAnalysis,
      hourlyStats: hourlyStats,
    });
  } catch (error) {
    console.error('Error analyzing timing:', error);
    return NextResponse.json({ error: 'Failed to analyze timing' }, { status: 500 });
  }
}
