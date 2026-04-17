'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, Mail } from 'lucide-react';
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
import { useInviteClient } from '@/hooks/useClients';
import { useT } from '@/lib/i18n/client';

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteClientDialog({ open, onOpenChange }: InviteClientDialogProps) {
  const t = useT();
  const invite = useInviteClient();

  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail('');
    setSubmittedEmail('');
    setInviteUrl(null);
    setValidationError(null);
    setCopied(false);
    invite.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setValidationError(t('clients.inviteDialog.emailRequired'));
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setValidationError(t('clients.inviteDialog.emailInvalid'));
      return;
    }

    try {
      const result = await invite.mutateAsync({ email: trimmed });
      setSubmittedEmail(trimmed);
      setInviteUrl(result.inviteUrl);
    } catch {
      // Error state is handled by `invite.isError`
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable; ignore
    }
  }

  function handleInviteAnother() {
    reset();
  }

  const isSuccess = Boolean(inviteUrl);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clients.inviteDialog.title')}</DialogTitle>
          <DialogDescription>
            {isSuccess
              ? t('clients.inviteDialog.successDescription', { email: submittedEmail })
              : t('clients.inviteDialog.description')}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-link">{t('clients.inviteDialog.linkLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-link"
                  readOnly
                  value={inviteUrl ?? ''}
                  onFocus={(e) => e.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span className="ms-1.5">
                    {copied
                      ? t('clients.inviteDialog.copied')
                      : t('clients.inviteDialog.copyLink')}
                  </span>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleInviteAnother}>
                {t('clients.inviteDialog.inviteAnother')}
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {t('clients.inviteDialog.done')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">{t('clients.inviteDialog.emailLabel')}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={t('clients.inviteDialog.emailPlaceholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className="ps-9"
                  disabled={invite.isPending}
                />
              </div>
              {validationError && (
                <p className="text-xs text-destructive">{validationError}</p>
              )}
              {invite.isError && !validationError && (
                <p className="text-xs text-destructive">
                  {invite.error instanceof Error
                    ? invite.error.message
                    : t('clients.inviteDialog.error')}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={invite.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span className="ms-1.5">{t('clients.inviteDialog.submitting')}</span>
                  </>
                ) : (
                  t('clients.inviteDialog.submit')
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
