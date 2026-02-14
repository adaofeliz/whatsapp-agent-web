import { NextRequest, NextResponse } from 'next/server';
import { getMessageFrequency } from '@/lib/db/wacli';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatJid = searchParams.get('chatJid');
  const days = searchParams.get('days') ? parseInt(searchParams.get('days') as string) : 30;

  if (!chatJid) {
    return NextResponse.json({ error: 'chatJid is required' }, { status: 400 });
  }

  try {
    const frequency = getMessageFrequency(chatJid, days);
    return NextResponse.json(frequency);
  } catch (error) {
    console.error('Error getting message frequency:', error);
    return NextResponse.json({ error: 'Failed to get message frequency' }, { status: 500 });
  }
}
