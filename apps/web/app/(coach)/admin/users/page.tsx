'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, UserCog, UserX, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import {
  useAdminUsers,
  useUpdateUserStatus,
  useUpdateUserRole,
  type AdminUser,
} from '@/hooks/useAdmin';

const ROLES = ['', 'OWNER', 'ADMIN_COACH', 'COACH', 'CLIENT'] as const;
const STATUSES = ['', 'ACTIVE', 'SUSPENDED'] as const;

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useAdminUsers({ page, limit: 20, search, role, status });
  const setStatusMutation = useUpdateUserStatus();
  const setRoleMutation = useUpdateUserRole();

  const handleStatus = (u: AdminUser, next: 'ACTIVE' | 'SUSPENDED') => {
    setStatusMutation.mutate({ userId: u.id, status: next });
  };

  const handleRole = (u: AdminUser, next: 'ADMIN_COACH' | 'COACH' | 'CLIENT') => {
    setRoleMutation.mutate({ userId: u.id, role: next });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Users & roles"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' },
        ]}
        description="Manage team members, coaches, and clients in this organization."
        actions={
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 size-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r || 'All roles'}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s || 'All statuses'}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-2">User</th>
                  <th className="py-2 px-2">Role</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Last login</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : !data?.items.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No users match these filters.
                    </td>
                  </tr>
                ) : (
                  data.items.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/40">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback>
                              {(u.firstName?.[0] ?? u.email?.[0] ?? '?').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {u.firstName || u.lastName
                                ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                                : '—'}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {u.email ?? '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{u.role ?? '—'}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={u.status === 'ACTIVE' ? 'default' : 'destructive'}
                        >
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {u.role !== 'OWNER' && u.id !== user?.id ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <UserCog className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Manage user</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {u.status === 'ACTIVE' ? (
                                <DropdownMenuItem
                                  onClick={() => handleStatus(u, 'SUSPENDED')}
                                  className="text-destructive"
                                >
                                  <UserX className="mr-2 size-4" /> Suspend
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleStatus(u, 'ACTIVE')}>
                                  <UserCheck className="mr-2 size-4" /> Reactivate
                                </DropdownMenuItem>
                              )}
                              {isOwner && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Change role</DropdownMenuLabel>
                                  {(['ADMIN_COACH', 'COACH', 'CLIENT'] as const)
                                    .filter((r) => r !== u.role)
                                    .map((r) => (
                                      <DropdownMenuItem
                                        key={r}
                                        onClick={() => handleRole(u, r)}
                                      >
                                        {r}
                                      </DropdownMenuItem>
                                    ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                Page {data.page} of {data.totalPages} · {data.total} users
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
