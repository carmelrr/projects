export const Permission = {
  // Clients
  CLIENT_CREATE: 'client.create',
  CLIENT_READ_OWN: 'client.read.own',
  CLIENT_READ_ALL: 'client.read.all',
  CLIENT_UPDATE: 'client.update',
  CLIENT_ARCHIVE: 'client.archive',
  CLIENT_DELETE: 'client.delete',
  CLIENT_ASSIGN: 'client.assign',

  // Programs & Workouts
  PROGRAM_CREATE: 'program.create',
  PROGRAM_READ: 'program.read',
  PROGRAM_UPDATE: 'program.update',
  PROGRAM_DELETE: 'program.delete',
  WORKOUT_ASSIGN: 'workout.assign',
  WORKOUT_LOG_READ: 'workout.log.read',
  WORKOUT_LOG_CREATE: 'workout.log.create',
  WORKOUT_FEEDBACK: 'workout.feedback',

  // Exercises
  EXERCISE_CREATE: 'exercise.create',
  EXERCISE_READ: 'exercise.read',
  EXERCISE_UPDATE: 'exercise.update',
  EXERCISE_DELETE: 'exercise.delete',

  // Messaging
  MESSAGE_SEND: 'message.send',
  MESSAGE_READ: 'message.read',

  // Metrics
  METRIC_DEFINE: 'metric.define',
  METRIC_READ: 'metric.read',
  METRIC_LOG: 'metric.log',

  // Org management
  ORG_SETTINGS_READ: 'org.settings.read',
  ORG_SETTINGS_UPDATE: 'org.settings.update',
  ORG_MEMBER_MANAGE: 'org.member.manage',

  // Admin
  AUDIT_LOG_READ: 'audit.log.read',
  USER_MANAGE: 'user.manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
