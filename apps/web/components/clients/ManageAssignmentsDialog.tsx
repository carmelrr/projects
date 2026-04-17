'use client';

import { useState } from 'react';
import { Loader2, UserPlus, Users, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useClientAssignments,
  useAddClientAssignment,
  useEndClientAssignment,
  type ClientAssignment,
} from '@/hooks/useClients';
import { useCoaches } from '@/hooks/useCoaches';
import { useT } from '@/lib/i18n/client';

interface ManageAssignmentsDialogProps {
  clientUserId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fullName(a: ClientAssignment): string {
  if (!a.coach) return '—';
  return `${a.coach.user.firstName} ${a.coach.user.lastName}`.trim();
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';
}

export function ManageAssignmentsDialog({
  clientUserId,
  clientName,
  open,
  onOpenChange,
}: ManageAssignmentsDialogProps) {
  const t = useT();
  const { data: assignments, isLoading } = useClientAssignments(open ? clientUserId : '');
  const { data: coaches } = useCoaches();
  const addAssign = useAddClientAssignment();
  const endAssign = useEndClientAssignment();

  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingEndId, setPendingEndId] = useState<string | null>(null);

  const active = (assignments ?? []).filter((a) => a.status === 'ACTIVE');
  const ended = (assignments ?? []).filter((a) => a.status !== 'ACTIVE');
  const activeCoachIds = new Set(active.map((a) => a.coachId));
  const availableCoaches = (coaches ?? []).filter((c) => !activeCoachIds.has(c.id));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedCoachId) return;
    try {
      await addAssign.mutateAsync({
        clientUserId,
        coachId: selectedCoachId,
        notes: notes.trim() || undefined,
      });
      setSelectedCoachId('');
      setNotes('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('clients.assignments.error'));
    }
  }

  async function handleEnd(assignmentId: string) {
    setErrorMsg(null);
    try {
      await endAssign.mutateAsync({ clientUserId, assignmentId });
      setPendingEndId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('clients.assignments.error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('clients.assignments.manage')}</DialogTitle>
          <DialogDescription>{clientName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active assignments */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('clients.assignments.active')}
            </h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">…</p>
            ) : active.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                {t('clients.assignments.none')}
              </p>
            ) : (
              <ul className="space-y-2">
                {active.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-card/60 px-3 py-2.5"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={a.coach?.user.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback>
                        {a.coach
                          ? initials(a.coach.user.firstName, a.coach.user.lastName)
                          : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {fullName(a)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t('clients.assignments.since', {
                          date: new Date(a.startAt).toLocaleDateString(),
                        })}
                      </p>
                    </div>
                    {pendingEndId === a.id ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingEndId(null)}
                          disabled={endAssign.isPending}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEnd(a.id)}
                          disabled={endAssign.isPending}
                        >
                          {endAssign.isPending
                            ? t('clients.assignments.ending')
                            : t('clients.assignments.endConfirm')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingEndId(a.id)}
                      >
                        <X className="size-3.5" />
                        <span className="ms-1.5">{t('clients.assignments.end')}</span>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Separator />

          {/* Add assignment */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('clients.assignments.assign')}
            </h3>
            {availableCoaches.length === 0 ? (
              <p className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                <Users className="size-4" />
                {(coaches ?? []).length === 0
                  ? t('clients.assignments.noCoaches')
                  : t('clients.assignments.none')}
              </p>
            ) : (
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('clients.assignments.coachLabel')}</Label>
                  <Select
                    value={selectedCoachId}
                    onValueChange={setSelectedCoachId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('clients.assignments.coachPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCoaches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.user.firstName} {c.user.lastName}
                          {c.role !== 'COACH' && (
                            <span className="ms-2 text-xs text-muted-foreground">
                              · {c.role.replace('_', ' ').toLowerCase()}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assignment-notes">
                    {t('clients.assignments.notesLabel')}
                  </Label>
                  <Textarea
                    id="assignment-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('clients.assignments.notesPlaceholder')}
                  />
                </div>

                {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!selectedCoachId || addAssign.isPending}
                  >
                    {addAssign.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span className="ms-1.5">
                          {t('clients.assignments.submitting')}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-4" />
                        <span className="ms-1.5">
                          {t('clients.assignments.submit')}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </section>

          {/* Ended assignments (history) */}
          {ended.length > 0 && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('clients.assignments.ended')}
                </h3>
                <ul className="space-y-1.5">
                  {ended.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 px-3 py-1.5 text-sm text-muted-foreground"
                    >
                      <Avatar className="size-7 opacity-70">
                        <AvatarImage src={a.coach?.user.avatarUrl ?? undefined} alt="" />
                        <AvatarFallback className="text-xs">
                          {a.coach
                            ? initials(a.coach.user.firstName, a.coach.user.lastName)
                            : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{fullName(a)}</span>
                      <Badge variant="muted" className="ms-auto">
                        {a.endAt
                          ? t('clients.assignments.until', {
                              date: new Date(a.endAt).toLocaleDateString(),
                            })
                          : t('clients.assignments.ended')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
