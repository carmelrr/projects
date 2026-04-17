'use client';

import { useState } from 'react';
import { Copy, Check, UserPlus, Link2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InviteResponse {
  inviteToken: string;
  inviteUrl: string;
  email: string;
  role: 'COACH' | 'ADMIN_COACH';
}

export function InviteCoachDialog({ trigger }: { trigger?: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'COACH' as 'COACH' | 'ADMIN_COACH',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setForm({ email: '', firstName: '', lastName: '', role: 'COACH' });
    setError('');
    setResult(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<InviteResponse>('/auth/invite-coach', {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409 ? t('auth.emailExists') : err.message);
      } else {
        setError(t('auth.genericError'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="gradient">
            <UserPlus className="size-4" />
            {t('admin.inviteCoach.cta')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.inviteCoach.title')}</DialogTitle>
          <DialogDescription>{t('admin.inviteCoach.description')}</DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-first">{t('auth.firstName')}</Label>
                <Input
                  id="inv-first"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder={t('auth.firstNamePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-last">{t('auth.lastName')}</Label>
                <Input
                  id="inv-last"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder={t('auth.lastNamePlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">{t('common.email')}</Label>
              <Input
                id="inv-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('admin.inviteCoach.role')}</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v as 'COACH' | 'ADMIN_COACH' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COACH">{t('auth.roleCoach')}</SelectItem>
                  <SelectItem value="ADMIN_COACH">{t('auth.roleAdminCoach')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="gradient" disabled={loading}>
                {loading ? t('admin.inviteCoach.sending') : t('admin.inviteCoach.send')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground break-words">
              {t('admin.inviteCoach.success', { email: result.email })}
            </div>
            <div className="space-y-1.5">
              <Label>{t('admin.inviteCoach.shareLink')}</Label>
              <div className="flex items-stretch gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-xs">
                  <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-mono" dir="ltr">{result.inviteUrl}</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                  {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => reset()}>
                {t('admin.inviteCoach.another')}
              </Button>
              <Button type="button" variant="gradient" onClick={() => setOpen(false)}>
                {t('common.done')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
