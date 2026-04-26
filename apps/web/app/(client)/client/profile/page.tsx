'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trophy, Save, Lock } from 'lucide-react';
import { useMe, useUpdateMe, useUpdatePassword } from '@/hooks/useUser';
import { usePersonalRecords } from '@/hooks/useWorkouts';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function ClientProfilePage() {
  const { user } = useAuthStore();
  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();
  const updatePassword = useUpdatePassword();
  const { data: prs, isLoading: prsLoading } = usePersonalRecords();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  useEffect(() => {
    if (me) {
      setFirstName(me.firstName ?? '');
      setLastName(me.lastName ?? '');
      setPhone(me.phone ?? '');
      setWeightUnit(me.weightUnit ?? 'kg');
    }
  }, [me]);

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const saveProfile = async () => {
    setProfileMsg(null);
    try {
      await updateMe.mutateAsync({ firstName, lastName, phone, weightUnit });
      setProfileMsg('Saved.');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const savePassword = async () => {
    setPwdMsg(null);
    if (pwd1.length < 8) {
      setPwdMsg('Password must be at least 8 characters.');
      return;
    }
    if (pwd1 !== pwd2) {
      setPwdMsg('Passwords do not match.');
      return;
    }
    try {
      await updatePassword.mutateAsync({ newPassword: pwd1 });
      setPwdMsg('Password updated.');
      setPwd1('');
      setPwd2('');
    } catch (err) {
      setPwdMsg(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <PageHeader
        title="Profile"
        description="Manage your account, units and password."
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Signed in as</p>
              <p className="font-semibold text-foreground">{me?.email ?? user?.email}</p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="weightUnit">Weight unit</Label>
                <Select
                  value={weightUnit}
                  onValueChange={(v) => setWeightUnit(v as 'kg' | 'lbs')}
                >
                  <SelectTrigger id="weightUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={updateMe.isPending}>
              {updateMe.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
            {profileMsg && (
              <span className="text-sm text-muted-foreground">{profileMsg}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Change password</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pwd1">New password</Label>
              <Input
                id="pwd1"
                type="password"
                value={pwd1}
                onChange={(e) => setPwd1(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pwd2">Confirm</Label>
              <Input
                id="pwd2"
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={savePassword}
              disabled={!pwd1 || updatePassword.isPending}
            >
              {updatePassword.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Update password'
              )}
            </Button>
            {pwdMsg && <span className="text-sm text-muted-foreground">{pwdMsg}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Personal Records */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="size-4 text-warning" />
            <h2 className="font-semibold text-foreground">Personal records</h2>
          </div>
          {prsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : !prs || prs.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No PRs yet"
              description="Log a workout to start tracking your personal records."
            />
          ) : (
            <ul className="divide-y divide-border">
              {prs
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.recordedAt).getTime() -
                    new Date(a.recordedAt).getTime(),
                )
                .map((pr) => (
                  <li
                    key={pr.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{pr.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pr.recordedAt).toLocaleDateString()}
                        {pr.reps ? ` · ${pr.reps} reps` : ''}
                      </p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {pr.weight} {pr.unit}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
