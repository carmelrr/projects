'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useClients } from '@/hooks/useClients';
import Link from 'next/link';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: activeData } = useClients({ status: 'ACTIVE', limit: 100 });
  const { data: attentionData } = useClients({ needsAttention: true, limit: 50 });

  const totalActive = activeData?.total ?? 0;
  const needsAttention = attentionData?.items ?? [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user?.firstName} 👋
        </h1>
        <p className="mt-1 text-gray-500">Here's an overview of your clients today.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active clients" value={totalActive} />
        <StatCard
          label="Needs attention"
          value={needsAttention.length}
          sub="Compliance dropped ≥20%"
        />
        <StatCard
          label="Avg. compliance"
          value={
            activeData?.items?.length
              ? Math.round(
                  (activeData.items
                    .flatMap((c) => c.complianceSummaries.filter((s) => s.period === 'SEVEN_DAY'))
                    .reduce((sum, s) => sum + s.complianceRate, 0) /
                    Math.max(
                      activeData.items.filter((c) =>
                        c.complianceSummaries.some((s) => s.period === 'SEVEN_DAY'),
                      ).length,
                      1,
                    )) *
                    100,
                ) + '%'
              : '—'
          }
          sub="7-day average"
        />
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-800">⚠️ Needs Attention</h2>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <ul className="divide-y divide-gray-50">
              {needsAttention.map((client) => {
                const sevenDay = client.complianceSummaries.find(
                  (s) => s.period === 'SEVEN_DAY',
                );
                return (
                  <li key={client.id}>
                    <Link
                      href={`/clients/${client.user.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                        {client.user.firstName[0]}{client.user.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {client.user.firstName} {client.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sevenDay
                            ? `${Math.round(sevenDay.complianceRate * 100)}% compliance this week`
                            : 'No recent data'}
                        </p>
                      </div>
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                        Needs attention
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Recent Clients */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Active Clients</h2>
          <Link href="/clients" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          {!activeData ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              Loading…
            </div>
          ) : activeData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-gray-500 font-medium">No clients yet</p>
              <p className="mt-1 text-sm text-gray-400">Invite your first client to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {activeData.items.slice(0, 8).map((client) => {
                const sevenDay = client.complianceSummaries.find(
                  (s) => s.period === 'SEVEN_DAY',
                );
                const rate = sevenDay ? Math.round(sevenDay.complianceRate * 100) : null;
                return (
                  <li key={client.id}>
                    <Link
                      href={`/clients/${client.user.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        {client.user.firstName[0]}{client.user.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {client.user.firstName} {client.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{client.user.email}</p>
                      </div>
                      {rate !== null && (
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-sm font-semibold ${
                              rate >= 80
                                ? 'text-green-600'
                                : rate >= 50
                                ? 'text-amber-500'
                                : 'text-red-500'
                            }`}
                          >
                            {rate}%
                          </span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${
                                rate >= 80
                                  ? 'bg-green-500'
                                  : rate >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
