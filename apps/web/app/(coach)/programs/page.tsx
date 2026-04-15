'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  usePrograms,
  useCreateProgram,
  useDeleteProgram,
  useDuplicateProgram,
  type Program,
} from '@/hooks/usePrograms';
import { useClients } from '@/hooks/useClients';
import { useAssignProgram } from '@/hooks/usePrograms';

// ── Create/Edit Modal ──────────────────────────────────────────────────────

function ProgramModal({
  initial,
  onClose,
}: {
  initial?: Program;
  onClose: () => void;
}) {
  const create = useCreateProgram();
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    isPrivate: initial?.isPrivate ?? false,
    tagInput: '',
    tags: initial?.tags ?? [] as string[],
  });

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const addTag = () => {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: '' }));
    }
  };

  const removeTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const save = async () => {
    if (!form.title.trim()) return;
    await create.mutateAsync({
      title: form.title,
      description: form.description || undefined,
      isPrivate: form.isPrivate,
      tags: form.tags.length ? form.tags : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">New Program</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handle}
              placeholder="e.g. 12-Week Strength Builder"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handle}
              rows={3}
              placeholder="What's this program for?"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input
                value={form.tagInput}
                onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {t}
                    <button onClick={() => removeTag(t)} className="text-blue-400 hover:text-blue-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) => setForm((f) => ({ ...f, isPrivate: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Private (only visible to you)</span>
          </label>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={create.isPending || !form.title.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create program'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Modal ───────────────────────────────────────────────────────────

function AssignModal({ program, onClose }: { program: Program; onClose: () => void }) {
  const { data: clientsData } = useClients({ status: 'ACTIVE', limit: 100 });
  const assign = useAssignProgram();
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [success, setSuccess] = useState(false);

  const save = async () => {
    if (!clientId || !startDate) return;
    await assign.mutateAsync({ id: program.id, clientId, startDate });
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Assign Program</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl mb-3">✓</div>
            <p className="font-medium text-gray-900">Program assigned!</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">
                Assigning <span className="font-medium text-gray-800">{program.title}</span>
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select client…</option>
                  {(clientsData?.items ?? []).map((c) => (
                    <option key={c.id} value={c.user.id}>
                      {c.user.firstName} {c.user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={assign.isPending || !clientId}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {assign.isPending ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Program Card ───────────────────────────────────────────────────────────

function ProgramCard({
  program,
  onAssign,
  onDuplicate,
  onDelete,
}: {
  program: Program;
  onAssign: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const weekCount = program.weeks?.length ?? 0;

  return (
    <div className="group flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/programs/${program.id}`}
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {program.title}
            </Link>
            {program.isPrivate && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">Private</span>
            )}
          </div>
          {program.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{program.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {weekCount} {weekCount === 1 ? 'week' : 'weeks'}
        </span>
        <span>·</span>
        <span>{new Date(program.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Tags */}
      {program.tags && program.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {program.tags.map((t) => (
            <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2 pt-3 border-t border-gray-50">
        <button
          onClick={onAssign}
          className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Assign
        </button>
        <button
          onClick={onDuplicate}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          title="Duplicate"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <Link
          href={`/programs/${program.id}`}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          title="Edit"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </Link>
        <button
          onClick={onDelete}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
          title="Delete"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Program | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = usePrograms({ search: search || undefined });
  const deleteProgram = useDeleteProgram();
  const duplicateProgram = useDuplicateProgram();

  const programs = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} programs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New program
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-64">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            placeholder="Search programs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
          <p className="font-medium text-gray-500">No programs yet</p>
          <p className="mt-1 text-sm text-gray-400">
            {search ? 'Try a different search.' : 'Create a program to start structuring your clients\' training.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create program
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              onAssign={() => setAssignTarget(p)}
              onDuplicate={() => duplicateProgram.mutate(p.id)}
              onDelete={() => setDeleteConfirm(p.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && <ProgramModal onClose={() => setShowModal(false)} />}
      {assignTarget && <AssignModal program={assignTarget} onClose={() => setAssignTarget(null)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900">Delete program?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will permanently delete the program. Existing assignments will not be affected.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={async () => { await deleteProgram.mutateAsync(deleteConfirm); setDeleteConfirm(null); }}
                disabled={deleteProgram.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteProgram.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
