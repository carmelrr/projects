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
    const serviceAccountPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');

    if (serviceAccountPath) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(path.resolve(serviceAccountPath));
      this._app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else {
      // Fall back to application default credentials (for Cloud Run, etc.)
      this._app = admin.initializeApp({
        projectId,
      });
    }

    this._db = this._app.firestore();
    this._auth = this._app.auth();

    // Use Firestore settings for better dev experience
    this._db.settings({ ignoreUndefinedProperties: true });

    this.logger.log(`Firebase initialized (project: ${projectId || 'default'})`);
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

  // ────── Collection helpers ──────

  // Top-level collections
  users() { return this._db.collection('users'); }
  organizations() { return this._db.collection('organizations'); }
  exercises() { return this._db.collection('exercises'); }

  // Org-scoped collections
  orgExercises(orgId: string) { return this._db.collection(`organizations/${orgId}/exercises`); }
  programs(orgId: string) { return this._db.collection(`organizations/${orgId}/programs`); }
  programWeeks(orgId: string, programId: string) { return this._db.collection(`organizations/${orgId}/programs/${programId}/weeks`); }
  workouts(orgId: string) { return this._db.collection(`organizations/${orgId}/workouts`); }
  workoutInstances(orgId: string) { return this._db.collection(`organizations/${orgId}/workoutInstances`); }
  workoutLogs(orgId: string) { return this._db.collection(`organizations/${orgId}/workoutLogs`); }
  clientAssignments(orgId: string) { return this._db.collection(`organizations/${orgId}/clientAssignments`); }
  threads(orgId: string) { return this._db.collection(`organizations/${orgId}/threads`); }
  messages(orgId: string, threadId: string) { return this._db.collection(`organizations/${orgId}/threads/${threadId}/messages`); }
  metricDefinitions(orgId: string) { return this._db.collection(`organizations/${orgId}/metricDefinitions`); }
  metricEntries(orgId: string) { return this._db.collection(`organizations/${orgId}/metricEntries`); }
  complianceSummaries(orgId: string) { return this._db.collection(`organizations/${orgId}/complianceSummaries`); }
  auditLogs(orgId: string) { return this._db.collection(`organizations/${orgId}/auditLogs`); }

  // User-scoped collections
  sessions(userId: string) { return this._db.collection(`users/${userId}/sessions`); }
  notifications(userId: string) { return this._db.collection(`users/${userId}/notifications`); }

  // ────── Utility helpers ──────

  /** Generate a Firestore-style random ID */
  generateId(): string {
    return this._db.collection('_').doc().id;
  }

  /** Firestore server timestamp */
  timestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /** Firestore array union */
  arrayUnion(...elements: unknown[]) {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  }

  /** Firestore array remove */
  arrayRemove(...elements: unknown[]) {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }

  /** Firestore increment */
  increment(n: number) {
    return admin.firestore.FieldValue.increment(n);
  }

  /** Run a batch of writes (max 500 per batch) */
  batch() {
    return this._db.batch();
  }

  /** Run a transaction */
  runTransaction<T>(fn: (tx: admin.firestore.Transaction) => Promise<T>): Promise<T> {
    return this._db.runTransaction(fn);
  }
}
