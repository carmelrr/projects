import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private _app!: admin.app.App;
  private _db!: admin.firestore.Firestore;
  private _auth!: admin.auth.Auth;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const serviceAccountJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    const serviceAccountPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
      this._app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      this.logger.log('Firebase initialized from FIREBASE_SERVICE_ACCOUNT env var');
    } else if (serviceAccountPath) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(path.resolve(serviceAccountPath));
      this._app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      this.logger.log('Firebase initialized from service account file');
    } else {
      this._app = admin.initializeApp({ projectId });
      this.logger.log('Firebase initialized with default credentials');
    }

    this._db = admin.firestore(this._app);
    this._auth = admin.auth(this._app);
  }

  get db(): admin.firestore.Firestore {
    return this._db;
  }

  get auth(): admin.auth.Auth {
    return this._auth;
  }

  get app(): admin.app.App {
    return this._app;
  }

  // ── Top-level collections ───────────────────────────────────────────

  users() {
    return this._db.collection('users');
  }

  organizations() {
    return this._db.collection('organizations');
  }

  exercises() {
    return this._db.collection('exercises');
  }

  // ── User sub-collections ────────────────────────────────────────────

  sessions(userId: string) {
    return this._db.collection('users').doc(userId).collection('sessions');
  }

  notifications(userId: string) {
    return this._db.collection('users').doc(userId).collection('notifications');
  }

  // ── Organization sub-collections ────────────────────────────────────

  orgExercises(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('exercises');
  }

  workouts(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('workouts');
  }

  workoutInstances(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('workoutInstances');
  }

  workoutLogs(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('workoutLogs');
  }

  programs(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('programs');
  }

  clientAssignments(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('clientAssignments');
  }

  auditLogs(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('auditLogs');
  }

  threads(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('threads');
  }

  messages(orgId: string, threadId: string) {
    return this._db.collection('organizations').doc(orgId).collection('threads').doc(threadId).collection('messages');
  }

  metricDefinitions(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('metricDefinitions');
  }

  metricEntries(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('metricEntries');
  }

  complianceSummaries(orgId: string) {
    return this._db.collection('organizations').doc(orgId).collection('complianceSummaries');
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  batch() {
    return this._db.batch();
  }

  generateId() {
    return this._db.collection('_').doc().id;
  }
}
