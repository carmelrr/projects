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
              // Production: service account as JSON string env var
          const serviceAccount = JSON.parse(serviceAccountJson);
              this._app = admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                        projectId,
              });
              this.logger.log('Firebase initialized from FIREBASE_SERVICE_ACCOUNT env var');
      } else if (serviceAccountPath) {
              // Local dev: service account as file path
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const serviceAccount = require(path.resolve(serviceAccountPath));
              this._app = admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                        projectId,
              });
              this.logger.log('Firebase initialized from file path');
      } else {
              // Fallback to application default credentials (for Cloud Run, etc.)
          this._app = admin.initializeApp({
                    projectId,
          });
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
}
