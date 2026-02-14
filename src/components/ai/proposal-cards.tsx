import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';

interface MessageProposal {
  message: string;
  tone: 'friendly' | 'professional' | 'casual';
  reasoning: string;
}

interface ProposalCardsProps {
  proposals: MessageProposal[];
  onSelect: (message: string) => void;
}

const toneColors = {
  friendly: 'bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900 dark:text-green-300',
  professional: 'bg-slate-100 text-slate-800 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-300',
  casual: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900 dark:text-blue-300',
};

export function ProposalCards({ proposals, onSelect }: ProposalCardsProps) {
  if (!proposals.length) return null;

  return (
    <div className="space-y-4">
      {proposals.map((proposal, index) => (
        <Card key={index} className="overflow-hidden transition-all hover:shadow-md border-muted-foreground/20">
          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
            <Badge 
              variant="secondary" 
              className={`capitalize font-normal ${toneColors[proposal.tone] || ''}`}
            >
              {proposal.tone}
            </Badge>
            <Sparkles className="h-3 w-3 text-muted-foreground/50" />
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <p className="text-sm font-medium leading-relaxed text-foreground/90">
              "{proposal.message}"
            </p>
            <p className="mt-2 text-xs text-muted-foreground italic">
              {proposal.reasoning}
            </p>
          </CardContent>
          <CardFooter className="p-2 bg-muted/30">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-8 text-xs hover:bg-background hover:text-primary"
              onClick={() => onSelect(proposal.message)}
            >
              <Check className="mr-2 h-3 w-3" />
              Use this reply
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
