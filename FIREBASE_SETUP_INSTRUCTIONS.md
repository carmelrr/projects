# הוראות הקמת פרויקט Firebase - אפליקציית אימונים (Coaching App)

## מה צריך ליצור

### שלב 1: יצירת פרויקט Firebase
1. לך ל-https://console.firebase.google.com
2. לחץ "Create a project" (או "Add project")
3. שם הפרויקט: `my-coaching-app`
4. **כבה** את Google Analytics (לא צריך כרגע)
5. לחץ "Create project"

### שלב 2: הפעלת Firestore Database
1. בתפריט הצדדי לחץ "Firestore Database"
2. לחץ "Create database"
3. בחר מיקום: `europe-west1` (בלגיה — הכי קרוב לישראל)
4. בחר "Start in **test mode**" (נשנה את הכללים אחר כך)
5. לחץ "Create"

### שלב 3: הפעלת Firebase Authentication
1. בתפריט הצדדי לחץ "Authentication"
2. לחץ "Get started"
3. בטאב "Sign-in method" הפעל:
   - **Email/Password** — לחץ Enable ושמור
   - (אופציונלי) **Google** — לחץ Enable, בחר support email, ושמור

### שלב 4: הגדרת Web App
1. בדף הראשי של הפרויקט (Project Overview), לחץ על הכפתור `</>` (Web)
2. שם האפליקציה: `coaching-web`
3. **סמן** את "Also set up Firebase Hosting" (אופציונלי)
4. לחץ "Register app"
5. **העתק את כל הקונפיגורציה שמופיעה** — זה ייראה ככה:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "my-coaching-app-xxxxx.firebaseapp.com",
  projectId: "my-coaching-app-xxxxx",
  storageBucket: "my-coaching-app-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```
6. **שמור את הערכים האלה** — נצטרך אותם

### שלב 5: יצירת Service Account Key (לשרת)
1. לחץ על גלגל השיניים ⚙️ ליד "Project Overview" → "Project settings"
2. לך לטאב "Service accounts"
3. לחץ "Generate new private key"
4. לחץ "Generate key" — זה יוריד קובץ JSON
5. **שמור את הקובץ הזה** — הוא הסיסמה של השרת לFirebase
6. **שנה את השם** שלו ל: `firebase-service-account.json`

### שלב 6: הגדרת Firestore Rules
1. לך ל-"Firestore Database" → טאב "Rules"
2. החלף את הכללים ב:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    // The actual security is enforced by the NestJS API (Admin SDK)
    // These rules are for direct client access if needed later
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. לחץ "Publish"

### שלב 7: הגדרת Firestore Indexes
1. לך ל-"Firestore Database" → טאב "Indexes"
2. צור את האינדקסים הבאים (Composite indexes):

| Collection | Fields | Order |
|-----------|--------|-------|
| `workoutInstances` | `clientId` ASC, `scheduledDate` ASC | — |
| `notifications` | `userId` ASC, `readAt` ASC, `createdAt` DESC | — |
| `messages` | `threadId` ASC, `createdAt` DESC | — |
| `metricEntries` | `clientId` ASC, `metricId` ASC, `capturedAt` DESC | — |
| `setLogs` | `clientId` ASC, `exerciseId` ASC, `createdAt` DESC | — |

**הערה**: חלק מהאינדקסים ייווצרו אוטומטית כשהשרת ינסה query ויקבל שגיאה עם לינק ישיר ליצירת האינדקס.

---

## מה להחזיר לי

אחרי שסיימת, אני צריך ממך:

1. **את ה-firebaseConfig** (מה שהעתקת בשלב 5)
2. **את תוכן קובץ ה-Service Account JSON** (משלב 6) — או את הנתיב שבו שמרת אותו
3. **את ה-Project ID** (מופיע ב-Project settings)

זה הכל! השאר אני אטפל בצד הקוד.
