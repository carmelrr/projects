# Anime Streamer (Personal Use)

אפליקציית סטרימינג אישית לפרקי One Piece — לשימוש פרטי בלבד, באישור מ-onepiece-nakama.com.
תומכת בטלפון/טאבלט אנדרואיד ובטלוויזיות Android TV עם ניווט D-pad.

## בנייה ראשונית

1. פתח את התיקייה ב-**Android Studio** (Hedgehog ומעלה). Studio יוריד את ה-Gradle Wrapper אוטומטית בסנכרון הראשון. אם אתה בונה מה-CLI: הרץ פעם אחת `gradle wrapper` כדי לייצר את ה-`gradlew` ו-`gradle-wrapper.jar` (נדרש Gradle 8.9 מותקן מקומית).
2. בנה ל-debug: `./gradlew :app:assembleDebug`. ה-APK נמצא ב-`app/build/outputs/apk/debug/`.
3. התקן על מכשיר: `adb install -r app/build/outputs/apk/debug/app-debug.apk`. עבור Android TV ב-side-load — אותה פקודה לאחר חיבור `adb connect <tv-ip>:5555`.

## עריכת קטלוג הפרקים

- קובץ ברירת מחדל מצורף: `app/src/main/assets/episodes.json`. החלף את הערכים `REPLACE_WITH_FILE_ID` / `REPLACE_WITH_LINK` בלינקים האמיתיים שקיבלת אישור עליהם.
- שדה `sourceType`: `"DRIVE"` ינוגן ב-ExoPlayer (תומך skip intro/outro ו-autoplay-next); `"MEGA"` יוצג ב-WebView; `"DIRECT"` ל-URL ישיר של mp4/m3u8.
- `defaults` מספקים זמני intro/credits שייושמו על כל פרק שאין לו ערכים מפורשים.
- לעדכון בלי build מחדש: ערוך את ה-JSON ב-GitHub (raw URL), והגדר את ה-URL בהגדרות (`SettingsStore.catalogUrl`). שיגור ראשוני: השאר ריק והאפליקציה תשתמש ב-bundled.

## סנכרון Firebase (אופציונלי)

ה-Plugin `google-services` מוערה ב-`app/build.gradle.kts`. כדי להפעיל סנכרון התקדמות בין מכשירים:

1. צור פרויקט Firebase ב-https://console.firebase.google.com, הוסף Android app עם applicationId `com.anime.streamer`.
2. הורד `google-services.json` והנח ב-`app/`.
3. בטל את הסימון של `// alias(libs.plugins.google.services)` ב-`app/build.gradle.kts`.
4. הוסף Google Sign-In flow (מומלץ device-pairing ל-TV). הקוד ב-`sync/FirestoreSyncManager.kt` כבר מטפל ב-pull/push debounced ברגע שיש משתמש מחובר.

Security rules ל-Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## אתיקה

- שימוש אישי בלבד, באישור הקריאייטור של onepiece-nakama.com.
- אין scraping, אין הורדה, אין הפצה של ה-APK.
- אין עקיפת הגנות DRM/Cookie/sign-in של ספקי האחסון.
