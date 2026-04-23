'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  UserRound,
  CalendarRange,
  Trash2,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useClients } from '@/hooks/useClients';
import { useCoaches } from '@/hooks/useCoaches';
import { usePrograms } from '@/hooks/usePrograms';
import {
  useAddTrainingGroupMembers,
  useAssignTrainingGroupProgram,
  useCreateTrainingGroup,
  useDeleteTrainingGroup,
  useRemoveTrainingGroupMember,
  useTrainingGroup,
  useTrainingGroups,
  type TrainingGroupListItem,
} from '@/hooks/useTrainingGroups';
import { useT } from '@/lib/i18n/client';

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const createGroup = useCreateTrainingGroup();
  const { data: coaches } = useCoaches();
  const { data: clientsData } = useClients({ status: 'ACTIVE', limit: 100 });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coachId, setCoachId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const save = async () => {
    if (!name.trim() || !coachId) return;
    try {
      await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        coachId,
        memberClientUserIds: memberIds,
      });
      toast.success(t('groups.create.success'));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('groups.create.error'));
    }
  };

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setCoachId('');
      setMemberIds([]);
    }
  }, [open]);

  const toggleMember = (clientUserId: string) => {
    setMemberIds((current) =>
      current.includes(clientUserId)
        ? current.filter((id) => id !== clientUserId)
        : [...current, clientUserId],
    );
  };

  const clients = clientsData?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('groups.create.title')}</DialogTitle>
          <DialogDescription>{t('groups.create.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{t('groups.fields.name')} *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('groups.create.namePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-description">{t('groups.fields.description')}</Label>
            <Textarea
              id="group-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('groups.create.descriptionPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('groups.fields.coach')} *</Label>
            <Select value={coachId} onValueChange={setCoachId}>
              <SelectTrigger>
                <SelectValue placeholder={t('groups.create.coachPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {(coaches ?? []).map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.user.firstName} {coach.user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('groups.fields.members')}</Label>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('groups.create.noClients')}</p>
              ) : (
                clients.map((client) => (
                  <label
                    key={client.user.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-1.5 hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={memberIds.includes(client.user.id)}
                      onCheckedChange={() => toggleMember(client.user.id)}
                    />
                    <Avatar className="size-8">
                      <AvatarFallback>
                        {client.user.firstName[0]}
                        {client.user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {client.user.firstName} {client.user.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{client.user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createGroup.isPending}>
            {t('common.cancel')}
          </Button>
          <Button variant="gradient" onClick={save} disabled={createGroup.isPending || !name.trim() || !coachId}>
            {createGroup.isPending ? t('groups.create.creating') : t('groups.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: TrainingGroupListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { data: groupDetail, isLoading } = useTrainingGroup(group?.id ?? null);
  const { data: clientsData } = useClients({ status: 'ACTIVE', limit: 100 });
  const { data: programsData } = usePrograms();
  const addMembers = useAddTrainingGroupMembers();
  const removeMember = useRemoveTrainingGroupMember();
  const assignProgram = useAssignTrainingGroupProgram();
  const [pendingMemberIds, setPendingMemberIds] = useState<string[]>([]);
  const [programId, setProgramId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) {
      setPendingMemberIds([]);
      setProgramId('');
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const availableClients = useMemo(() => {
    const currentIds = new Set(groupDetail?.members.map((member) => member.userId) ?? []);
    return (clientsData?.items ?? []).filter((client) => !currentIds.has(client.user.id));
  }, [clientsData?.items, groupDetail?.members]);

  const togglePendingMember = (clientUserId: string) => {
    setPendingMemberIds((current) =>
      current.includes(clientUserId)
        ? current.filter((id) => id !== clientUserId)
        : [...current, clientUserId],
    );
  };

  const handleAddMembers = async () => {
    if (!groupDetail || pendingMemberIds.length === 0) return;
    try {
      await addMembers.mutateAsync({ id: groupDetail.id, clientUserIds: pendingMemberIds });
      setPendingMemberIds([]);
      toast.success(t('groups.manage.membersAdded'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('groups.manage.error'));
    }
  };

  const handleRemoveMember = async (clientUserId: string) => {
    if (!groupDetail) return;
    try {
      await removeMember.mutateAsync({ id: groupDetail.id, clientUserId });
      toast.success(t('groups.manage.memberRemoved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('groups.manage.error'));
    }
  };

  const handleAssignProgram = async () => {
    if (!groupDetail || !programId || !startDate) return;
    try {
      await assignProgram.mutateAsync({
        id: groupDetail.id,
        programId,
        startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
      });
      toast.success(t('groups.manage.programAssigned'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('groups.manage.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{group?.name ?? t('groups.manage.title')}</DialogTitle>
          <DialogDescription>{t('groups.manage.description')}</DialogDescription>
        </DialogHeader>

        {isLoading || !groupDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{groupDetail.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {groupDetail.description || t('groups.manage.noDescription')}
                      </p>
                    </div>
                    <Badge variant="secondary">{groupDetail.memberCount} {t('groups.summary.members')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound className="size-4" />
                    {groupDetail.coach.firstName} {groupDetail.coach.lastName}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('groups.manage.membersTitle')}</p>
                    <p className="text-sm text-muted-foreground">{t('groups.manage.membersDescription')}</p>
                  </div>

                  <div className="space-y-2">
                    {groupDetail.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('groups.manage.noMembers')}</p>
                    ) : (
                      groupDetail.members.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback>
                                {member.firstName[0]}
                                {member.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removeMember.isPending}
                          >
                            {t('groups.manage.removeMember')}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('groups.manage.addMembers')}</p>
                      <p className="text-xs text-muted-foreground">{t('groups.manage.addMembersHint')}</p>
                    </div>
                    <div className="max-h-44 space-y-2 overflow-y-auto">
                      {availableClients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('groups.manage.noAvailableClients')}</p>
                      ) : (
                        availableClients.map((client) => (
                          <label key={client.user.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50">
                            <Checkbox
                              checked={pendingMemberIds.includes(client.user.id)}
                              onCheckedChange={() => togglePendingMember(client.user.id)}
                            />
                            <span className="text-sm text-foreground">
                              {client.user.firstName} {client.user.lastName}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleAddMembers}
                      disabled={addMembers.isPending || pendingMemberIds.length === 0}
                    >
                      {addMembers.isPending ? t('groups.manage.savingMembers') : t('groups.manage.addSelected')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('groups.manage.programTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('groups.manage.programDescription')}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {groupDetail.activeProgramId
                    ? t('groups.manage.activeProgramSet', { id: groupDetail.activeProgramId })
                    : t('groups.manage.noProgramAssigned')}
                </div>

                <div className="space-y-1.5">
                  <Label>{t('groups.manage.programLabel')}</Label>
                  <Select value={programId} onValueChange={setProgramId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('groups.manage.programPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(programsData?.items ?? []).map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="group-program-start">{t('groups.manage.startDate')}</Label>
                  <Input
                    id="group-program-start"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>

                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={handleAssignProgram}
                  disabled={assignProgram.isPending || !programId || groupDetail.memberCount === 0}
                >
                  {assignProgram.isPending ? t('groups.manage.assigningProgram') : t('groups.manage.assignProgram')}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function GroupsPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TrainingGroupListItem | null>(null);
  const { data, isLoading } = useTrainingGroups({ search: search || undefined, limit: 50 });
  const deleteGroup = useDeleteTrainingGroup();

  const groups = data?.items ?? [];

  const handleDelete = async (group: TrainingGroupListItem) => {
    if (!confirm(t('groups.delete.confirm', { name: group.name }))) return;
    try {
      await deleteGroup.mutateAsync(group.id);
      toast.success(t('groups.delete.success'));
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('groups.manage.error'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
      <PageHeader
        title={t('groups.title')}
        description={t('groups.description')}
        actions={
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('groups.create.cta')}
          </Button>
        }
      />

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('groups.searchPlaceholder')}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t('groups.emptyTitle')}
          description={search ? t('groups.emptySearch') : t('groups.emptyDescription')}
          action={
            !search && (
              <Button variant="gradient" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('groups.create.cta')}
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="card-interactive">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-foreground">{group.name}</h2>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {group.description || t('groups.noDescription')}
                    </p>
                  </div>
                  <Badge variant="secondary">{group.memberCount}</Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4" />
                    <span>{group.coachName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4" />
                    <span>{t('groups.summary.memberCount', { n: group.memberCount })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarRange className="size-4" />
                    <span>
                      {group.activeProgramId
                        ? t('groups.summary.activeProgramSet')
                        : t('groups.summary.noActiveProgram')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedGroup(group)}>
                    <Settings2 className="size-4" />
                    {t('groups.manage.cta')}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(group)} disabled={deleteGroup.isPending}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ManageGroupDialog group={selectedGroup} open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)} />
    </div>
  );
}