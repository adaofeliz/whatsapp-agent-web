import { NextResponse } from 'next/server';
import { generateProposals, analyzeStyle } from '@/lib/ai/client';
import { getChat, getRecentMessages } from '@/lib/db/wacli';

export async function POST(request: Request) {
  try {
    const { chatJid } = await request.json();

    if (!chatJid) {
      return NextResponse.json({ error: 'Chat JID is required' }, { status: 400 });
    }

    const chat = getChat(chatJid);
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = getRecentMessages(chatJid, 50);
    const contactName = chat.name || chatJid.split('@')[0];

    const aiMessages = messages
      .map((msg) => ({
        fromMe: msg.from_me === 1,
        body: msg.text || msg.media_caption || '',
        timestamp: msg.ts,
      }))
      .reverse();

    const styleProfile = await analyzeStyle(contactName, aiMessages);

    const proposals = await generateProposals(contactName, styleProfile, aiMessages);

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('Error generating proposals:', error);
    return NextResponse.json(
      { error: 'Failed to generate proposals' },
      { status: 500 }
    );
  }
}
