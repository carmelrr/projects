'use client';

import { useState } from 'react';
import { useExercises, useCreateExercise, useUpdateExercise, useDeleteExercise, type Exercise } from '@/hooks/useExercises';

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = ['Strength', 'Cardio', 'Mobility', 'Plyometric', 'Stretching', 'Balance', 'Olympic'];

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Full Body',
];

const EQUIPMENT = [
  'Barbell', 'Dumbbell', 'Kettlebell', 'Cable', 'Machine',
  'Bodyweight', 'Resistance Band', 'Pull-up Bar', 'Foam Roller',
];

const DIFFICULTY_COLORS = {
  BEGINNER: 'bg-green-50 text-green-700',
  INTERMEDIATE: 'bg-amber-50 text-amber-700',
  ADVANCED: 'bg-red-50 text-red-600',
};

// ── Exercise Form (modal) ──────────────────────────────────────────────────

function ExerciseModal({
  initial,
  onClose,
}: {
  initial?: Exercise;
  onClose: () => void;
}) {
  const create = useCreateExercise();
  const update = useUpdateExercise();

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    instructions: initial?.instructions ?? '',
    category: initial?.category ?? '',
    muscleGroups: initial?.muscleGroups ?? [] as string[],
    equipment: initial?.equipment ?? [] as string[],
    difficulty: (initial?.difficulty ?? 'BEGINNER') as Exercise['difficulty'],
    videoUrl: initial?.videoUrl ?? '',
  });

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toggleArr = (field: 'muscleGroups' | 'equipment', val: string) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(val)
        ? f[field].filter((v) => v !== val)
        : [...f[field], val],
    }));

  const save = async () => {
    if (!form.name.trim()) return;
    if (initial) {
      await update.mutateAsync({ id: initial.id, ...form });
    } else {
      await create.mutateAsync(form);
    }
    onClose();
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Edit Exercise' : 'New Exercise'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handle}
              placeholder="e.g. Barbell Back Squat"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handle}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={handle}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Muscle Groups</label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleArr('muscleGroups', m)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    form.muscleGroups.includes(m)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Equipment</label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleArr('equipment', e)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    form.equipment.includes(e)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handle}
              rows={2}
              placeholder="Short description…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              name="instructions"
              value={form.instructions}
              onChange={handle}
              rows={3}
              placeholder="Step-by-step coaching cues…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Video URL</label>
            <input
              name="videoUrl"
              value={form.videoUrl}
              onChange={handle}
              placeholder="https://youtube.com/…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={isPending || !form.name.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : initial ? 'Save changes' : 'Create exercise'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exercise Card ──────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
      {/* Actions */}
      {!exercise.isSystem && (
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Edit"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{exercise.name}</p>
            {exercise.isSystem && (
              <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-600">System</span>
            )}
          </div>
          {exercise.category && (
            <p className="text-xs text-gray-400 mt-0.5">{exercise.category}</p>
          )}
        </div>
      </div>

      {exercise.difficulty && (
        <div className="mt-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[exercise.difficulty]}`}>
            {exercise.difficulty.charAt(0) + exercise.difficulty.slice(1).toLowerCase()}
          </span>
        </div>
      )}

      {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {exercise.muscleGroups.map((m) => (
            <span key={m} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {m}
            </span>
          ))}
        </div>
      )}

      {exercise.description && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{exercise.description}</p>
      )}

      {exercise.videoUrl && (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Watch video
        </a>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Exercise | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useExercises({
    search: search || undefined,
    category: category || undefined,
    muscleGroup: muscleGroup || undefined,
  });
  const deleteExercise = useDeleteExercise();

  const exercises = data?.items ?? [];
  const total = data?.total ?? 0;

  const openCreate = () => { setEditTarget(undefined); setShowModal(true); };
  const openEdit = (ex: Exercise) => { setEditTarget(ex); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditTarget(undefined); };

  const confirmDelete = async (id: string) => {
    await deleteExercise.mutateAsync(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exercises</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} exercises</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New exercise
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
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
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-52"
          />
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Muscle group filter */}
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
          <p className="font-medium text-gray-500">No exercises found</p>
          <p className="mt-1 text-sm text-gray-400">
            {search || category || muscleGroup
              ? 'Try adjusting your filters.'
              : 'Create your first exercise to get started.'}
          </p>
          {!search && !category && !muscleGroup && (
            <button
              onClick={openCreate}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create exercise
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onEdit={() => openEdit(ex)}
              onDelete={() => setDeleteConfirm(ex.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && <ExerciseModal initial={editTarget} onClose={closeModal} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900">Delete exercise?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This cannot be undone. The exercise will be removed from your library.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirm)}
                disabled={deleteExercise.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteExercise.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
