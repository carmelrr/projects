'use client';

import { useState } from 'react';
import { Save, User, Building2, Bell, Lock, Palette } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function ProfileSection() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    bio: '',
    phone: '',
  });

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 ring-2 ring-border">
            <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm">
              Change avatar
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, max 2MB</p>
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
          <Input id="email" type="email" value={user?.email ?? ''} disabled />
          <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
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

        <div className="flex justify-end">
          <Button variant="gradient">
            <Save className="size-4" />
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    emailMessages: true,
    emailAssignments: true,
    emailWeekly: false,
    pushMessages: true,
    pushReminders: true,
  });

  const toggles: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: 'emailMessages', label: 'New messages (email)', desc: 'Get notified when a client sends a message.' },
    { key: 'emailAssignments', label: 'Workout assignments (email)', desc: 'When a client completes or skips a workout.' },
    { key: 'emailWeekly', label: 'Weekly summary (email)', desc: 'A digest of your clients\' progress.' },
    { key: 'pushMessages', label: 'New messages (push)', desc: 'Mobile push for new messages.' },
    { key: 'pushReminders', label: 'Daily reminders (push)', desc: 'Reminders to check in with clients.' },
  ];

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
                checked={prefs[t.key]}
                onCheckedChange={(checked) => setPrefs({ ...prefs, [t.key]: checked })}
              />
            </div>
            {i < toggles.length - 1 && <Separator className="mt-3" />}
          </div>
        ))}
        <div className="flex justify-end pt-3">
          <Button variant="gradient">
            <Save className="size-4" />
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizationSection() {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="orgName">Organization name</Label>
          <Input id="orgName" placeholder="Owl Performance" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orgWeb">Website</Label>
          <Input id="orgWeb" type="url" placeholder="https://" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orgAddr">Address</Label>
          <Textarea id="orgAddr" rows={3} />
        </div>
        <div className="flex justify-end">
          <Button variant="gradient">
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandingSection() {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label>Brand color</Label>
          <div className="flex gap-2">
            {['#7C3AED', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444'].map((c) => (
              <button
                key={c}
                type="button"
                className="size-9 rounded-md ring-2 ring-transparent transition hover:ring-ring"
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <div className="grid size-16 place-items-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground">
              Logo
            </div>
            <Button variant="outline" size="sm">
              Upload logo
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="gradient">
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Change password</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="curPwd">Current password</Label>
              <Input id="curPwd" type="password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPwd">New password</Label>
              <Input id="newPwd" type="password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confPwd">Confirm new password</Label>
              <Input id="confPwd" type="password" />
            </div>
            <div className="flex justify-end">
              <Button variant="gradient">Update password</Button>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Two-factor authentication</h3>
              <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-1 text-sm font-semibold text-destructive">Delete account</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            This will permanently delete your account and all data. This action cannot be undone.
          </p>
          <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
            Delete account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
