import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SYSTEM_EXERCISES = [
  // Chest
  { name: 'Barbell Bench Press', category: 'Strength', muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Barbell', 'Bench'], tags: ['compound', 'push'] },
  { name: 'Incline Dumbbell Press', category: 'Strength', muscleGroups: ['Chest', 'Shoulders'], equipment: ['Dumbbells', 'Bench'], tags: ['compound', 'push'] },
  { name: 'Dumbbell Fly', category: 'Strength', muscleGroups: ['Chest'], equipment: ['Dumbbells', 'Bench'], tags: ['isolation', 'push'] },
  { name: 'Cable Crossover', category: 'Strength', muscleGroups: ['Chest'], equipment: ['Cable Machine'], tags: ['isolation', 'push'] },
  { name: 'Push-Up', category: 'Strength', muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Bodyweight'], tags: ['compound', 'push', 'bodyweight'] },
  { name: 'Decline Bench Press', category: 'Strength', muscleGroups: ['Chest', 'Triceps'], equipment: ['Barbell', 'Bench'], tags: ['compound', 'push'] },

  // Back
  { name: 'Deadlift', category: 'Strength', muscleGroups: ['Back', 'Hamstrings', 'Glutes'], equipment: ['Barbell'], tags: ['compound', 'pull', 'hinge'] },
  { name: 'Barbell Row', category: 'Strength', muscleGroups: ['Back', 'Biceps'], equipment: ['Barbell'], tags: ['compound', 'pull'] },
  { name: 'Pull-Up', category: 'Strength', muscleGroups: ['Back', 'Biceps'], equipment: ['Pull-Up Bar'], tags: ['compound', 'pull', 'bodyweight'] },
  { name: 'Lat Pulldown', category: 'Strength', muscleGroups: ['Back', 'Biceps'], equipment: ['Cable Machine'], tags: ['compound', 'pull'] },
  { name: 'Seated Cable Row', category: 'Strength', muscleGroups: ['Back', 'Biceps'], equipment: ['Cable Machine'], tags: ['compound', 'pull'] },
  { name: 'Dumbbell Row', category: 'Strength', muscleGroups: ['Back', 'Biceps'], equipment: ['Dumbbells', 'Bench'], tags: ['compound', 'pull'] },
  { name: 'Face Pull', category: 'Strength', muscleGroups: ['Rear Delts', 'Upper Back'], equipment: ['Cable Machine'], tags: ['isolation', 'pull'] },
  { name: 'T-Bar Row', category: 'Strength', muscleGroups: ['Back', 'Biceps'], equipment: ['Barbell', 'Landmine'], tags: ['compound', 'pull'] },

  // Shoulders
  { name: 'Overhead Press', category: 'Strength', muscleGroups: ['Shoulders', 'Triceps'], equipment: ['Barbell'], tags: ['compound', 'push'] },
  { name: 'Lateral Raise', category: 'Strength', muscleGroups: ['Shoulders'], equipment: ['Dumbbells'], tags: ['isolation', 'push'] },
  { name: 'Front Raise', category: 'Strength', muscleGroups: ['Shoulders'], equipment: ['Dumbbells'], tags: ['isolation', 'push'] },
  { name: 'Arnold Press', category: 'Strength', muscleGroups: ['Shoulders', 'Triceps'], equipment: ['Dumbbells'], tags: ['compound', 'push'] },
  { name: 'Rear Delt Fly', category: 'Strength', muscleGroups: ['Rear Delts'], equipment: ['Dumbbells'], tags: ['isolation', 'pull'] },

  // Arms
  { name: 'Barbell Curl', category: 'Strength', muscleGroups: ['Biceps'], equipment: ['Barbell'], tags: ['isolation', 'pull'] },
  { name: 'Dumbbell Curl', category: 'Strength', muscleGroups: ['Biceps'], equipment: ['Dumbbells'], tags: ['isolation', 'pull'] },
  { name: 'Hammer Curl', category: 'Strength', muscleGroups: ['Biceps', 'Forearms'], equipment: ['Dumbbells'], tags: ['isolation', 'pull'] },
  { name: 'Tricep Pushdown', category: 'Strength', muscleGroups: ['Triceps'], equipment: ['Cable Machine'], tags: ['isolation', 'push'] },
  { name: 'Skull Crusher', category: 'Strength', muscleGroups: ['Triceps'], equipment: ['Barbell', 'Bench'], tags: ['isolation', 'push'] },
  { name: 'Dip', category: 'Strength', muscleGroups: ['Triceps', 'Chest', 'Shoulders'], equipment: ['Dip Station'], tags: ['compound', 'push', 'bodyweight'] },
  { name: 'Overhead Tricep Extension', category: 'Strength', muscleGroups: ['Triceps'], equipment: ['Dumbbells'], tags: ['isolation', 'push'] },

  // Legs
  { name: 'Barbell Back Squat', category: 'Strength', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Barbell', 'Squat Rack'], tags: ['compound', 'push', 'squat'] },
  { name: 'Front Squat', category: 'Strength', muscleGroups: ['Quads', 'Core'], equipment: ['Barbell', 'Squat Rack'], tags: ['compound', 'push', 'squat'] },
  { name: 'Romanian Deadlift', category: 'Strength', muscleGroups: ['Hamstrings', 'Glutes'], equipment: ['Barbell'], tags: ['compound', 'pull', 'hinge'] },
  { name: 'Leg Press', category: 'Strength', muscleGroups: ['Quads', 'Glutes'], equipment: ['Leg Press Machine'], tags: ['compound', 'push'] },
  { name: 'Walking Lunge', category: 'Strength', muscleGroups: ['Quads', 'Glutes'], equipment: ['Dumbbells'], tags: ['compound', 'unilateral'] },
  { name: 'Bulgarian Split Squat', category: 'Strength', muscleGroups: ['Quads', 'Glutes'], equipment: ['Dumbbells', 'Bench'], tags: ['compound', 'unilateral'] },
  { name: 'Leg Extension', category: 'Strength', muscleGroups: ['Quads'], equipment: ['Leg Extension Machine'], tags: ['isolation'] },
  { name: 'Leg Curl', category: 'Strength', muscleGroups: ['Hamstrings'], equipment: ['Leg Curl Machine'], tags: ['isolation'] },
  { name: 'Calf Raise', category: 'Strength', muscleGroups: ['Calves'], equipment: ['Smith Machine'], tags: ['isolation'] },
  { name: 'Hip Thrust', category: 'Strength', muscleGroups: ['Glutes', 'Hamstrings'], equipment: ['Barbell', 'Bench'], tags: ['compound', 'hinge'] },
  { name: 'Goblet Squat', category: 'Strength', muscleGroups: ['Quads', 'Glutes'], equipment: ['Dumbbell'], tags: ['compound', 'squat'] },

  // Core
  { name: 'Plank', category: 'Strength', muscleGroups: ['Core'], equipment: ['Bodyweight'], tags: ['isometric', 'bodyweight'] },
  { name: 'Ab Rollout', category: 'Strength', muscleGroups: ['Core'], equipment: ['Ab Wheel'], tags: ['isolation'] },
  { name: 'Hanging Leg Raise', category: 'Strength', muscleGroups: ['Core', 'Hip Flexors'], equipment: ['Pull-Up Bar'], tags: ['isolation', 'bodyweight'] },
  { name: 'Cable Woodchop', category: 'Strength', muscleGroups: ['Core', 'Obliques'], equipment: ['Cable Machine'], tags: ['isolation', 'rotational'] },
  { name: 'Russian Twist', category: 'Strength', muscleGroups: ['Core', 'Obliques'], equipment: ['Bodyweight'], tags: ['isolation', 'rotational', 'bodyweight'] },
  { name: 'Dead Bug', category: 'Strength', muscleGroups: ['Core'], equipment: ['Bodyweight'], tags: ['stability', 'bodyweight'] },

  // Cardio
  { name: 'Treadmill Run', category: 'Cardio', muscleGroups: ['Full Body'], equipment: ['Treadmill'], tags: ['cardio', 'steady-state'] },
  { name: 'Rowing Machine', category: 'Cardio', muscleGroups: ['Full Body'], equipment: ['Rowing Machine'], tags: ['cardio'] },
  { name: 'Assault Bike', category: 'Cardio', muscleGroups: ['Full Body'], equipment: ['Assault Bike'], tags: ['cardio', 'hiit'] },
  { name: 'Jump Rope', category: 'Cardio', muscleGroups: ['Full Body', 'Calves'], equipment: ['Jump Rope'], tags: ['cardio', 'conditioning'] },
  { name: 'Box Jump', category: 'Cardio', muscleGroups: ['Quads', 'Glutes'], equipment: ['Plyo Box'], tags: ['plyometric', 'power'] },
  { name: 'Battle Ropes', category: 'Cardio', muscleGroups: ['Shoulders', 'Core'], equipment: ['Battle Ropes'], tags: ['cardio', 'conditioning'] },

  // Mobility
  { name: 'Foam Roll', category: 'Mobility', muscleGroups: ['Full Body'], equipment: ['Foam Roller'], tags: ['mobility', 'recovery'] },
  { name: 'Hip 90/90 Stretch', category: 'Mobility', muscleGroups: ['Hips'], equipment: ['Bodyweight'], tags: ['mobility', 'stretch'] },
  { name: 'Cat-Cow', category: 'Mobility', muscleGroups: ['Spine'], equipment: ['Bodyweight'], tags: ['mobility', 'warmup'] },
  { name: 'World\'s Greatest Stretch', category: 'Mobility', muscleGroups: ['Full Body'], equipment: ['Bodyweight'], tags: ['mobility', 'warmup'] },
  { name: 'Thoracic Spine Rotation', category: 'Mobility', muscleGroups: ['Spine', 'Upper Back'], equipment: ['Bodyweight'], tags: ['mobility'] },
];

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create system exercises
  console.log('Creating system exercises...');
  for (const ex of SYSTEM_EXERCISES) {
    await prisma.exercise.upsert({
      where: { id: `sys-${ex.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` },
      update: {},
      create: {
        id: `sys-${ex.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: ex.name,
        category: ex.category,
        muscleGroups: ex.muscleGroups,
        equipment: ex.equipment,
        tags: ex.tags,
        isSystem: true,
        defaultUnits: ex.category === 'Cardio' ? 'TIME' : 'REPS_WEIGHT',
      },
    });
  }
  console.log(`✅ ${SYSTEM_EXERCISES.length} system exercises created`);

  // 2. Create demo org + users (dev only)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Creating demo data...');

    const passwordHash = await bcrypt.hash('password123', 12);

    const org = await prisma.organization.upsert({
      where: { slug: 'demo-gym' },
      update: {},
      create: {
        id: 'demo-org',
        name: 'Demo Gym',
        slug: 'demo-gym',
        timezone: 'America/New_York',
      },
    });

    // Owner/Coach
    const owner = await prisma.user.upsert({
      where: { email: 'coach@demo.com' },
      update: {},
      create: {
        id: 'demo-coach',
        email: 'coach@demo.com',
        passwordHash,
        firstName: 'Demo',
        lastName: 'Coach',
      },
    });

    await prisma.userOrganization.upsert({
      where: { userId_orgId: { userId: owner.id, orgId: org.id } },
      update: {},
      create: { userId: owner.id, orgId: org.id, role: 'OWNER', joinedAt: new Date() },
    });

    const coachProfile = await prisma.coachProfile.upsert({
      where: { userId: owner.id },
      update: {},
      create: {
        id: 'demo-coach-profile',
        userId: owner.id,
        orgId: org.id,
        bio: 'Experienced strength and conditioning coach',
        specialties: ['Strength Training', 'Hypertrophy', 'Powerlifting'],
      },
    });

    // Client 1
    const client1 = await prisma.user.upsert({
      where: { email: 'client1@demo.com' },
      update: {},
      create: {
        id: 'demo-client-1',
        email: 'client1@demo.com',
        passwordHash,
        firstName: 'Alice',
        lastName: 'Smith',
      },
    });

    await prisma.userOrganization.upsert({
      where: { userId_orgId: { userId: client1.id, orgId: org.id } },
      update: {},
      create: { userId: client1.id, orgId: org.id, role: 'CLIENT', joinedAt: new Date() },
    });

    const clientProfile1 = await prisma.clientProfile.upsert({
      where: { userId: client1.id },
      update: {},
      create: {
        id: 'demo-client-profile-1',
        userId: client1.id,
        orgId: org.id,
        goals: 'Build muscle, improve squat',
        heightCm: 165,
      },
    });

    await prisma.clientAssignment.upsert({
      where: { id: 'demo-assignment-1' },
      update: {},
      create: {
        id: 'demo-assignment-1',
        clientId: clientProfile1.id,
        coachId: coachProfile.id,
      },
    });

    // Client 2
    const client2 = await prisma.user.upsert({
      where: { email: 'client2@demo.com' },
      update: {},
      create: {
        id: 'demo-client-2',
        email: 'client2@demo.com',
        passwordHash,
        firstName: 'Bob',
        lastName: 'Johnson',
      },
    });

    await prisma.userOrganization.upsert({
      where: { userId_orgId: { userId: client2.id, orgId: org.id } },
      update: {},
      create: { userId: client2.id, orgId: org.id, role: 'CLIENT', joinedAt: new Date() },
    });

    const clientProfile2 = await prisma.clientProfile.upsert({
      where: { userId: client2.id },
      update: {},
      create: {
        id: 'demo-client-profile-2',
        userId: client2.id,
        orgId: org.id,
        goals: 'Lose weight, improve conditioning',
        heightCm: 180,
      },
    });

    await prisma.clientAssignment.upsert({
      where: { id: 'demo-assignment-2' },
      update: {},
      create: {
        id: 'demo-assignment-2',
        clientId: clientProfile2.id,
        coachId: coachProfile.id,
      },
    });

    // Default metric definitions
    const metrics = [
      { name: 'Body Weight', unit: 'kg', targetType: 'LOWER_IS_BETTER' as const },
      { name: 'Body Fat %', unit: '%', targetType: 'LOWER_IS_BETTER' as const },
      { name: 'Back Squat 1RM', unit: 'kg', targetType: 'HIGHER_IS_BETTER' as const },
      { name: 'Bench Press 1RM', unit: 'kg', targetType: 'HIGHER_IS_BETTER' as const },
      { name: 'Deadlift 1RM', unit: 'kg', targetType: 'HIGHER_IS_BETTER' as const },
    ];

    for (const m of metrics) {
      await prisma.metricDefinition.upsert({
        where: { id: `demo-metric-${m.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` },
        update: {},
        create: {
          id: `demo-metric-${m.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          orgId: org.id,
          name: m.name,
          unit: m.unit,
          targetType: m.targetType,
          isSystem: true,
        },
      });
    }

    console.log('✅ Demo data created');
    console.log('   Coach: coach@demo.com / password123');
    console.log('   Client1: client1@demo.com / password123');
    console.log('   Client2: client2@demo.com / password123');
  }

  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
