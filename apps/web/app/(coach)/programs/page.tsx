'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Copy,
  Trash2,
  UserPlus,
  CalendarDays,
  Lock,
  FolderOpen,
  MoreVertical,
} from 'lucide-react';
import {
  usePrograms,
  useCreateProgram,
  useDeleteProgram,
  useDuplicateProgram,
  useAssignProgram,
  type Program,
} from '@/hooks/usePrograms';
import { useClients } from '@/hooks/useClients';
import { useT } from '@/lib/i18n/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = useCreateProgram();
  const [form, setForm] = useState({ title: '', description: '', isPrivate: false, tagInput: '', tags: [] as string[] });

  const addTag = () => {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) setForm({ ...form, tags: [...form.tags, t], tagInput: '' });
  };

  const save = async () => {
    if (!form.title.trim()) return;
    await create.mutateAsync({
      title: form.title,
      description: form.description || undefined,
      isPrivate: form.isPrivate,
      tags: form.tags.length ? form.tags : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('programs.create.title')}</DialogTitle>
          <DialogDescription>{t('programs.create.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t('programs.create.titleLabel')} *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('programs.create.titlePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">{t('programs.create.descLabel')}</Label>
            <Textarea
              id="desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('programs.create.descPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('programs.create.tagsLabel')}</Label>
            <div className="flex gap-2">
              <Input
                value={form.tagInput}
                onChange={(e) => setForm({ ...form, tagInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={t('programs.create.tagPlaceholder')}
              />
              <Button variant="outline" type="button" onClick={addTag}>
                {t('programs.create.addTag')}
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="default" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== tag) })}
                      className="opacity-60 hover:opacity-100"
                      aria-label={t('programs.create.removeTag', { tag })}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t('programs.create.privateLabel')}</p>
              <p className="text-xs text-muted-foreground">{t('programs.create.privateHint')}</p>
            </div>
            <Switch
              checked={form.isPrivate}
              onCheckedChange={(checked) => setForm({ ...form, isPrivate: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            {t('programs.create.cancel')}
          </Button>
          <Button variant="gradient" onClick={save} disabled={create.isPending || !form.title.trim()}>
            {create.isPending ? t('programs.create.creating') : t('programs.create.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  program,
  open,
  onOpenChange,
}: {
  program: Program;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const { data: clientsData } = useClients({ status: 'ACTIVE', limit: 100 });
  const assign = useAssignProgram();
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [success, setSuccess] = useState(false);

  const save = async () => {
    if (!clientId || !startDate) return;
    await assign.mutateAsync({ id: program.id, clientId, startDate });
    setSuccess(true);
    setTimeout(() => {
      onOpenChange(false);
      setSuccess(false);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('programs.assign.title')}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{t('programs.assign.description', { title: program.title })}</span>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-success/15 text-success text-2xl">
              ✓
            </div>
            <p className="font-medium text-foreground">{t('programs.assign.success')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('programs.assign.clientLabel')}</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('programs.assign.clientPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientsData?.items ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.user.id}>
                        {c.user.firstName} {c.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">{t('programs.assign.startDateLabel')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
                {t('programs.assign.cancel')}
              </Button>
              <Button
                variant="gradient"
                onClick={save}
                disabled={assign.isPending || !clientId || !startDate}
              >
                {assign.isPending ? t('programs.assign.assigning') : t('programs.assign.assign')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramsPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState<Program | null>(null);

  const { data, isLoading } = usePrograms({ search: search || undefined });
  const del = useDeleteProgram();
  const dup = useDuplicateProgram();

  const programs = data?.items ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title={t('programs.title')}
        description={t('programs.description')}
        actions={
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('programs.newProgram')}
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t('programs.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('programs.emptyTitle')}
          description={search ? t('programs.emptySearch') : t('programs.emptyHint')}
          action={
            !search && (
              <Button variant="gradient" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('programs.newProgram')}
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Card key={p.id} className="card-interactive group">
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Link
                    href={`/programs/${p.id}`}
                    className="min-w-0 flex-1 font-semibold text-foreground hover:underline"
                  >
                    {p.title}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                        aria-label={t('programs.options')}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setAssigning(p)}>
                        <UserPlus className="me-2 size-4" />
                        {t('programs.assignToClient')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => dup.mutate(p.id)}>
                        <Copy className="me-2 size-4" />
                        {t('programs.duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (confirm(t('programs.confirmDelete'))) del.mutate(p.id);
                        }}
                      >
                        <Trash2 className="me-2 size-4" />
                        {t('programs.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {p.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                )}

                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {t((p.weeks?.length ?? 0) === 1 ? 'programs.weekCount_one' : 'programs.weekCount_other', { n: p.weeks?.length ?? 0 })}
                  </span>
                  {p.isPrivate && (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="size-3.5" />
                      {t('programs.private')}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-1">
                  {(p.tags ?? []).slice(0, 3).map((t) => (
                    <Badge key={t} variant="muted" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      {assigning && (
        <AssignDialog
          program={assigning}
          open={!!assigning}
          onOpenChange={(open) => !open && setAssigning(null)}
        />
      )}
    </div>
  );
}
