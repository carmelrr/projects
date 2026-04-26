'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Building2, Bell, Lock, Palette, Loader2, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  useMe,
  useUpdateMe,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useUpdatePassword,
  useDeleteAccount,
} from '@/hooks/useUser';
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ─── Reusable inline status text ──────────────────────────────────────────
function StatusLine({
  pending,
  error,
  saved,
}: {
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  if (pending) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (error) {
    return <span className="text-xs text-destructive">{error}</span>;
  }
  if (saved) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <Check className="size-3.5" /> Saved
      </span>
    );
  }
  return null;
}

// ─── Profile ──────────────────────────────────────────────────────────────
function ProfileSection() {
  const { user } = useAuthStore();
  const { data: me } = useMe();
  const update = useUpdateMe();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    weightUnit: 'kg' as 'kg' | 'lbs',
  });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (me) {
      setForm({
        firstName: me.firstName ?? '',
        lastName: me.lastName ?? '',
        phone: me.phone ?? '',
        bio: me.coachProfile?.bio ?? '',
        weightUnit: me.weightUnit ?? 'kg',
      });
    }
  }, [me]);

  const save = async () => {
    setErr(null);
    setSaved(false);
    try {
      await update.mutateAsync(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    }
  };

  const initials =
    `${me?.firstName?.[0] ?? user?.firstName?.[0] ?? ''}${
      me?.lastName?.[0] ?? user?.lastName?.[0] ?? ''
    }`.toUpperCase() || '?';

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 ring-2 ring-border">
            <AvatarImage src={me?.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm" disabled>
              Change avatar
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload coming soon. JPG or PNG, max 2MB.
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={me?.email ?? ''} disabled />
          <p className="text-xs text-muted-foreground">
            Contact support to change your email.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555 555 5555"
          />
        </div>

        {me?.coachProfile && (
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell clients about yourself…"
            />
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>Weight unit</Label>
          <p className="text-xs text-muted-foreground">
            Weights you enter in workout prescriptions will be displayed in this
            unit. Trainees see weights converted to their own preference.
          </p>
          <div className="flex gap-2">
            {(['kg', 'lbs'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setForm({ ...form, weightUnit: u })}
                className={cn(
                  'rounded-md border px-4 py-1.5 text-sm font-medium transition-colors',
                  form.weightUnit === u
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <StatusLine pending={update.isPending} error={err} saved={saved} />
          <Button variant="gradient" onClick={save} disabled={update.isPending}>
            <Save className="size-4" />
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────
function NotificationsSection() {
  const { data: prefs } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);

  const toggles: { key: string; label: string; desc: string }[] = [
    {
      key: 'emailMessages',
      label: 'New messages (email)',
      desc: 'Get notified when a client sends a message.',
    },
    {
      key: 'emailAssignments',
      label: 'Workout activity (email)',
      desc: 'When a client completes or skips a workout.',
    },
    {
      key: 'emailWeekly',
      label: 'Weekly summary (email)',
      desc: "A digest of your clients' progress.",
    },
    {
      key: 'pushMessages',
      label: 'New messages (push)',
      desc: 'Mobile push for new messages.',
    },
    {
      key: 'pushReminders',
      label: 'Daily reminders (push)',
      desc: 'Reminders to check in with clients.',
    },
  ];

  const save = async () => {
    setErr(null);
    setSaved(false);
    try {
      await update.mutateAsync(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        {toggles.map((t, i) => (
          <div key={t.key}>
            <div className="flex items-start justify-between gap-4 py-1">
              <div>
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch
                checked={local[t.key] ?? false}
                onCheckedChange={(checked) => setLocal({ ...local, [t.key]: checked })}
              />
            </div>
            {i < toggles.length - 1 && <Separator className="mt-3" />}
          </div>
        ))}
        <div className="flex items-center justify-end gap-3 pt-3">
          <StatusLine pending={update.isPending} error={err} saved={saved} />
          <Button variant="gradient" onClick={save} disabled={update.isPending}>
            <Save className="size-4" />
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Organization ─────────────────────────────────────────────────────────
function OrganizationSection() {
  const { user } = useAuthStore();
  const orgId = user?.orgId;
  const { data: org } = useOrganization(orgId);
  const update = useUpdateOrganization();
  const [form, setForm] = useState({
    name: '',
    timezone: '',
    website: '',
    address: '',
  });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setForm({
        name: (org.name as string) ?? '',
        timezone: (org.timezone as string) ?? '',
        website: (org.website as string) ?? '',
        address: (org.address as string) ?? '',
      });
    }
  }, [org]);

  const save = async () => {
    if (!orgId) return;
    setErr(null);
    setSaved(false);
    try {
      await update.mutateAsync({ orgId, ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    }
  };

  const canEdit = user?.role === 'OWNER' || user?.role === 'ADMIN_COACH';

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {!canEdit && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Only organization owners and admins can edit these settings.
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="orgName">Organization name</Label>
          <Input
            id="orgName"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="OP"
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orgTz">Timezone</Label>
          <Input
            id="orgTz"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            placeholder="America/New_York"
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orgWeb">Website</Label>
          <Input
            id="orgWeb"
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://"
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orgAddr">Address</Label>
          <Textarea
            id="orgAddr"
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            disabled={!canEdit}
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <StatusLine pending={update.isPending} error={err} saved={saved} />
          <Button
            variant="gradient"
            onClick={save}
            disabled={!canEdit || update.isPending}
          >
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Branding ─────────────────────────────────────────────────────────────
const BRAND_COLORS = ['#7C3AED', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444'];

function BrandingSection() {
  const { user } = useAuthStore();
  const orgId = user?.orgId;
  const { data: org } = useOrganization(orgId);
  const update = useUpdateOrganization();
  const [color, setColor] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (org) setColor((org.primaryColor as string) ?? null);
  }, [org]);

  const canEdit = user?.role === 'OWNER' || user?.role === 'ADMIN_COACH';

  const save = async () => {
    if (!orgId) return;
    setErr(null);
    setSaved(false);
    try {
      await update.mutateAsync({ orgId, primaryColor: color });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label>Brand color</Label>
          <div className="flex gap-2">
            {BRAND_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => canEdit && setColor(c)}
                className={cn(
                  'size-9 rounded-md ring-2 transition',
                  color === c ? 'ring-ring' : 'ring-transparent hover:ring-muted',
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
                disabled={!canEdit}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <div
              className="grid size-16 place-items-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground"
              style={org?.logoUrl ? { background: `url(${org.logoUrl}) center/cover` } : {}}
            >
              {!org?.logoUrl && 'Logo'}
            </div>
            <Button variant="outline" size="sm" disabled>
              Upload logo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Logo upload coming soon.</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <StatusLine pending={update.isPending} error={err} saved={saved} />
          <Button
            variant="gradient"
            onClick={save}
            disabled={!canEdit || update.isPending}
          >
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────
function SecuritySection() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const update = useUpdatePassword();
  const deleteAccount = useDeleteAccount();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setSaved(false);
    if (form.next.length < 8) {
      setErr('New password must be at least 8 characters.');
      return;
    }
    if (form.next !== form.confirm) {
      setErr('Passwords do not match.');
      return;
    }
    try {
      await update.mutateAsync({ newPassword: form.next });
      setSaved(true);
      setForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update password');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Change password</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newPwd">New password</Label>
              <Input
                id="newPwd"
                type="password"
                value={form.next}
                onChange={(e) => setForm({ ...form, next: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confPwd">Confirm new password</Label>
              <Input
                id="confPwd"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <StatusLine pending={update.isPending} error={err} saved={saved} />
              <Button
                variant="gradient"
                onClick={save}
                disabled={update.isPending || !form.next}
              >
                Update password
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Two-factor authentication
              </h3>
              <p className="text-xs text-muted-foreground">
                Add an extra layer of security.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming soon
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-1 text-sm font-semibold text-destructive">Delete account</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            This will permanently delete your account and all data. This action cannot be
            undone.
          </p>
          <div className="space-y-2">
            <Input
              placeholder='Type "DELETE" to confirm'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            {deleteErr && (
              <p className="text-xs text-destructive">{deleteErr}</p>
            )}
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={deleteConfirm !== 'DELETE' || deleteAccount.isPending}
              onClick={async () => {
                setDeleteErr(null);
                try {
                  await deleteAccount.mutateAsync();
                  await logout();
                  router.replace('/');
                } catch (e) {
                  setDeleteErr(e instanceof Error ? e.message : 'Could not delete account');
                }
              }}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete account'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, organization, and preferences."
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="size-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="size-3.5" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="size-3.5" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="size-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="size-3.5" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileSection />
        </TabsContent>
        <TabsContent value="organization" className="mt-4">
          <OrganizationSection />
        </TabsContent>
        <TabsContent value="branding" className="mt-4">
          <BrandingSection />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsSection />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecuritySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
