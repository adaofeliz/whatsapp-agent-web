import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function EmptyChatPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
      <h2 className="text-xl font-semibold mb-2">No Chat Selected</h2>
      <p className="text-sm">Select a chat from the list to start messaging</p>
    </div>
  );
}
