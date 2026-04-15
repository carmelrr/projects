'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useProgram,
  useUpdateProgram,
  useAddProgramWeek,
  useAssignProgram,
  type ProgramWeek,
} from '@/hooks/usePrograms';
import { useWorkouts, type Workout } from '@/hooks/useWorkouts';
import { useClients } from '@/hooks/useClients';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

// ── Workout Picker Modal ───────────────────────────────────────────────────

function WorkoutPicker({
  onSelect,
  onClose,
}: {
  onSelect: (workout: Workout) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const { data } = useWorkouts({ search: search || undefined });
  const workouts = data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Add Workout</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              placeholder="Search workouts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {workouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No workouts found.</p>
          ) : (
            workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => { onSelect(w); onClose(); }}
                className="w-full rounded-lg border border-gray-100 p-3 text-left hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <p className="font-medium text-sm text-gray-900">{w.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {w.items?.length ?? 0} exercise{(w.items?.length ?? 0) !== 1 ? 's' : ''}
                  {w.estimatedDuration ? ` · ${w.estimatedDuration} min` : ''}
                  {w.type ? ` · ${w.type}` : ''}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Assign Modal ───────────────────────────────────────────────────────────

function AssignModal({ programId, onClose }: { programId: string; onClose: () => void }) {
  const { data: clientsData } = useClients({ status: 'ACTIVE', limit: 100 });
  const assign = useAssignProgram();
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [success, setSuccess] = useState(false);

  const save = async () => {
    if (!clientId || !startDate) return;
    await assign.mutateAsync({ id: programId, clientId, startDate });
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Assign to Client</h2>
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
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
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

// ── Week Card ──────────────────────────────────────────────────────────────

function WeekCard({
  week,
  weekIndex,
  programId,
  onAddWorkout,
}: {
  week: ProgramWeek;
  weekIndex: number;
  programId: string;
  onAddWorkout: (weekIndex: number) => void;
}) {
  const qc = useQueryClient();
  const { data: allWorkouts } = useWorkouts();

  // Resolve workout titles from IDs
  const workoutsMap = new Map((allWorkouts?.items ?? []).map((w) => [w.id, w]));

  const removeWorkout = async (workoutId: string) => {
    const updated = week.workoutIds.filter((id) => id !== workoutId);
    await api.patch(`/programs/${programId}/weeks/${week.id}`, { workoutIds: updated });
    qc.invalidateQueries({ queryKey: ['program', programId] });
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Week header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Week {weekIndex + 1}
          </span>
          {week.title && (
            <span className="ml-2 text-sm font-medium text-gray-700">— {week.title}</span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {week.workoutIds?.length ?? 0} workout{(week.workoutIds?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Workout list */}
      <div className="divide-y divide-gray-50">
        {(!week.workoutIds || week.workoutIds.length === 0) ? (
          <p className="px-5 py-4 text-sm text-gray-400 italic">No workouts yet — add one below.</p>
        ) : (
          week.workoutIds.map((wid) => {
            const workout = workoutsMap.get(wid);
            return (
              <div key={wid} className="flex items-center gap-3 px-5 py-3">
                {/* Drag handle placeholder */}
                <svg className="h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {workout?.title ?? wid}
                  </p>
                  {workout && (
                    <p className="text-xs text-gray-400">
                      {workout.items?.length ?? 0} exercise{(workout.items?.length ?? 0) !== 1 ? 's' : ''}
                      {workout.estimatedDuration ? ` · ${workout.estimatedDuration} min` : ''}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => removeWorkout(wid)}
                  className="flex-shrink-0 rounded p-1 text-gray-300 hover:text-red-400 transition-colors"
                  title="Remove workout"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add workout button */}
      <div className="border-t border-gray-50 px-5 py-3">
        <button
          onClick={() => onAddWorkout(weekIndex)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add workout
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = params.programId as string;
  const qc = useQueryClient();

  const { data: program, isLoading, isError } = useProgram(programId);
  const updateProgram = useUpdateProgram();
  const addWeek = useAddProgramWeek();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [pickerWeekIndex, setPickerWeekIndex] = useState<number | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  }

  if (isError || !program) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Program not found.</p>
        <Link href="/programs" className="mt-2 text-sm text-blue-600 hover:underline">← Back to programs</Link>
      </div>
    );
  }

  const saveTitle = async () => {
    if (titleDraft.trim() && titleDraft !== program.title) {
      await updateProgram.mutateAsync({ id: programId, title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleAddWorkoutToWeek = async (workout: Workout) => {
    if (pickerWeekIndex === null) return;
    const week = program.weeks[pickerWeekIndex];
    if (!week) return;

    const updated = [...(week.workoutIds ?? []), workout.id];
    await api.patch(`/programs/${programId}/weeks/${week.id}`, { workoutIds: updated });
    qc.invalidateQueries({ queryKey: ['program', programId] });
    setPickerWeekIndex(null);
  };

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/programs" className="hover:text-gray-600">Programs</Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium truncate">{program.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent outline-none w-full"
              />
              <button onClick={saveTitle} className="text-xs text-blue-600 hover:underline flex-shrink-0">Save</button>
              <button onClick={() => setEditingTitle(false)} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{program.title}</h1>
              <button
                onClick={() => { setTitleDraft(program.title); setEditingTitle(true); }}
                className="opacity-0 group-hover:opacity-100 rounded p-1 text-gray-400 hover:text-gray-600 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}

          {program.description && (
            <p className="mt-1 text-sm text-gray-500">{program.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {program.isPrivate && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Private</span>
            )}
            {program.tags?.map((t) => (
              <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{t}</span>
            ))}
            <span className="text-xs text-gray-400">
              {program.weeks?.length ?? 0} week{(program.weeks?.length ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowAssign(true)}
          className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Assign to client
        </button>
      </div>

      {/* Weeks */}
      <div className="space-y-4">
        {(program.weeks ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-white py-12 text-center shadow-sm ring-1 ring-gray-100">
            <p className="font-medium text-gray-500">No weeks yet</p>
            <p className="mt-1 text-sm text-gray-400">Add a week to start building this program.</p>
          </div>
        ) : (
          program.weeks.map((week, i) => (
            <WeekCard
              key={week.id}
              week={week}
              weekIndex={i}
              programId={programId}
              onAddWorkout={(weekIndex) => setPickerWeekIndex(weekIndex)}
            />
          ))
        )}

        {/* Add week */}
        <button
          onClick={() => addWeek.mutate({ programId })}
          disabled={addWeek.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {addWeek.isPending ? 'Adding…' : 'Add week'}
        </button>
      </div>

      {/* Workout picker */}
      {pickerWeekIndex !== null && (
        <WorkoutPicker
          onSelect={handleAddWorkoutToWeek}
          onClose={() => setPickerWeekIndex(null)}
        />
      )}

      {/* Assign modal */}
      {showAssign && <AssignModal programId={programId} onClose={() => setShowAssign(false)} />}
    </div>
  );
}
