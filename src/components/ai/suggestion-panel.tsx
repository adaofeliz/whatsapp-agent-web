'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Sparkles } from 'lucide-react';
import { ProposalCards } from './proposal-cards';
import { toast } from 'sonner';

interface SuggestionPanelProps {
  chatJid: string;
}

export function SuggestionPanel({ chatJid }: SuggestionPanelProps) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatJid }),
      });

      if (!response.ok) throw new Error('Failed to generate proposals');

      const data = await response.json();
      setProposals(data);
      setHasFetched(true);
    } catch (error) {
      toast.error('Failed to generate suggestions');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [chatJid]);

  useEffect(() => {
    setProposals([]);
    setHasFetched(false);
  }, [chatJid]);

  useEffect(() => {
    const handleOpen = () => {
      if (!hasFetched && !isLoading) {
        fetchProposals();
      }
    };

    window.addEventListener('whatsapp-agent:open-suggestions', handleOpen);
    return () => window.removeEventListener('whatsapp-agent:open-suggestions', handleOpen);
  }, [fetchProposals, hasFetched, isLoading]);

  const handleSelect = (text: string) => {
    window.dispatchEvent(new CustomEvent('whatsapp-agent:insert-proposal', { 
      detail: { text } 
    }));
    toast.success('Reply inserted');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (!hasFetched && proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4 space-y-4">
        <div className="p-3 bg-primary/10 rounded-full">
            <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
            <h3 className="font-medium">AI Suggestions</h3>
            <p className="text-sm text-muted-foreground">
                Generate smart replies based on your conversation style and context.
            </p>
        </div>
        <Button onClick={fetchProposals}>
            Generate Suggestions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground">Suggested Replies</h3>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchProposals}
            title="Regenerate"
            className="h-8 w-8"
        >
            <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <ProposalCards proposals={proposals} onSelect={handleSelect} />
    </div>
  );
}
