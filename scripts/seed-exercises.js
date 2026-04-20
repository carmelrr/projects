const admin = require('firebase-admin');
const sa = require('../../firebase-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });

const orgId = 'YP5CAp4lwgZ2ZFalLYVm';
const db = admin.firestore();

const exercises = [
  { name: 'Barbell Back Squat', category: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['barbell'], difficulty: 'intermediate', description: 'Compound lower body lift.', cues: 'Brace core, break at hips and knees, chest up.' },
  { name: 'Conventional Deadlift', category: 'strength', muscleGroups: ['back', 'glutes', 'hamstrings'], equipment: ['barbell'], difficulty: 'advanced', description: 'Full body posterior chain lift.', cues: 'Bar over mid-foot, neutral spine, push the floor away.' },
  { name: 'Overhead Press', category: 'strength', muscleGroups: ['shoulders', 'triceps'], equipment: ['barbell'], difficulty: 'intermediate', description: 'Strict standing press.', cues: 'Tight glutes, press to lockout, tuck chin under.' },
  { name: 'Pull-Up', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['pull_up_bar'], difficulty: 'intermediate', description: 'Bodyweight vertical pull.', cues: 'Full hang, pull elbows down, chest to bar.' },
  { name: 'Dumbbell Row', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['dumbbell'], difficulty: 'beginner', description: 'Unilateral back builder.', cues: 'Flat back, row to hip, squeeze lats.' },
  { name: 'Romanian Deadlift', category: 'strength', muscleGroups: ['hamstrings', 'glutes'], equipment: ['barbell'], difficulty: 'intermediate', description: 'Hip hinge for posterior chain.', cues: 'Soft knees, push hips back, feel the stretch.' },
  { name: 'Plank', category: 'core', muscleGroups: ['core'], equipment: ['bodyweight'], difficulty: 'beginner', description: 'Isometric core hold.', cues: 'Straight line, squeeze glutes, brace abs.' },
  { name: 'Dumbbell Lunges', category: 'strength', muscleGroups: ['quads', 'glutes'], equipment: ['dumbbell'], difficulty: 'beginner', description: 'Unilateral leg builder.', cues: 'Long stride, knee over ankle, drive through front heel.' },
];

(async () => {
  const now = new Date().toISOString();
  const batch = db.batch();
  const col = db.collection('organizations').doc(orgId).collection('exercises');
  for (const ex of exercises) {
    const ref = col.doc();
    batch.set(ref, {
      ...ex,
      isGlobal: false,
      orgId,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  console.log('Seeded', exercises.length, 'exercises');
  process.exit(0);
})();
