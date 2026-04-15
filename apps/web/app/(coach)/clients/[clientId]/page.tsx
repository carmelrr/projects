'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClient, useUpdateClient } from '@/hooks/useClients';
import { useClientCalendar } from '@/hooks/useWorkouts';
import { useClientMetrics } from '@/hooks/useMetrics';

// ── Helpers ────────────────────────────────────────────────────────────────

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => x.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end), label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) };
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function ComplianceBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  const textColor = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-semibold w-10 text-right ${textColor}`}>{pct}%</span>
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────────────────────────────────

function CalendarTab({ clientId }: { clientId: string }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const { start, end, label } = getMonthRange(monthOffset);
  const { data: instances, isLoading } = useClientCalendar(clientId, start, end);

  // Build a map date → instances
  const byDate = new Map<string, typeof instances>();
  (instances ?? []).forEach((inst) => {
    const d = inst.scheduledDate.split('T')[0];
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(inst);
  });

  // Build calendar grid
  const firstDay = new Date(start);
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0 = Sunday
  const cells: (string | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(firstDay);
      d.setDate(i + 1);
      return d.toISOString().split('T')[0];
    }),
  ];
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    SKIPPED: 'bg-gray-100 text-gray-500',
    MISSED: 'bg-red-100 text-red-600',
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                {d}
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {cells.map((date, i) => (
              <div
                key={i}
                className={`min-h-[72px] p-1.5 ${date === today ? 'bg-blue-50' : 'bg-white'} ${!date ? 'bg-gray-50' : ''}`}
              >
                {date && (
                  <>
                    <p className={`mb-1 text-xs font-medium ${date === today ? 'text-blue-600' : 'text-gray-400'}`}>
                      {new Date(date + 'T12:00:00').getDate()}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {(byDate.get(date) ?? []).slice(0, 3).map((inst) => (
                        <div
                          key={inst.id}
                          title={inst.workout?.title ?? 'Workout'}
                          className={`truncate rounded px-1 py-0.5 text-xs font-medium ${statusColors[inst.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {inst.workout?.title ?? 'Workout'}
                        </div>
                      ))}
                      {(byDate.get(date)?.length ?? 0) > 3 && (
                        <p className="text-xs text-gray-400">+{(byDate.get(date)?.length ?? 0) - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {Object.entries(statusColors).map(([status, cls]) => (
          <span key={status} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ client }: { client: NonNullable<ReturnType<typeof useClient>['data']> }) {
  const sevenDay = client.complianceSummaries?.find((s) => s.period === 'SEVEN_DAY');
  const thirtyDay = client.complianceSummaries?.find((s) => s.period === 'THIRTY_DAY');

  return (
    <div className="space-y-6">
      {/* Compliance summary */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Compliance</h3>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>7-day</span>
              {sevenDay?.needsAttention && (
                <span className="text-orange-500 font-medium">⚠️ Needs attention</span>
              )}
            </div>
            {sevenDay ? (
              <ComplianceBar rate={sevenDay.complianceRate} />
            ) : (
              <p className="text-xs text-gray-400">No data</p>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs text-gray-500">30-day</div>
            {thirtyDay ? (
              <ComplianceBar rate={thirtyDay.complianceRate} />
            ) : (
              <p className="text-xs text-gray-400">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Profile</h3>
        <dl className="space-y-2 text-sm">
          {[
            { label: 'Email', value: client.user.email },
            { label: 'Date of birth', value: client.clientProfile?.dob ?? '—' },
            { label: 'Height', value: client.clientProfile?.heightCm ? `${client.clientProfile.heightCm} cm` : '—' },
            { label: 'Status', value: client.status },
            {
              label: 'Coach',
              value: client.assignments?.[0]?.coach
                ? `${client.assignments[0].coach.user.firstName} ${client.assignments[0].coach.user.lastName}`
                : '—',
            },
            { label: 'Last login', value: client.user.lastLoginAt ? new Date(client.user.lastLoginAt).toLocaleDateString() : 'Never' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900 text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Goals */}
      {client.clientProfile?.goals && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Goals</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{client.clientProfile.goals}</p>
        </div>
      )}

      {/* Medical notes */}
      {client.clientProfile?.medicalNotes && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Medical Notes</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{client.clientProfile.medicalNotes}</p>
        </div>
      )}
    </div>
  );
}

// ── Metrics Tab ────────────────────────────────────────────────────────────

function MetricsTab({ clientId }: { clientId: string }) {
  const { data: entries, isLoading } = useClientMetrics(clientId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>;
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
        <p className="font-medium text-gray-500">No metrics logged yet</p>
        <p className="mt-1 text-sm text-gray-400">Metrics will appear here once the client starts logging.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {entry.definition?.name ?? 'Metric'}
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {entry.value}
            <span className="ml-1 text-base font-normal text-gray-400">
              {entry.definition?.unit}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {new Date(entry.capturedAt).toLocaleDateString()}
          </p>
          {entry.notes && <p className="mt-2 text-xs text-gray-500">{entry.notes}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Edit Panel ─────────────────────────────────────────────────────────────

function EditPanel({
  client,
  onClose,
}: {
  client: NonNullable<ReturnType<typeof useClient>['data']>;
  onClose: () => void;
}) {
  const updateClient = useUpdateClient();
  const [form, setForm] = useState({
    goals: client.clientProfile?.goals ?? '',
    dob: client.clientProfile?.dob ?? '',
    heightCm: client.clientProfile?.heightCm?.toString() ?? '',
    medicalNotes: client.clientProfile?.medicalNotes ?? '',
    status: client.status,
  });

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const save = async () => {
    await updateClient.mutateAsync({
      id: client.user.id,
      goals: form.goals || undefined,
      dob: form.dob || undefined,
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      medicalNotes: form.medicalNotes || undefined,
      status: form.status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Edit Client</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handle}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handle}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Height (cm)</label>
            <input
              type="number"
              name="heightCm"
              value={form.heightCm}
              onChange={handle}
              placeholder="e.g. 175"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Goals</label>
            <textarea
              name="goals"
              value={form.goals}
              onChange={handle}
              rows={4}
              placeholder="Client goals…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Medical Notes</label>
            <textarea
              name="medicalNotes"
              value={form.medicalNotes}
              onChange={handle}
              rows={3}
              placeholder="Injuries, contraindications…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={updateClient.isPending}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateClient.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'metrics', label: 'Metrics' },
];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const { data: client, isLoading, isError } = useClient(clientId);
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>
    );
  }

  if (isError || !client) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Client not found.</p>
        <Link href="/clients" className="mt-2 text-sm text-blue-600 hover:underline">
          ← Back to clients
        </Link>
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700',
    PAUSED: 'bg-yellow-50 text-yellow-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/clients" className="hover:text-gray-600">
          Clients
        </Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium">
          {client.user.firstName} {client.user.lastName}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-lg font-bold">
            {initials(client.user.firstName, client.user.lastName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {client.user.firstName} {client.user.lastName}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[client.status]}`}>
                {client.status.charAt(0) + client.status.slice(1).toLowerCase()}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{client.user.email}</p>
          </div>
        </div>

        <button
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab client={client} />}
      {activeTab === 'calendar' && <CalendarTab clientId={clientId} />}
      {activeTab === 'metrics' && <MetricsTab clientId={clientId} />}

      {/* Edit panel */}
      {editOpen && <EditPanel client={client} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
