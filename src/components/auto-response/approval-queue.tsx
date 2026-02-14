'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Clock, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { usePolling } from '@/hooks/use-polling';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ApprovalQueueItem {
  id: number;
  chat_jid: string;
  trigger_message_id: string;
  proposed_response: string;
  style_profile_id: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  message: {
    text: string | null;
    media_caption: string | null;
    ts: number;
  } | null;
  contact: {
    push_name: string | null;
    full_name: string | null;
    phone: string | null;
  } | null;
}

export function ApprovalQueue() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/auto-response/queue?status=pending');
      if (!res.ok) throw new Error('Failed to fetch queue');
      const data = await res.json();
      setItems(data.items);
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  usePolling(fetchQueue, 10000);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !window.confirm('Are you sure you want to reject this proposal?')) {
      return;
    }

    try {
      const body: any = { id, action };
      if (action === 'approve' && editingId === id) {
        body.editedText = editText;
      }

      const res = await fetch('/api/auto-response/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to process action');

      toast.success(action === 'approve' ? 'Response sent' : 'Response rejected');
      setEditingId(null);
      setEditText('');
      fetchQueue();
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Failed to process action');
    }
  };

  const startEditing = (item: ApprovalQueueItem) => {
    setEditingId(item.id);
    setEditText(item.proposed_response);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  if (loading && items.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">Loading queue...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg bg-muted/10">
        <Check className="w-12 h-12 mb-4 opacity-20" />
        <p>No pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Approvals</h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {item.contact?.push_name || item.contact?.full_name || item.contact?.phone || item.chat_jid}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incoming Message</div>
                <div className="p-3 bg-muted/50 rounded-md text-sm">
                  {item.message?.text || item.message?.media_caption || <span className="italic text-muted-foreground">No text content</span>}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Proposed Response</div>
                {editingId === item.id ? (
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 border rounded-md text-sm bg-background">
                    {item.proposed_response}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-muted/10 py-3">
              {editingId === item.id ? (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleAction(item.id, 'approve')}>
                    Send Edited
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleAction(item.id, 'reject')} className="text-destructive hover:text-destructive">
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startEditing(item)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => handleAction(item.id, 'approve')}>
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
