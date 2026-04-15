'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClients, type Client } from '@/hooks/useClients';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'ARCHIVED', label: 'Archived' },
];

function ComplianceBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-gray-400">—</span>;
  const pct = Math.round(rate * 100);
  const color = pct >= 80 ? 'text-green-600 bg-green-50' : pct >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}

function StatusBadge({ status }: { status: Client['status'] }) {
  const styles = {
    ACTIVE: 'bg-green-50 text-green-700',
    PAUSED: 'bg-yellow-50 text-yellow-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function ClientsPage() {
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useClients({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: LIMIT,
  });

  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} total</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Invite client
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Loading…
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium text-gray-500">No clients found</p>
            <p className="mt-1 text-sm text-gray-400">
              {search ? 'Try a different search term.' : 'Invite your first client to get started.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">7-day</th>
                <th className="px-5 py-3">30-day</th>
                <th className="px-5 py-3">Coach</th>
                <th className="px-5 py-3">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => {
                const sevenDay = client.complianceSummaries.find((s) => s.period === 'SEVEN_DAY');
                const thirtyDay = client.complianceSummaries.find((s) => s.period === 'THIRTY_DAY');
                const coach = client.assignments[0]?.coach;
                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/clients/${client.user.id}`} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {client.user.firstName[0]}{client.user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 hover:text-blue-600">
                            {client.user.firstName} {client.user.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{client.user.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={client.status} />
                      {sevenDay?.needsAttention && (
                        <span className="ml-1.5 text-orange-500 text-xs" title="Needs attention">⚠️</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <ComplianceBadge rate={sevenDay?.complianceRate ?? null} />
                    </td>
                    <td className="px-5 py-3.5">
                      <ComplianceBadge rate={thirtyDay?.complianceRate ?? null} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {coach ? `${coach.user.firstName} ${coach.user.lastName}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {client.user.lastLoginAt
                        ? new Date(client.user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
