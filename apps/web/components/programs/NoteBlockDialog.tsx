'use client';

import { useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { NoteConfig } from '@/hooks/useWorkouts';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: NoteConfig;
  onSave: (cfg: NoteConfig) => void;
}

export function NoteBlockDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setBody(initial?.body ?? '');
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="size-4" /> Note block
          </DialogTitle>
          <DialogDescription>
            Show the trainee a coaching note inline during the workout
            (warm-up cues, mobility prep, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title (optional)</Label>
            <Input
              id="note-title"
              value={title ?? ''}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Warm-up"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-body">Body</Label>
            <Textarea
              id="note-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="5 min easy bike, 2 rounds of mobility..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={() => {
              onSave({ title: title.trim() || null, body: body.trim() });
              onOpenChange(false);
            }}
            disabled={!body.trim()}
          >
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
